#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env};

fn setup(env: &Env) -> (Address, Address, Address) {
    let contract_id = env.register(PerpetualTrading, ());
    let admin = Address::generate(env);
    let bonding_curve = Address::generate(env);

    let client = PerpetualTradingClient::new(env, &contract_id);
    client.initialize(&admin, &bonding_curve);

    (contract_id, admin, bonding_curve)
}

#[test]
fn test_initialize() {
    let env = Env::default();
    let (contract_id, _admin, _bonding_curve) = setup(&env);
    let _client = PerpetualTradingClient::new(&env, &contract_id);
    // Simply verifying initialization did not panic
}

#[test]
fn test_update_meme_token_price() {
    let env = Env::default();
    env.mock_all_auths();
    let (contract_id, admin, _bonding_curve) = setup(&env);
    let client = PerpetualTradingClient::new(&env, &contract_id);

    let token = Address::generate(&env);
    client.update_meme_token_price(&admin, &token, &50_000i128);
    // Verify no panic -- price is stored internally
}

#[test]
fn test_set_trading_fee() {
    let env = Env::default();
    env.mock_all_auths();
    let (contract_id, admin, _bonding_curve) = setup(&env);
    let client = PerpetualTradingClient::new(&env, &contract_id);

    client.set_trading_fee(&admin, &10u32);
    // No panic means success
}

#[test]
fn test_set_max_leverage() {
    let env = Env::default();
    env.mock_all_auths();
    let (contract_id, admin, _bonding_curve) = setup(&env);
    let client = PerpetualTradingClient::new(&env, &contract_id);

    client.set_max_leverage(&admin, &50u32);
}
