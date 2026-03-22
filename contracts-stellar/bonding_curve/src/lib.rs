#![no_std]

use soroban_sdk::{
    contract, contractclient, contractimpl, contracttype, symbol_short, Address, Env, Vec,
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/// Price precision -- matches the Solidity 1e8 convention.
const PRICE_PRECISION: i128 = 100_000_000; // 1e8

/// Precision for intermediate math (replaces Solidity 1e18).
const PRECISION: i128 = 1_000_000_000_000_000_000; // 1e18

/// Default trading fee in basis points (50 = 0.5%).
const DEFAULT_TRADING_FEE_BPS: u32 = 50;

/// Default initial price: $0.00001 = 1e3 in 1e8 precision.
const DEFAULT_INITIAL_PRICE: i128 = 1_000; // 1e3

/// Default curve coefficient -- price doubles when 100% sold.
const DEFAULT_CURVE_COEFFICIENT: i128 = 10_000; // 1e4

// ---------------------------------------------------------------------------
// Storage types
// ---------------------------------------------------------------------------

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Factory,
    NativeToken,
    TradingFeeBps,
    AccumulatedFees,
    ListedTokens,
    CurveConfig(Address),
    Initialized,
}

#[contracttype]
#[derive(Clone)]
pub struct CurveConfig {
    pub token: Address,
    pub creator: Address,
    pub creator_allocation_bps: u32,
    pub initial_price: i128,
    pub curve_coefficient: i128,
    pub curve_supply: i128,
    pub sold_from_curve: i128,
    pub reserve_balance: i128,
    pub created_at: u64,
    pub is_active: bool,
}

/// Lightweight struct returned by `get_curve_progress`.
#[contracttype]
#[derive(Clone)]
pub struct CurveProgress {
    pub sold: i128,
    pub total: i128,
    pub progress_bps: u32,
}

/// Quote result returned by `get_buy_quote` / `get_sell_quote`.
#[contracttype]
#[derive(Clone)]
pub struct Quote {
    pub amount: i128,
    pub avg_price: i128,
    pub fee: i128,
}

// ---------------------------------------------------------------------------
// Cross-contract client for pike_token (SEP-41 compatible)
// ---------------------------------------------------------------------------

#[contractclient(name = "TokenClient")]
pub trait TokenInterface {
    fn transfer(env: Env, from: Address, to: Address, amount: i128);
    fn transfer_from(env: Env, spender: Address, from: Address, to: Address, amount: i128);
    fn balance(env: Env, id: Address) -> i128;
}

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

#[contract]
pub struct BondingCurve;

#[contractimpl]
impl BondingCurve {
    /// One-time initialization.
    ///
    /// * `admin`   - contract administrator
    /// * `factory` - address of the token-factory (only it may call `initialize_curve`)
    pub fn initialize(env: Env, admin: Address, factory: Address, native_token: Address) {
        if env.storage().instance().has(&DataKey::Initialized) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Initialized, &true);
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Factory, &factory);
        env.storage()
            .instance()
            .set(&DataKey::NativeToken, &native_token);
        env.storage()
            .instance()
            .set(&DataKey::TradingFeeBps, &DEFAULT_TRADING_FEE_BPS);
        env.storage()
            .instance()
            .set(&DataKey::AccumulatedFees, &0i128);

        let empty: Vec<Address> = Vec::new(&env);
        env.storage().instance().set(&DataKey::ListedTokens, &empty);
    }

    /// Initialize a bonding curve for a newly created token.
    /// Only callable by the factory contract.
    pub fn initialize_curve(
        env: Env,
        token_id: Address,
        creator: Address,
        creator_allocation_bps: u32,
        total_supply: i128,
    ) {
        let factory: Address = env.storage().instance().get(&DataKey::Factory).unwrap();
        factory.require_auth();

        let key = DataKey::CurveConfig(token_id.clone());
        if env.storage().persistent().has(&key) {
            panic!("curve already exists");
        }

        assert!(
            creator_allocation_bps >= 100 && creator_allocation_bps <= 1000,
            "allocation must be 1-10%"
        );

        let curve_supply =
            (total_supply * (10_000 - creator_allocation_bps as i128)) / 10_000;

        let config = CurveConfig {
            token: token_id.clone(),
            creator: creator.clone(),
            creator_allocation_bps,
            initial_price: DEFAULT_INITIAL_PRICE,
            curve_coefficient: DEFAULT_CURVE_COEFFICIENT,
            curve_supply,
            sold_from_curve: 0,
            reserve_balance: 0,
            created_at: env.ledger().timestamp(),
            is_active: true,
        };

        env.storage().persistent().set(&key, &config);

        // Append to listed tokens
        let mut listed: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::ListedTokens)
            .unwrap();
        listed.push_back(token_id.clone());
        env.storage().instance().set(&DataKey::ListedTokens, &listed);

        env.events().publish(
            (symbol_short!("curve_in"), token_id, creator),
            (creator_allocation_bps, curve_supply, DEFAULT_INITIAL_PRICE),
        );
    }

    // -----------------------------------------------------------------------
    // Price queries
    // -----------------------------------------------------------------------

    /// Current spot price for a token on the curve (scaled by 1e8).
    pub fn get_current_price(env: Env, token_id: Address) -> i128 {
        let config = Self::load_config(&env, &token_id);
        Self::calc_price(&config)
    }

    /// How many tokens would be received for `xlm_amount` stroops?
    pub fn get_buy_quote(env: Env, token_id: Address, xlm_amount: i128) -> Quote {
        let config = Self::load_config(&env, &token_id);
        let fee_bps: u32 = env
            .storage()
            .instance()
            .get(&DataKey::TradingFeeBps)
            .unwrap();

        let fee = (xlm_amount * fee_bps as i128) / 10_000;
        let xlm_after_fee = xlm_amount - fee;

        let current_price = Self::calc_price(&config);
        if current_price == 0 {
            return Quote {
                amount: 0,
                avg_price: 0,
                fee,
            };
        }

        let mut estimated_tokens = (xlm_after_fee * PRICE_PRECISION) / current_price;
        let available = config.curve_supply - config.sold_from_curve;
        if estimated_tokens > available {
            estimated_tokens = available;
        }

        let avg_price = if estimated_tokens > 0 {
            (xlm_after_fee * PRICE_PRECISION) / estimated_tokens
        } else {
            0
        };

        Quote {
            amount: estimated_tokens,
            avg_price,
            fee,
        }
    }

    /// How much XLM (stroops) would be received for selling `token_amount`?
    pub fn get_sell_quote(env: Env, token_id: Address, token_amount: i128) -> Quote {
        let config = Self::load_config(&env, &token_id);
        assert!(
            token_amount <= config.sold_from_curve,
            "insufficient liquidity"
        );

        let fee_bps: u32 = env
            .storage()
            .instance()
            .get(&DataKey::TradingFeeBps)
            .unwrap();

        let s1 = config.sold_from_curve;
        let s2 = s1 - token_amount;
        let a = config.initial_price;
        let b = config.curve_coefficient;
        let cap_s = config.curve_supply;

        if cap_s == 0 {
            return Quote {
                amount: 0,
                avg_price: 0,
                fee: 0,
            };
        }

        // Integral: a*(s1-s2) + b*(s1+s2)*(s1-s2) / (2*S)   all in PRICE_PRECISION
        let mut xlm_before_fee = (a * token_amount) / PRICE_PRECISION;
        xlm_before_fee += (b * (s1 + s2) * token_amount) / (2 * cap_s * PRICE_PRECISION);

        // Scale back to stroops
        xlm_before_fee = (xlm_before_fee * PRECISION) / PRICE_PRECISION;

        if xlm_before_fee > config.reserve_balance {
            xlm_before_fee = config.reserve_balance;
        }

        let fee = (xlm_before_fee * fee_bps as i128) / 10_000;
        let xlm_out = xlm_before_fee - fee;

        let avg_price = if token_amount > 0 {
            (xlm_before_fee * PRICE_PRECISION) / token_amount
        } else {
            0
        };

        Quote {
            amount: xlm_out,
            avg_price,
            fee,
        }
    }

    // -----------------------------------------------------------------------
    // Trading
    // -----------------------------------------------------------------------

    /// Buy tokens from the bonding curve by sending XLM.
    pub fn buy(
        env: Env,
        buyer: Address,
        token_id: Address,
        xlm_amount: i128,
        min_tokens_out: i128,
    ) -> i128 {
        buyer.require_auth();
        assert!(xlm_amount > 0, "must send XLM");

        // Transfer XLM from buyer to this contract
        let native_addr: Address = env.storage().instance().get(&DataKey::NativeToken).unwrap();
        let xlm_client = TokenClient::new(&env, &native_addr);
        xlm_client.transfer(&buyer, &env.current_contract_address(), &xlm_amount);

        let key = DataKey::CurveConfig(token_id.clone());
        let mut config: CurveConfig = env
            .storage()
            .persistent()
            .get(&key)
            .expect("token not listed");
        assert!(config.is_active, "curve not active");

        let fee_bps: u32 = env
            .storage()
            .instance()
            .get(&DataKey::TradingFeeBps)
            .unwrap();

        let fee = (xlm_amount * fee_bps as i128) / 10_000;
        let xlm_after_fee = xlm_amount - fee;

        let current_price = Self::calc_price(&config);
        assert!(current_price > 0, "price is zero");

        let mut tokens = (xlm_after_fee * PRICE_PRECISION) / current_price;
        let available = config.curve_supply - config.sold_from_curve;
        if tokens > available {
            tokens = available;
        }

        assert!(tokens >= min_tokens_out, "slippage exceeded");
        assert!(tokens > 0, "insufficient output");

        // Update state
        config.sold_from_curve += tokens;
        config.reserve_balance += xlm_after_fee;
        env.storage().persistent().set(&key, &config);

        let mut acc_fees: i128 = env
            .storage()
            .instance()
            .get(&DataKey::AccumulatedFees)
            .unwrap();
        acc_fees += fee;
        env.storage()
            .instance()
            .set(&DataKey::AccumulatedFees, &acc_fees);

        // Transfer tokens from this contract to the buyer
        let token_client = TokenClient::new(&env, &token_id);
        token_client.transfer(&env.current_contract_address(), &buyer, &tokens);

        let new_price = Self::calc_price(&config);

        env.events().publish(
            (symbol_short!("bought"), token_id, buyer),
            (xlm_amount, tokens, new_price, fee),
        );

        tokens
    }

    /// Sell tokens back to the bonding curve, receiving XLM.
    ///
    /// * `seller`       - the seller (must authorize)
    /// * `token_id`     - the pike_token address
    /// * `token_amount` - amount of tokens to sell
    /// * `min_xlm_out`  - slippage protection
    pub fn sell(
        env: Env,
        seller: Address,
        token_id: Address,
        token_amount: i128,
        min_xlm_out: i128,
    ) -> i128 {
        seller.require_auth();
        assert!(token_amount > 0, "must sell tokens");

        let key = DataKey::CurveConfig(token_id.clone());
        let mut config: CurveConfig = env
            .storage()
            .persistent()
            .get(&key)
            .expect("token not listed");
        assert!(config.is_active, "curve not active");
        assert!(
            token_amount <= config.sold_from_curve,
            "exceeds sold supply"
        );

        let fee_bps: u32 = env
            .storage()
            .instance()
            .get(&DataKey::TradingFeeBps)
            .unwrap();

        let s1 = config.sold_from_curve;
        let s2 = s1 - token_amount;
        let a = config.initial_price;
        let b = config.curve_coefficient;
        let cap_s = config.curve_supply;

        let mut xlm_before_fee = if cap_s == 0 {
            0i128
        } else {
            let mut val = (a * token_amount) / PRICE_PRECISION;
            val += (b * (s1 + s2) * token_amount) / (2 * cap_s * PRICE_PRECISION);
            (val * PRECISION) / PRICE_PRECISION
        };

        if xlm_before_fee > config.reserve_balance {
            xlm_before_fee = config.reserve_balance;
        }

        let fee = (xlm_before_fee * fee_bps as i128) / 10_000;
        let xlm_out = xlm_before_fee - fee;

        assert!(xlm_out >= min_xlm_out, "slippage exceeded");
        assert!(xlm_out > 0, "insufficient output");

        // Transfer tokens from seller to this contract
        let token_client = TokenClient::new(&env, &token_id);
        token_client.transfer(&seller, &env.current_contract_address(), &token_amount);

        // Transfer XLM from contract to seller
        let native_addr: Address = env.storage().instance().get(&DataKey::NativeToken).unwrap();
        let xlm_client = TokenClient::new(&env, &native_addr);
        xlm_client.transfer(&env.current_contract_address(), &seller, &xlm_out);

        // Update state
        config.sold_from_curve -= token_amount;
        config.reserve_balance -= xlm_before_fee;
        env.storage().persistent().set(&key, &config);

        let mut acc_fees: i128 = env
            .storage()
            .instance()
            .get(&DataKey::AccumulatedFees)
            .unwrap();
        acc_fees += fee;
        env.storage()
            .instance()
            .set(&DataKey::AccumulatedFees, &acc_fees);

        let new_price = Self::calc_price(&config);

        env.events().publish(
            (symbol_short!("sold"), token_id, seller),
            (token_amount, xlm_out, new_price, fee),
        );

        xlm_out
    }

    // -----------------------------------------------------------------------
    // View functions
    // -----------------------------------------------------------------------

    pub fn is_listed(env: Env, token_id: Address) -> bool {
        let key = DataKey::CurveConfig(token_id);
        env.storage()
            .persistent()
            .get::<DataKey, CurveConfig>(&key)
            .map(|c| c.is_active)
            .unwrap_or(false)
    }

    pub fn get_curve_config(env: Env, token_id: Address) -> CurveConfig {
        Self::load_config(&env, &token_id)
    }

    pub fn get_curve_progress(env: Env, token_id: Address) -> CurveProgress {
        let config = Self::load_config(&env, &token_id);
        let progress_bps = if config.curve_supply == 0 {
            0u32
        } else {
            ((config.sold_from_curve * 10_000) / config.curve_supply) as u32
        };
        CurveProgress {
            sold: config.sold_from_curve,
            total: config.curve_supply,
            progress_bps,
        }
    }

    pub fn get_all_listed_tokens(env: Env) -> Vec<Address> {
        env.storage()
            .instance()
            .get(&DataKey::ListedTokens)
            .unwrap_or(Vec::new(&env))
    }

    pub fn get_listed_token_count(env: Env) -> u32 {
        let listed: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::ListedTokens)
            .unwrap_or(Vec::new(&env));
        listed.len()
    }

    // -----------------------------------------------------------------------
    // Admin functions
    // -----------------------------------------------------------------------

    pub fn set_trading_fee(env: Env, caller: Address, new_fee_bps: u32) {
        caller.require_auth();
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(caller == admin, "only admin");
        assert!(new_fee_bps <= 500, "fee too high");

        env.storage()
            .instance()
            .set(&DataKey::TradingFeeBps, &new_fee_bps);

        env.events()
            .publish((symbol_short!("fee_upd"),), new_fee_bps);
    }

    pub fn withdraw_fees(env: Env, caller: Address) -> i128 {
        caller.require_auth();
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(caller == admin, "only admin");

        let fees: i128 = env.storage().instance().get(&DataKey::AccumulatedFees).unwrap();
        assert!(fees > 0, "no fees");

        let native_addr: Address = env.storage().instance().get(&DataKey::NativeToken).unwrap();
        let xlm_client = TokenClient::new(&env, &native_addr);
        xlm_client.transfer(&env.current_contract_address(), &admin, &fees);

        env.storage().instance().set(&DataKey::AccumulatedFees, &0i128);
        fees
    }

    pub fn set_factory(env: Env, caller: Address, new_factory: Address) {
        caller.require_auth();
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(caller == admin, "only admin");

        env.storage()
            .instance()
            .set(&DataKey::Factory, &new_factory);
    }

    // -----------------------------------------------------------------------
    // Internal helpers
    // -----------------------------------------------------------------------

    fn load_config(env: &Env, token_id: &Address) -> CurveConfig {
        let key = DataKey::CurveConfig(token_id.clone());
        env.storage()
            .persistent()
            .get(&key)
            .expect("token not listed")
    }

    /// Linear bonding curve: price = initial_price + (coefficient * sold / total)
    fn calc_price(config: &CurveConfig) -> i128 {
        if config.curve_supply == 0 {
            return config.initial_price;
        }
        config.initial_price
            + (config.curve_coefficient * config.sold_from_curve) / config.curve_supply
    }
}

#[cfg(test)]
mod test;
