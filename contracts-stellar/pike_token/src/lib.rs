#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, token, Address, Env, String,
};

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Name,
    Symbol,
    Decimals,
    TotalSupply,
    ImageHash,
    Creator,
    Factory,
    Website,
    Twitter,
    Telegram,
    Balance(Address),
    Allowance(AllowanceKey),
    Initialized,
}

#[contracttype]
#[derive(Clone)]
pub struct AllowanceKey {
    pub from: Address,
    pub spender: Address,
}

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

#[contract]
pub struct PikeToken;

#[contractimpl]
impl PikeToken {
    /// Initialize the token contract. Can only be called once.
    ///
    /// * `admin`          - administrator address
    /// * `name`           - token name
    /// * `symbol`         - token symbol
    /// * `decimals`       - token decimals (typically 7 for Stellar)
    /// * `total_supply`   - total supply to mint
    /// * `image_hash`     - IPFS CID of the token image
    /// * `creator`        - address of the token creator
    /// * `creator_amount` - amount minted to the creator
    /// * `curve_address`  - bonding curve contract that receives the remainder
    pub fn initialize(
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
    ) {
        if env.storage().instance().has(&DataKey::Initialized) {
            panic!("already initialized");
        }

        assert!(total_supply > 0, "total supply must be positive");
        assert!(creator_amount >= 0, "creator amount must be non-negative");
        assert!(creator_amount <= total_supply, "creator amount exceeds supply");

        env.storage().instance().set(&DataKey::Initialized, &true);
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Name, &name);
        env.storage().instance().set(&DataKey::Symbol, &symbol);
        env.storage().instance().set(&DataKey::Decimals, &decimals);
        env.storage().instance().set(&DataKey::TotalSupply, &total_supply);
        env.storage().instance().set(&DataKey::ImageHash, &image_hash);
        env.storage().instance().set(&DataKey::Creator, &creator);
        env.storage()
            .instance()
            .set(&DataKey::Factory, &env.current_contract_address());

        // Empty strings for social links
        let empty = String::from_str(&env, "");
        env.storage().instance().set(&DataKey::Website, &empty);
        env.storage().instance().set(&DataKey::Twitter, &empty);
        env.storage().instance().set(&DataKey::Telegram, &empty);

        // Mint creator allocation
        if creator_amount > 0 {
            Self::set_balance(&env, &creator, creator_amount);
            env.events().publish(
                (symbol_short!("transfer"), env.current_contract_address(), creator.clone()),
                creator_amount,
            );
        }

        // Mint remainder to bonding curve
        let curve_amount = total_supply - creator_amount;
        if curve_amount > 0 {
            Self::set_balance(&env, &curve_address, curve_amount);
            env.events().publish(
                (symbol_short!("transfer"), env.current_contract_address(), curve_address.clone()),
                curve_amount,
            );
        }
    }

    // -----------------------------------------------------------------------
    // SEP-41 Token Interface
    // -----------------------------------------------------------------------

    /// Return the allowance granted by `from` to `spender`.
    pub fn allowance(env: Env, from: Address, spender: Address) -> i128 {
        Self::get_allowance(&env, &from, &spender)
    }

    /// Approve `spender` to spend up to `amount` on behalf of the caller.
    pub fn approve(env: Env, from: Address, spender: Address, amount: i128, expiration_ledger: u32) {
        from.require_auth();
        assert!(amount >= 0, "amount must be non-negative");

        let key = DataKey::Allowance(AllowanceKey {
            from: from.clone(),
            spender: spender.clone(),
        });
        env.storage().persistent().set(&key, &amount);
        if amount > 0 && expiration_ledger > 0 {
            env.storage()
                .persistent()
                .extend_ttl(&key, expiration_ledger, expiration_ledger);
        }

        env.events().publish(
            (symbol_short!("approve"), from, spender),
            amount,
        );
    }

    /// Return the balance of `id`.
    pub fn balance(env: Env, id: Address) -> i128 {
        Self::get_balance(&env, &id)
    }

    /// Transfer `amount` from the caller to `to`.
    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();
        assert!(amount >= 0, "amount must be non-negative");

        let from_balance = Self::get_balance(&env, &from);
        assert!(from_balance >= amount, "insufficient balance");

        Self::set_balance(&env, &from, from_balance - amount);
        let to_balance = Self::get_balance(&env, &to);
        Self::set_balance(&env, &to, to_balance + amount);

        env.events().publish(
            (symbol_short!("transfer"), from, to),
            amount,
        );
    }

    /// Transfer `amount` from `from` to `to`, consuming allowance of the caller.
    pub fn transfer_from(env: Env, spender: Address, from: Address, to: Address, amount: i128) {
        spender.require_auth();
        assert!(amount >= 0, "amount must be non-negative");

        let allowance = Self::get_allowance(&env, &from, &spender);
        assert!(allowance >= amount, "insufficient allowance");

        // Decrease allowance
        let key = DataKey::Allowance(AllowanceKey {
            from: from.clone(),
            spender: spender.clone(),
        });
        env.storage().persistent().set(&key, &(allowance - amount));

        // Transfer
        let from_balance = Self::get_balance(&env, &from);
        assert!(from_balance >= amount, "insufficient balance");

        Self::set_balance(&env, &from, from_balance - amount);
        let to_balance = Self::get_balance(&env, &to);
        Self::set_balance(&env, &to, to_balance + amount);

        env.events().publish(
            (symbol_short!("transfer"), from, to),
            amount,
        );
    }

    // -----------------------------------------------------------------------
    // Token metadata
    // -----------------------------------------------------------------------

    pub fn decimals(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::Decimals).unwrap()
    }

    pub fn name(env: Env) -> String {
        env.storage().instance().get(&DataKey::Name).unwrap()
    }

    pub fn symbol(env: Env) -> String {
        env.storage().instance().get(&DataKey::Symbol).unwrap()
    }

    pub fn total_supply(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::TotalSupply).unwrap()
    }

    pub fn image_hash(env: Env) -> String {
        env.storage().instance().get(&DataKey::ImageHash).unwrap()
    }

    pub fn creator(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Creator).unwrap()
    }

    // -----------------------------------------------------------------------
    // Social links
    // -----------------------------------------------------------------------

    pub fn get_social_links(env: Env) -> (String, String, String) {
        let website: String = env.storage().instance().get(&DataKey::Website).unwrap();
        let twitter: String = env.storage().instance().get(&DataKey::Twitter).unwrap();
        let telegram: String = env.storage().instance().get(&DataKey::Telegram).unwrap();
        (website, twitter, telegram)
    }

    /// Update social links. Only the creator may call this.
    pub fn update_social_links(
        env: Env,
        caller: Address,
        website: String,
        twitter: String,
        telegram: String,
    ) {
        caller.require_auth();

        let stored_creator: Address = env.storage().instance().get(&DataKey::Creator).unwrap();
        assert!(caller == stored_creator, "only creator can update social links");

        env.storage().instance().set(&DataKey::Website, &website);
        env.storage().instance().set(&DataKey::Twitter, &twitter);
        env.storage().instance().set(&DataKey::Telegram, &telegram);

        env.events().publish(
            (symbol_short!("socials"),),
            (website, twitter, telegram),
        );
    }

    // -----------------------------------------------------------------------
    // Internal helpers
    // -----------------------------------------------------------------------

    fn get_balance(env: &Env, addr: &Address) -> i128 {
        let key = DataKey::Balance(addr.clone());
        env.storage().persistent().get(&key).unwrap_or(0)
    }

    fn set_balance(env: &Env, addr: &Address, amount: i128) {
        let key = DataKey::Balance(addr.clone());
        env.storage().persistent().set(&key, &amount);
    }

    fn get_allowance(env: &Env, from: &Address, spender: &Address) -> i128 {
        let key = DataKey::Allowance(AllowanceKey {
            from: from.clone(),
            spender: spender.clone(),
        });
        env.storage().persistent().get(&key).unwrap_or(0)
    }
}

// ---------------------------------------------------------------------------
// Implement the standard token::Interface trait so other contracts can use
// soroban_sdk::token::TokenClient to interact with PikeToken.
// ---------------------------------------------------------------------------

impl token::Interface for PikeToken {
    fn allowance(env: Env, from: Address, spender: Address) -> i128 {
        Self::allowance(env, from, spender)
    }

    fn approve(env: Env, from: Address, spender: Address, amount: i128, expiration_ledger: u32) {
        Self::approve(env, from, spender, amount, expiration_ledger);
    }

    fn balance(env: Env, id: Address) -> i128 {
        Self::balance(env, id)
    }

    fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        Self::transfer(env, from, to, amount);
    }

    fn transfer_from(env: Env, spender: Address, from: Address, to: Address, amount: i128) {
        Self::transfer_from(env, spender, from, to, amount);
    }

    fn burn(env: Env, from: Address, amount: i128) {
        from.require_auth();
        assert!(amount >= 0, "amount must be non-negative");
        let balance = Self::get_balance(&env, &from);
        assert!(balance >= amount, "insufficient balance");
        Self::set_balance(&env, &from, balance - amount);

        let total: i128 = env.storage().instance().get(&DataKey::TotalSupply).unwrap();
        env.storage()
            .instance()
            .set(&DataKey::TotalSupply, &(total - amount));

        env.events().publish(
            (symbol_short!("burn"), from),
            amount,
        );
    }

    fn burn_from(env: Env, spender: Address, from: Address, amount: i128) {
        spender.require_auth();
        assert!(amount >= 0, "amount must be non-negative");

        let allowance = Self::get_allowance(&env, &from, &spender);
        assert!(allowance >= amount, "insufficient allowance");

        let key = DataKey::Allowance(AllowanceKey {
            from: from.clone(),
            spender: spender.clone(),
        });
        env.storage().persistent().set(&key, &(allowance - amount));

        let balance = Self::get_balance(&env, &from);
        assert!(balance >= amount, "insufficient balance");
        Self::set_balance(&env, &from, balance - amount);

        let total: i128 = env.storage().instance().get(&DataKey::TotalSupply).unwrap();
        env.storage()
            .instance()
            .set(&DataKey::TotalSupply, &(total - amount));

        env.events().publish(
            (symbol_short!("burn"), from),
            amount,
        );
    }

    fn decimals(env: Env) -> u32 {
        Self::decimals(env)
    }

    fn name(env: Env) -> String {
        Self::name(env)
    }

    fn symbol(env: Env) -> String {
        Self::symbol(env)
    }
}

#[cfg(test)]
mod test;
