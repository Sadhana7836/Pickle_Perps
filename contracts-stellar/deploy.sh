#!/bin/bash
# PikePerps Soroban Contract Deployment Script
# Usage: ./deploy.sh [identity-name]
# Prerequisites: stellar CLI, Rust toolchain with wasm32-unknown-unknown target

set -e

IDENTITY=${1:-pikeperps-deployer}
NETWORK="testnet"

echo "========================================="
echo "PikePerps Soroban Contract Deployment"
echo "========================================="
echo "Network: $NETWORK"
echo "Identity: $IDENTITY"
echo ""

# Check if identity exists
if ! stellar keys address "$IDENTITY" &>/dev/null; then
  echo "Creating and funding deployer identity..."
  stellar keys generate "$IDENTITY" --network "$NETWORK" --fund
fi

DEPLOYER=$(stellar keys address "$IDENTITY")
echo "Deployer address: $DEPLOYER"

# Get native XLM SAC (Stellar Asset Contract) address
NATIVE_TOKEN=$(stellar contract id asset --asset native --network "$NETWORK")
echo "Native XLM SAC: $NATIVE_TOKEN"
echo ""

# Build contracts
echo "=== Building contracts ==="
stellar contract build
echo ""

# Deploy contracts
echo "=== Deploying BondingCurve ==="
BONDING_CURVE=$(stellar contract deploy \
  --wasm target/wasm32v1-none/release/pike_bonding_curve.wasm \
  --source "$IDENTITY" \
  --network "$NETWORK")
echo "BondingCurve: $BONDING_CURVE"

echo ""
echo "=== Deploying PikeToken (WASM for factory) ==="
PIKE_TOKEN=$(stellar contract deploy \
  --wasm target/wasm32v1-none/release/pike_token.wasm \
  --source "$IDENTITY" \
  --network "$NETWORK")
echo "PikeToken template: $PIKE_TOKEN"

# Get the WASM hash for the token (needed by factory)
TOKEN_WASM_HASH=$(stellar contract install \
  --wasm target/wasm32v1-none/release/pike_token.wasm \
  --source "$IDENTITY" \
  --network "$NETWORK" 2>/dev/null || echo "already installed")

echo ""
echo "=== Deploying TokenFactory ==="
TOKEN_FACTORY=$(stellar contract deploy \
  --wasm target/wasm32v1-none/release/pike_token_factory.wasm \
  --source "$IDENTITY" \
  --network "$NETWORK")
echo "TokenFactory: $TOKEN_FACTORY"

echo ""
echo "=== Deploying PerpetualTrading ==="
PERP_TRADING=$(stellar contract deploy \
  --wasm target/wasm32v1-none/release/pike_perpetual_trading.wasm \
  --source "$IDENTITY" \
  --network "$NETWORK")
echo "PerpetualTrading: $PERP_TRADING"

echo ""
echo "========================================="
echo "=== Initializing Contracts ==="
echo "========================================="

echo ""
echo "--- Initializing BondingCurve ---"
stellar contract invoke \
  --id "$BONDING_CURVE" \
  --source "$IDENTITY" \
  --network "$NETWORK" \
  -- initialize \
  --admin "$DEPLOYER" \
  --factory "$TOKEN_FACTORY" \
  --native_token "$NATIVE_TOKEN"

echo ""
echo "--- Initializing TokenFactory ---"
stellar contract invoke \
  --id "$TOKEN_FACTORY" \
  --source "$IDENTITY" \
  --network "$NETWORK" \
  -- initialize \
  --admin "$DEPLOYER" \
  --minting_fee 10000000 \
  --bonding_curve_contract "$BONDING_CURVE" \
  --token_wasm_hash "$TOKEN_WASM_HASH"

echo ""
echo "--- Initializing PerpetualTrading ---"
stellar contract invoke \
  --id "$PERP_TRADING" \
  --source "$IDENTITY" \
  --network "$NETWORK" \
  -- initialize \
  --admin "$DEPLOYER" \
  --bonding_curve_contract "$BONDING_CURVE"

echo ""
echo "========================================="
echo "=== Deployment Complete ==="
echo "========================================="
echo ""
echo "Contract IDs (update in lib/stellar.ts):"
echo "  tokenFactory:     '$TOKEN_FACTORY'"
echo "  bondingCurve:     '$BONDING_CURVE'"
echo "  perpetualTrading: '$PERP_TRADING'"
echo "  pikeToken:        '$PIKE_TOKEN'"
echo ""
echo "Explorer URLs:"
echo "  TokenFactory:     https://stellar.expert/explorer/testnet/contract/$TOKEN_FACTORY"
echo "  BondingCurve:     https://stellar.expert/explorer/testnet/contract/$BONDING_CURVE"
echo "  PerpetualTrading: https://stellar.expert/explorer/testnet/contract/$PERP_TRADING"
echo "  PikeToken:        https://stellar.expert/explorer/testnet/contract/$PIKE_TOKEN"
