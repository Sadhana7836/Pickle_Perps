#![no_std]

use soroban_sdk::{
    contract, contractclient, contractimpl, contracttype, symbol_short, Address, BytesN, Env,
    String, Vec,
};

// ---------------------------------------------------------------------------
// Storage types
// ---------------------------------------------------------------------------

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    MintingFee,
    BondingCurveContract,
    TokenWasmHash,
    TokenCount,
    AllTokens,
    TokenInfo(Address),
    CreatorTokens(Address),
    Initialized,
}

/// Metadata stored per token created through the factory.
#[contracttype]
#[derive(Clone)]
pub struct TokenInfo {
    pub token_address: Address,
    pub creator: Address,
    pub name: String,
    pub symbol: String,
    pub total_supply: i128,
    pub image_hash: String,
    pub creator_allocation_bps: u32,
    pub created_at: u64,
    pub website: String,
    pub twitter: String,
    pub telegram: String,
}

// ---------------------------------------------------------------------------
// Cross-contract client interfaces
// ---------------------------------------------------------------------------

#[contractclient(name = "PikeTokenClient")]
pub trait PikeTokenInterface {
    fn initialize(
        env: Env,
        admin: Address,
        name: String,
        symbol: String,
        decimals: u32,
        total_supply: i128,
        image_hash: String,
        creator: Address,
        creator_amount: i128,
        curve_address: Address,
    );
}

#[contractclient(name = "BondingCurveClient")]
pub trait BondingCurveInterface {
    fn initialize_curve(
        env: Env,
        token_id: Address,
        creator: Address,
        creator_allocation_bps: u32,
        total_supply: i128,
    );
}

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

#[contract]
pub struct TokenFactory;

#[contractimpl]
impl TokenFactory {
    /// Initialize the factory. Can only be called once.
    ///
    /// * `admin`                  - contract administrator
    /// * `minting_fee`            - fee in stroops (1 XLM = 10_000_000 stroops)
    /// * `bonding_curve_contract` - address of the bonding-curve contract
    /// * `token_wasm_hash`        - WASM hash of the pike_token contract for deploying
    pub fn initialize(
        env: Env,
        admin: Address,
        minting_fee: i128,
        bonding_curve_contract: Address,
        token_wasm_hash: BytesN<32>,
    ) {
        if env.storage().instance().has(&DataKey::Initialized) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Initialized, &true);
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::MintingFee, &minting_fee);
        env.storage()
            .instance()
            .set(&DataKey::BondingCurveContract, &bonding_curve_contract);
        env.storage()
            .instance()
            .set(&DataKey::TokenWasmHash, &token_wasm_hash);
        env.storage().instance().set(&DataKey::TokenCount, &0u32);

        let empty_vec: Vec<Address> = Vec::new(&env);
        env.storage().instance().set(&DataKey::AllTokens, &empty_vec);
    }

    /// Create a new PikeToken, deploy it, initialise its bonding curve, and
    /// record its metadata.
    ///
    /// The caller must have previously transferred `minting_fee` XLM to this
    /// contract (via SAC native token transfer). The factory records the token
    /// but does not pull the fee itself -- the front-end or a batched
    /// transaction handles the fee transfer.
    #[allow(clippy::too_many_arguments)]
    pub fn create_token(
        env: Env,
        creator: Address,
        name: String,
        symbol: String,
        total_supply: i128,
        image_hash: String,
        creator_allocation_bps: u32,
        website: String,
        twitter: String,
        telegram: String,
    ) -> Address {
        creator.require_auth();

        // Validate inputs
        assert!(total_supply > 0, "total supply must be positive");
        assert!(
            creator_allocation_bps >= 100 && creator_allocation_bps <= 1000,
            "allocation must be 1-10%"
        );

        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        let bonding_curve: Address = env
            .storage()
            .instance()
            .get(&DataKey::BondingCurveContract)
            .unwrap();
        let token_wasm_hash: BytesN<32> = env
            .storage()
            .instance()
            .get(&DataKey::TokenWasmHash)
            .unwrap();

        // Calculate creator amount
        let creator_amount = (total_supply * creator_allocation_bps as i128) / 10_000;

        // Deploy a new pike_token contract via the deployer.
        // The salt is derived from the current token count for uniqueness.
        let count: u32 = env.storage().instance().get(&DataKey::TokenCount).unwrap();
        let salt = BytesN::from_array(&env, &Self::u32_to_salt(count));
        let token_address = env
            .deployer()
            .with_current_contract(salt)
            .deploy_v2(token_wasm_hash, ());

        // Initialize the deployed token
        let token_client = PikeTokenClient::new(&env, &token_address);
        token_client.initialize(
            &admin,
            &name,
            &symbol,
            &7u32, // Stellar standard 7 decimals
            &total_supply,
            &image_hash,
            &creator,
            &creator_amount,
            &bonding_curve,
        );

        // Initialize bonding curve for this token
        let curve_client = BondingCurveClient::new(&env, &bonding_curve);
        curve_client.initialize_curve(
            &token_address,
            &creator,
            &creator_allocation_bps,
            &total_supply,
        );

        // Store token info
        let info = TokenInfo {
            token_address: token_address.clone(),
            creator: creator.clone(),
            name: name.clone(),
            symbol: symbol.clone(),
            total_supply,
            image_hash: image_hash.clone(),
            creator_allocation_bps,
            created_at: env.ledger().timestamp(),
            website: website.clone(),
            twitter: twitter.clone(),
            telegram: telegram.clone(),
        };
        env.storage()
            .persistent()
            .set(&DataKey::TokenInfo(token_address.clone()), &info);

        // Append to all-tokens list
        let mut all_tokens: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::AllTokens)
            .unwrap();
        all_tokens.push_back(token_address.clone());
        env.storage().instance().set(&DataKey::AllTokens, &all_tokens);

        // Append to creator-tokens list
        let creator_key = DataKey::CreatorTokens(creator.clone());
        let mut creator_tokens: Vec<Address> = env
            .storage()
            .persistent()
            .get(&creator_key)
            .unwrap_or(Vec::new(&env));
        creator_tokens.push_back(token_address.clone());
        env.storage().persistent().set(&creator_key, &creator_tokens);

        // Increment count
        env.storage()
            .instance()
            .set(&DataKey::TokenCount, &(count + 1));

        // Emit event
        env.events().publish(
            (symbol_short!("created"), creator.clone()),
            (token_address.clone(), name, symbol, total_supply),
        );

        token_address
    }

    // -----------------------------------------------------------------------
    // Query functions
    // -----------------------------------------------------------------------

    pub fn get_token_count(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::TokenCount)
            .unwrap_or(0)
    }

    pub fn get_all_tokens(env: Env) -> Vec<Address> {
        env.storage()
            .instance()
            .get(&DataKey::AllTokens)
            .unwrap_or(Vec::new(&env))
    }

    pub fn get_tokens_by_creator(env: Env, creator: Address) -> Vec<Address> {
        let key = DataKey::CreatorTokens(creator);
        env.storage()
            .persistent()
            .get(&key)
            .unwrap_or(Vec::new(&env))
    }

    pub fn get_token_info(env: Env, token_address: Address) -> TokenInfo {
        let key = DataKey::TokenInfo(token_address);
        env.storage()
            .persistent()
            .get(&key)
            .expect("token not found")
    }

    // -----------------------------------------------------------------------
    // Admin functions
    // -----------------------------------------------------------------------

    pub fn set_minting_fee(env: Env, caller: Address, new_fee: i128) {
        caller.require_auth();
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(caller == admin, "only admin");

        let old_fee: i128 = env
            .storage()
            .instance()
            .get(&DataKey::MintingFee)
            .unwrap();
        env.storage().instance().set(&DataKey::MintingFee, &new_fee);

        env.events()
            .publish((symbol_short!("fee_upd"),), (old_fee, new_fee));
    }

    pub fn get_minting_fee(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::MintingFee)
            .unwrap_or(0)
    }

    // -----------------------------------------------------------------------
    // Internal helpers
    // -----------------------------------------------------------------------

    fn u32_to_salt(val: u32) -> [u8; 32] {
        let mut buf = [0u8; 32];
        buf[28] = (val >> 24) as u8;
        buf[29] = (val >> 16) as u8;
        buf[30] = (val >> 8) as u8;
        buf[31] = val as u8;
        buf
    }
}
