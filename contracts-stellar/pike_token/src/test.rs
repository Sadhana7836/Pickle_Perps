#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

fn setup_token(env: &Env) -> (Address, Address, Address) {
    let contract_id = env.register(PikeToken, ());
    let admin = Address::generate(env);
    let creator = Address::generate(env);
    let curve = Address::generate(env);

    let name = String::from_str(env, "PikeTest");
    let symbol = String::from_str(env, "PKT");
    let image_hash = String::from_str(env, "QmTestHash123");
    let total_supply: i128 = 1_000_000_0000000; // 1M with 7 decimals
    let creator_amount: i128 = 100_000_0000000; // 10% to creator

    let client = PikeTokenClient::new(env, &contract_id);
    client.initialize(
        &admin,
        &name,
        &symbol,
        &7u32,
        &total_supply,
        &image_hash,
        &creator,
        &creator_amount,
        &curve,
    );

    (contract_id, creator, curve)
}

#[test]
fn test_initialize() {
    let env = Env::default();
    let (contract_id, creator, curve) = setup_token(&env);
    let client = PikeTokenClient::new(&env, &contract_id);

    assert_eq!(client.name(), String::from_str(&env, "PikeTest"));
    assert_eq!(client.symbol(), String::from_str(&env, "PKT"));
    assert_eq!(client.decimals(), 7u32);
    assert_eq!(client.total_supply(), 1_000_000_0000000i128);
    assert_eq!(client.balance(&creator), 100_000_0000000i128);
    assert_eq!(client.balance(&curve), 900_000_0000000i128);
}

#[test]
fn test_transfer() {
    let env = Env::default();
    env.mock_all_auths();
    let (contract_id, creator, _curve) = setup_token(&env);
    let client = PikeTokenClient::new(&env, &contract_id);

    let recipient = Address::generate(&env);
    client.transfer(&creator, &recipient, &1_000_0000000);

    assert_eq!(client.balance(&creator), 99_000_0000000i128);
    assert_eq!(client.balance(&recipient), 1_000_0000000i128);
}

#[test]
fn test_approve_and_transfer_from() {
    let env = Env::default();
    env.mock_all_auths();
    let (contract_id, creator, _curve) = setup_token(&env);
    let client = PikeTokenClient::new(&env, &contract_id);

    let spender = Address::generate(&env);
    let recipient = Address::generate(&env);

    client.approve(&creator, &spender, &5_000_0000000, &1000u32);
    assert_eq!(client.allowance(&creator, &spender), 5_000_0000000i128);

    client.transfer_from(&spender, &creator, &recipient, &2_000_0000000);
    assert_eq!(client.allowance(&creator, &spender), 3_000_0000000i128);
    assert_eq!(client.balance(&recipient), 2_000_0000000i128);
}

#[test]
fn test_update_social_links() {
    let env = Env::default();
    env.mock_all_auths();
    let (contract_id, creator, _curve) = setup_token(&env);
    let client = PikeTokenClient::new(&env, &contract_id);

    let website = String::from_str(&env, "https://pike.fi");
    let twitter = String::from_str(&env, "@pikeperps");
    let telegram = String::from_str(&env, "t.me/pikeperps");

    client.update_social_links(&creator, &website, &twitter, &telegram);
    let (w, t, tg) = client.get_social_links();
    assert_eq!(w, website);
    assert_eq!(t, twitter);
    assert_eq!(tg, telegram);
}
