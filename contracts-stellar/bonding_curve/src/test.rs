#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env};

fn setup(env: &Env) -> (Address, Address, Address) {
    let contract_id = env.register(BondingCurve, ());
    let admin = Address::generate(env);
    let factory = Address::generate(env);
    let native_token = Address::generate(env);

    let client = BondingCurveClient::new(env, &contract_id);
    env.mock_all_auths();
    client.initialize(&admin, &factory, &native_token);

    (contract_id, admin, factory)
}

#[test]
fn test_initialize() {
    let env = Env::default();
    let (contract_id, _admin, _factory) = setup(&env);
    let client = BondingCurveClient::new(&env, &contract_id);
    assert_eq!(client.get_listed_token_count(), 0);
}

#[test]
fn test_initialize_curve() {
    let env = Env::default();
    env.mock_all_auths();
    let (contract_id, _admin, _factory) = setup(&env);
    let client = BondingCurveClient::new(&env, &contract_id);

    let token = Address::generate(&env);
    let creator = Address::generate(&env);

    client.initialize_curve(&token, &creator, &500u32, &1_000_000_0000000i128);

    assert!(client.is_listed(&token));
    assert_eq!(client.get_listed_token_count(), 1);

    let config = client.get_curve_config(&token);
    assert_eq!(config.creator_allocation_bps, 500);
    // curve_supply = total * (10000 - 500) / 10000 = 950_000_0000000
    assert_eq!(config.curve_supply, 950_000_0000000i128);
    assert_eq!(config.sold_from_curve, 0);
    assert!(config.is_active);
}

#[test]
fn test_get_current_price_initial() {
    let env = Env::default();
    env.mock_all_auths();
    let (contract_id, _admin, _factory) = setup(&env);
    let client = BondingCurveClient::new(&env, &contract_id);

    let token = Address::generate(&env);
    let creator = Address::generate(&env);
    client.initialize_curve(&token, &creator, &500u32, &1_000_000_0000000i128);

    let price = client.get_current_price(&token);
    // initial_price = 1000 (1e3)
    assert_eq!(price, 1_000i128);
}

#[test]
fn test_curve_progress_zero() {
    let env = Env::default();
    env.mock_all_auths();
    let (contract_id, _admin, _factory) = setup(&env);
    let client = BondingCurveClient::new(&env, &contract_id);

    let token = Address::generate(&env);
    let creator = Address::generate(&env);
    client.initialize_curve(&token, &creator, &500u32, &1_000_000_0000000i128);

    let progress = client.get_curve_progress(&token);
    assert_eq!(progress.progress_bps, 0);
    assert_eq!(progress.sold, 0);
}
