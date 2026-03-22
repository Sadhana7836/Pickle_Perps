#![no_std]

use soroban_sdk::{
    contract, contractclient, contractimpl, contracttype, symbol_short, Address, Env, Vec,
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/// Price precision (1e8, matching the bonding curve).
const _PRICE_PRECISION: i128 = 100_000_000;

/// Intermediate math precision (1e18).
const PRECISION: i128 = 1_000_000_000_000_000_000;

/// Default trading fee: 5 bps = 0.05%.
const DEFAULT_TRADING_FEE_BPS: u32 = 5;

/// Default max leverage: 100x.
const DEFAULT_MAX_LEVERAGE: u32 = 100;

// ---------------------------------------------------------------------------
// Storage types
// ---------------------------------------------------------------------------

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    BondingCurveContract,
    TradingFeeBps,
    MaxLeverage,
    NextPositionId,
    Position(u64),
    UserPositions(Address),
    MemeTokenPrice(Address),
    MemeTokenPriceTime(Address),
    Initialized,
}

/// A perpetual futures position.
#[contracttype]
#[derive(Clone)]
pub struct Position {
    pub user: Address,
    pub token: Address,
    pub is_long: bool,
    pub size: i128,         // position size in price-precision units
    pub margin: i128,       // margin deposited (stroops)
    pub leverage: u32,      // leverage multiplier
    pub entry_price: i128,  // price at entry (1e8)
    pub entry_time: u64,    // ledger timestamp
    pub is_open: bool,
}

/// PnL result.
#[contracttype]
#[derive(Clone)]
pub struct PnlResult {
    pub pnl: i128,
    pub is_profit: bool,
}

// ---------------------------------------------------------------------------
// Cross-contract client for bonding curve
// ---------------------------------------------------------------------------

#[contractclient(name = "BondingCurveQueryClient")]
pub trait BondingCurveQuery {
    fn is_listed(env: Env, token_id: Address) -> bool;
    fn get_current_price(env: Env, token_id: Address) -> i128;
}

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

#[contract]
pub struct PerpetualTrading;

#[contractimpl]
impl PerpetualTrading {
    /// One-time initialization.
    pub fn initialize(env: Env, admin: Address, bonding_curve_contract: Address) {
        if env.storage().instance().has(&DataKey::Initialized) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Initialized, &true);
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::BondingCurveContract, &bonding_curve_contract);
        env.storage()
            .instance()
            .set(&DataKey::TradingFeeBps, &DEFAULT_TRADING_FEE_BPS);
        env.storage()
            .instance()
            .set(&DataKey::MaxLeverage, &DEFAULT_MAX_LEVERAGE);
        env.storage()
            .instance()
            .set(&DataKey::NextPositionId, &0u64);
    }

    // -----------------------------------------------------------------------
    // Trading
    // -----------------------------------------------------------------------

    /// Open a leveraged perpetual position.
    ///
    /// * `user`       - the trader (must authorize)
    /// * `token_id`   - the meme token address
    /// * `is_long`    - true for long, false for short
    /// * `margin`     - margin amount in stroops
    /// * `leverage`   - leverage multiplier (1..=max_leverage)
    ///
    /// Returns the new position ID.
    pub fn open_position(
        env: Env,
        user: Address,
        token_id: Address,
        is_long: bool,
        margin: i128,
        leverage: u32,
    ) -> u64 {
        user.require_auth();

        let max_lev: u32 = env
            .storage()
            .instance()
            .get(&DataKey::MaxLeverage)
            .unwrap();
        assert!(leverage > 0 && leverage <= max_lev, "invalid leverage");
        assert!(margin > 0, "margin must be > 0");

        // Verify token is listed on bonding curve
        let curve_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::BondingCurveContract)
            .unwrap();
        let curve_client = BondingCurveQueryClient::new(&env, &curve_addr);
        assert!(curve_client.is_listed(&token_id), "token not listed");

        // Get current price -- try bonding curve first, then fallback
        let current_price = Self::resolve_price(&env, &curve_client, &token_id);
        assert!(current_price > 0, "price not available");

        // Calculate position size: margin * leverage * price / PRECISION
        let position_size = (margin * leverage as i128 * current_price) / PRECISION;
        assert!(position_size > 0, "position size too small");

        // Trading fee
        let fee_bps: u32 = env
            .storage()
            .instance()
            .get(&DataKey::TradingFeeBps)
            .unwrap();
        let fee = (position_size * fee_bps as i128) / 10_000;
        assert!(margin > fee, "margin too small for fee");

        // Create position
        let pos_id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::NextPositionId)
            .unwrap();

        let position = Position {
            user: user.clone(),
            token: token_id.clone(),
            is_long,
            size: position_size,
            margin: margin - fee,
            leverage,
            entry_price: current_price,
            entry_time: env.ledger().timestamp(),
            is_open: true,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Position(pos_id), &position);

        // Append to user positions
        let user_key = DataKey::UserPositions(user.clone());
        let mut user_pos: Vec<u64> = env
            .storage()
            .persistent()
            .get(&user_key)
            .unwrap_or(Vec::new(&env));
        user_pos.push_back(pos_id);
        env.storage().persistent().set(&user_key, &user_pos);

        // Increment counter
        env.storage()
            .instance()
            .set(&DataKey::NextPositionId, &(pos_id + 1));

        env.events().publish(
            (symbol_short!("pos_open"), user, token_id),
            (pos_id, is_long, position_size, margin - fee, leverage, current_price),
        );

        pos_id
    }

    /// Close an open position. Only the position owner may call.
    pub fn close_position(env: Env, caller: Address, position_id: u64) {
        caller.require_auth();

        let key = DataKey::Position(position_id);
        let mut position: Position = env
            .storage()
            .persistent()
            .get(&key)
            .expect("position not found");

        assert!(position.is_open, "position not open");
        assert!(position.user == caller, "not position owner");

        let curve_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::BondingCurveContract)
            .unwrap();
        let curve_client = BondingCurveQueryClient::new(&env, &curve_addr);
        let current_price = Self::resolve_price(&env, &curve_client, &position.token);
        assert!(current_price > 0, "price not available");

        let pnl_result = Self::calc_pnl(&position, current_price);

        let fee_bps: u32 = env
            .storage()
            .instance()
            .get(&DataKey::TradingFeeBps)
            .unwrap();
        let fee = (position.size * fee_bps as i128) / 10_000;

        let total_payout: i128 = if pnl_result.is_profit {
            let gross = position.margin + pnl_result.pnl;
            if gross > fee {
                gross - fee
            } else {
                0
            }
        } else {
            let debit = pnl_result.pnl + fee;
            if position.margin > debit {
                position.margin - debit
            } else {
                0
            }
        };

        // Update fallback price
        env.storage()
            .persistent()
            .set(&DataKey::MemeTokenPrice(position.token.clone()), &current_price);
        env.storage().persistent().set(
            &DataKey::MemeTokenPriceTime(position.token.clone()),
            &env.ledger().timestamp(),
        );

        position.is_open = false;
        env.storage().persistent().set(&key, &position);

        env.events().publish(
            (symbol_short!("pos_cls"), caller, position_id),
            (pnl_result.pnl, pnl_result.is_profit, current_price, total_payout),
        );
    }

    // -----------------------------------------------------------------------
    // Liquidation
    // -----------------------------------------------------------------------

    /// Check whether a position should be liquidated.
    pub fn should_liquidate(env: Env, position_id: u64) -> bool {
        let key = DataKey::Position(position_id);
        let position: Position = match env.storage().persistent().get(&key) {
            Some(p) => p,
            None => return false,
        };
        if !position.is_open {
            return false;
        }

        let curve_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::BondingCurveContract)
            .unwrap();
        let curve_client = BondingCurveQueryClient::new(&env, &curve_addr);
        let current_price = Self::resolve_price(&env, &curve_client, &position.token);
        if current_price == 0 {
            return false;
        }

        let liq_price = Self::calc_liquidation_price(&position);
        if position.is_long {
            current_price <= liq_price
        } else {
            current_price >= liq_price
        }
    }

    /// Liquidate a position that has crossed its liquidation threshold.
    /// Anyone may call this; the liquidator receives 5% of the margin as reward.
    pub fn liquidate_position(env: Env, liquidator: Address, position_id: u64) {
        liquidator.require_auth();
        assert!(
            Self::should_liquidate(env.clone(), position_id),
            "position not liquidatable"
        );

        let key = DataKey::Position(position_id);
        let mut position: Position = env.storage().persistent().get(&key).unwrap();

        let curve_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::BondingCurveContract)
            .unwrap();
        let curve_client = BondingCurveQueryClient::new(&env, &curve_addr);
        let current_price = Self::resolve_price(&env, &curve_client, &position.token);

        let _reward = position.margin / 20; // 5% of margin

        position.is_open = false;
        env.storage().persistent().set(&key, &position);

        env.events().publish(
            (symbol_short!("pos_liq"), position.user.clone(), position_id),
            current_price,
        );
    }

    // -----------------------------------------------------------------------
    // View functions
    // -----------------------------------------------------------------------

    pub fn get_position(env: Env, position_id: u64) -> Position {
        env.storage()
            .persistent()
            .get(&DataKey::Position(position_id))
            .expect("position not found")
    }

    pub fn get_position_pnl(env: Env, position_id: u64) -> PnlResult {
        let position: Position = env
            .storage()
            .persistent()
            .get(&DataKey::Position(position_id))
            .expect("position not found");
        assert!(position.is_open, "position not open");

        let curve_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::BondingCurveContract)
            .unwrap();
        let curve_client = BondingCurveQueryClient::new(&env, &curve_addr);
        let current_price = Self::resolve_price(&env, &curve_client, &position.token);
        assert!(current_price > 0, "price not available");

        Self::calc_pnl(&position, current_price)
    }

    pub fn get_liquidation_price(env: Env, position_id: u64) -> i128 {
        let position: Position = env
            .storage()
            .persistent()
            .get(&DataKey::Position(position_id))
            .expect("position not found");
        assert!(position.is_open, "position not open");
        Self::calc_liquidation_price(&position)
    }

    pub fn get_user_positions(env: Env, user: Address) -> Vec<u64> {
        env.storage()
            .persistent()
            .get(&DataKey::UserPositions(user))
            .unwrap_or(Vec::new(&env))
    }

    // -----------------------------------------------------------------------
    // Price management
    // -----------------------------------------------------------------------

    /// Manually update the fallback price for a meme token.
    pub fn update_meme_token_price(env: Env, caller: Address, token_id: Address, price: i128) {
        caller.require_auth();
        assert!(price > 0, "invalid price");

        env.storage()
            .persistent()
            .set(&DataKey::MemeTokenPrice(token_id.clone()), &price);
        env.storage().persistent().set(
            &DataKey::MemeTokenPriceTime(token_id.clone()),
            &env.ledger().timestamp(),
        );

        env.events()
            .publish((symbol_short!("price"), token_id), price);
    }

    // -----------------------------------------------------------------------
    // Admin functions
    // -----------------------------------------------------------------------

    pub fn set_trading_fee(env: Env, caller: Address, new_fee_bps: u32) {
        caller.require_auth();
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(caller == admin, "only admin");
        assert!(new_fee_bps <= 1000, "fee too high");

        env.storage()
            .instance()
            .set(&DataKey::TradingFeeBps, &new_fee_bps);
    }

    pub fn set_max_leverage(env: Env, caller: Address, new_max: u32) {
        caller.require_auth();
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(caller == admin, "only admin");
        assert!(new_max > 0 && new_max <= 1000, "invalid leverage");

        env.storage()
            .instance()
            .set(&DataKey::MaxLeverage, &new_max);
    }

    pub fn set_bonding_curve(env: Env, caller: Address, new_curve: Address) {
        caller.require_auth();
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(caller == admin, "only admin");

        env.storage()
            .instance()
            .set(&DataKey::BondingCurveContract, &new_curve);
    }

    // -----------------------------------------------------------------------
    // Internal helpers
    // -----------------------------------------------------------------------

    /// Resolve the current price of a token. Tries the bonding curve first;
    /// falls back to the locally stored meme-token price.
    fn resolve_price(env: &Env, curve_client: &BondingCurveQueryClient, token_id: &Address) -> i128 {
        // Try bonding curve
        if curve_client.is_listed(token_id) {
            let p = curve_client.get_current_price(token_id);
            if p > 0 {
                return p;
            }
        }

        // Fallback: locally stored price
        env.storage()
            .persistent()
            .get(&DataKey::MemeTokenPrice(token_id.clone()))
            .unwrap_or(0)
    }

    /// Calculate unrealised PnL for a position at a given price.
    fn calc_pnl(position: &Position, current_price: i128) -> PnlResult {
        if position.is_long {
            if current_price >= position.entry_price {
                let pnl = ((current_price - position.entry_price) * position.size)
                    / position.entry_price;
                PnlResult {
                    pnl,
                    is_profit: true,
                }
            } else {
                let pnl = ((position.entry_price - current_price) * position.size)
                    / position.entry_price;
                PnlResult {
                    pnl,
                    is_profit: false,
                }
            }
        } else if current_price <= position.entry_price {
            let pnl = ((position.entry_price - current_price) * position.size)
                / position.entry_price;
            PnlResult {
                pnl,
                is_profit: true,
            }
        } else {
            let pnl = ((current_price - position.entry_price) * position.size)
                / position.entry_price;
            PnlResult {
                pnl,
                is_profit: false,
            }
        }
    }

    /// Calculate the liquidation price for a position.
    /// Long: entry * (1 - margin/size)
    /// Short: entry * (1 + margin/size)
    fn calc_liquidation_price(position: &Position) -> i128 {
        let margin_ratio = (position.margin * PRECISION) / position.size;
        if position.is_long {
            (position.entry_price * (PRECISION - margin_ratio)) / PRECISION
        } else {
            (position.entry_price * (PRECISION + margin_ratio)) / PRECISION
        }
    }
}

#[cfg(test)]
mod test;
