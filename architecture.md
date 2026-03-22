# PicklePerps - Complete Technical Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Smart Contracts](#smart-contracts)
   - [MemeToken & MemeTokenFactory](#memetokenfactory)
   - [BondingCurveMarket](#bondingcurvemarket)
   - [PerpetualTrading](#perpetualtrading)
   - [RWAPerpetualTrading](#rwaperpetualtrading)
   - [CopyTrading](#copytrading)
4. [DeFi Mathematics](#defi-mathematics)
5. [Application Flow](#application-flow)
6. [Frontend Architecture](#frontend-architecture)
7. [Subgraph & Indexing](#subgraph--indexing)
8. [Deployment Addresses](#deployment-addresses)

---

## Overview

**PicklePerps** is a decentralized meme token platform built on **Stellar Network (Soroban)** that combines:

- **Meme Token Creation**: Users can mint custom meme tokens with IPFS-stored images
- **Bonding Curve Trading**: Automated market making with linear price curves
- **Perpetual Trading**: Leveraged long/short positions (up to 100x) on meme tokens
- **RWA Perpetuals**: Trade real-world assets (Gold, Silver, Oil, BTC, ETH, SOL) with Pyth Oracle price feeds
- **Copy Trading**: Follow and copy trades from top-performing leaders

### Key Features

- Token creation with 1-10% creator allocation
- Linear bonding curve for automatic price discovery
- Up to 100x leverage on perpetual positions
- Copy trading with profit sharing (1-30%)
- Web UI for trading and portfolio management

---

## Architecture

```
+------------------+                            +------------------+
|   Frontend       |                            |   Subgraph       |
|   (Next.js)      |                            |   (GraphQL)      |
+--------+---------+                            +--------+---------+
         |                                               |
         v                                               v
+--------+---------+     +-------------------+     +-----+----------+
| Stellar SDK      |     |   Pyth Oracle     |     |   Event Poller |
| (Soroban Client) |     |   (Price Feeds)   |     |   (Soroban RPC)|
+--------+---------+     +---------+---------+     +--------+-------+
         |                         |                        |
         +-----------+-------------+------------------------+
                     |
                     v
    +----------------+----------------+
    |                                 |
    |   Stellar Testnet (Soroban)     |
    |                                 |
    |  +---------------------------+ |
    |  | TokenFactory              | |
    |  +---------------------------+ |
    |  | BondingCurve              | |
    |  +---------------------------+ |
    |  | PerpetualTrading          | |
    |  +---------------------------+ |
    |  | PikeToken (template)      | |
    |  +---------------------------+ |
    |                                 |
    +---------------------------------+
```

---

## Smart Contracts

### TokenFactory

**File**: `contracts-stellar/token_factory/src/lib.rs`

The factory contract creates new meme tokens with automatic bonding curve integration.

#### Token Creation Flow

1. User calls `create_token()` with name, symbol, supply, image hash, and allocation
2. Factory deploys a new PikeToken contract via WASM
3. Token supply is split:
   - **Creator**: Gets 1-10% (configurable via `creator_allocation_bps`)
   - **Bonding Curve**: Gets the remaining 90-99%
4. Factory calls BondingCurve to list the token

#### Key Functions

```rust
fn create_token(
    env: Env,
    creator: Address,
    name: String,
    symbol: String,
    total_supply: i128,
    image_hash: String,
    creator_allocation_bps: u32,  // 100-1000 (1%-10%)
    website: String,
    twitter: String,
    telegram: String,
) -> Address
```

#### Token Structure (PikeToken)

```rust
// Token with 7 decimals (Stellar standard)
// Fields: name, symbol, total_supply, image_hash, creator, created_at
```

---

### BondingCurve

**File**: `contracts-stellar/bonding_curve/src/lib.rs`

Implements automatic market making using a **linear bonding curve**.

#### Curve Configuration

```rust
// Stored per-token in Soroban storage
// token, creator, creator_allocation_bps (100-1000)
// initial_price, curve_coefficient, curve_supply
// sold_from_curve, reserve_balance, created_at, is_active
```

#### Key Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| `PRECISION` | 1e18 | Calculation precision |
| `PRICE_PRECISION` | 1e8 | USD price precision |
| `tradingFeeBps` | 50 (0.5%) | Trading fee in basis points |
| `defaultInitialPrice` | 1e3 ($0.00001) | Starting token price |
| `defaultCurveCoefficient` | 1e4 | Price doubles when 100% sold |

#### Price Formula

```
price = initialPrice + (curveCoefficient * soldFromCurve / curveSupply)
```

This is a **linear bonding curve** where:
- Price starts at `initialPrice`
- Price increases linearly as more tokens are sold
- When all tokens are sold (`soldFromCurve = curveSupply`), price = `initialPrice + curveCoefficient`

#### Buy/Sell Functions

```rust
fn buy(env: Env, buyer: Address, token: Address, xlm_amount: i128, min_tokens_out: i128) -> i128
fn sell(env: Env, seller: Address, token: Address, token_amount: i128, min_xlm_out: i128) -> i128
```

---

### PerpetualTrading

**File**: `contracts-stellar/perpetual_trading/src/lib.rs`

Enables leveraged perpetual futures trading on meme tokens.

#### Position Structure

```rust
// Stored per-position in Soroban storage
// user, token, is_long, size (i128), margin (i128)
// leverage (1-100), entry_price, entry_time, is_open
```

#### Key Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| `tradingFeeBps` | 5 (0.05%) | Trading fee |
| `maxLeverage` | 100 | Maximum leverage |
| `minMarginBps` | 1000 (10%) | Minimum margin requirement |

#### Price Sources (Priority Order)

1. **Bonding Curve Market** - Primary source for listed meme tokens
2. **Pyth Oracle** - For tokens with configured price feeds
3. **Last Trade Price** - Fallback for legacy support

#### Core Functions

```rust
fn open_position(env: Env, user: Address, token: Address, is_long: bool, margin: i128) -> u64
fn close_position(env: Env, user: Address, position_id: u64)
fn liquidate_position(env: Env, liquidator: Address, position_id: u64)
```

---

### RWAPerpetualTrading (Planned)

RWA perpetual trading using Pyth Network oracle price feeds. Not yet deployed on Soroban.

#### Supported Assets (Planned)

| Asset | Symbol | Max Leverage |
|-------|--------|--------------|
| Gold | XAU/USD | 20x |
| Silver | XAG/USD | 20x |
| Crude Oil | WTI | 20x |
| Bitcoin | BTC/USD | 50x |
| Ethereum | ETH/USD | 50x |
| Solana | SOL/USD | 50x |

---

### CopyTrading (Planned)

Social trading system allowing users to automatically copy top traders. Not yet deployed on Soroban.

#### Fee Structure

| Fee Type | Rate | Description |
|----------|------|-------------|
| Min Profit Share | 1% | Minimum leader profit share |
| Max Profit Share | 30% | Maximum leader profit share |
| Protocol Fee | 5% | Platform fee on profits |

---

## DeFi Mathematics

### 1. Bonding Curve Pricing

#### Linear Bonding Curve Formula

```
P(s) = a + (b * s / S)

Where:
- P(s) = Price when s tokens have been sold
- a = initialPrice (default: 1e3 = $0.00001)
- b = curveCoefficient (default: 1e4)
- s = soldFromCurve (tokens already sold)
- S = curveSupply (total tokens on curve)
```

#### Price at Different Supply Levels

| Sold % | Price Multiplier | Price (if initial = $0.00001) |
|--------|------------------|-------------------------------|
| 0% | 1.0x | $0.00001 |
| 25% | 1.25x | $0.0000125 |
| 50% | 1.5x | $0.000015 |
| 75% | 1.75x | $0.0000175 |
| 100% | 2.0x | $0.00002 |

#### Cost to Buy (Integral)

The cost to buy from supply `s1` to `s2`:

```
Cost = a * (s2 - s1) + b * (s2² - s1²) / (2 * S)
```

#### Proceeds from Selling (Integral)

The proceeds from selling from supply `s1` down to `s2`:

```
Proceeds = a * (s1 - s2) + b * (s1² - s2²) / (2 * S)
         = a * tokenAmount + b * (s1 + s2) * tokenAmount / (2 * S)
```

### 2. Perpetual Position Math

#### Position Size Calculation

```
positionSize = (margin * leverage * currentPrice) / 1e18
```

#### PnL Calculation

**Long Position:**
```
if (currentPrice >= entryPrice):
    PnL = ((currentPrice - entryPrice) * size) / entryPrice
    isProfit = true
else:
    PnL = ((entryPrice - currentPrice) * size) / entryPrice
    isProfit = false
```

**Short Position:**
```
if (currentPrice <= entryPrice):
    PnL = ((entryPrice - currentPrice) * size) / entryPrice
    isProfit = true
else:
    PnL = ((currentPrice - entryPrice) * size) / entryPrice
    isProfit = false
```

#### Liquidation Price

**Long Position:**
```
liquidationPrice = entryPrice * (1 - margin/size)
                 = entryPrice * (1 - 1/leverage)
```

**Short Position:**
```
liquidationPrice = entryPrice * (1 + margin/size)
                 = entryPrice * (1 + 1/leverage)
```

#### Example: 10x Long Position

```
Entry Price: $100
Leverage: 10x
Margin: $10

Position Size = $10 * 10 = $100

Liquidation Price = $100 * (1 - 1/10) = $100 * 0.9 = $90

If price goes to $110 (+10%):
  PnL = (($110 - $100) * $100) / $100 = $10 (100% profit on margin!)

If price goes to $95 (-5%):
  PnL = (($100 - $95) * $100) / $100 = $5 loss (50% of margin)
```

### 3. Trading Fees

#### Bonding Curve Fee
```
fee = ethAmount * tradingFeeBps / 10000
    = ethAmount * 50 / 10000
    = 0.5% of trade value
```

#### Perpetual Trading Fee
```
fee = positionSize * tradingFeeBps / 10000
    = positionSize * 5 / 10000
    = 0.05% of position size

// Fee is charged on both open and close
totalFee = 0.05% * 2 = 0.1% round-trip
```

#### RWA Trading Fee
```
fee = margin * tradingFeeBps / 10000
    = margin * 10 / 10000
    = 0.1% of margin
```

### 4. Copy Trading Profit Distribution

```
Profit earned by follower: P

Protocol Fee = P * 5%
Leader Share = P * leaderProfitShareBps / 10000
Follower Net = P - Protocol Fee - Leader Share

Example (10% leader share):
  Profit: $100
  Protocol Fee: $5
  Leader Share: $10
  Follower Net: $85
```

---

## Application Flow

### Token Lifecycle

```
1. CREATE TOKEN
   User → TokenFactory.create_token()
                ↓
   Deploy new PikeToken contract (via WASM)
                ↓
   Mint tokens: X% to creator, (100-X)% to BondingCurve
                ↓
   BondingCurve initializes curve for token
                ↓
   Token is now tradeable!

2. SPOT TRADING (Bonding Curve)
   BUY:  User sends XLM → BondingCurve.buy() → Receives tokens
   SELL: User sends tokens → BondingCurve.sell() → Receives XLM

3. PERPETUAL TRADING
   OPEN:  User deposits margin → PerpetualTrading.openPosition() → Position created
   CLOSE: User calls closePosition() → PnL settled → Margin ± PnL returned
   LIQUIDATE: Anyone can call liquidatePosition() if underwater → Liquidator gets 5% reward

4. COPY TRADING
   LEADER:   registerAsLeader() → Set profit share → Trade normally
   FOLLOWER: subscribe() → executeCopyMeme/RWA() when leader trades
   CLOSE:    closeCopiedPosition() → PnL distributed
```

### Data Flow Diagram

```
+-------------+    create_token()   +-------------------+
|   User      | -----------------> |   TokenFactory    |
+-------------+                     +-------------------+
      |                                     |
      |                                     | initialize curve
      |                                     v
      |    buy()/sell()           +-------------------+
      +-------------------------> |   BondingCurve    |
      |                           +-------------------+
      |                                     |
      |                                     | getCurrentPrice()
      |                                     v
      |    openPosition()         +-------------------+
      +-------------------------> |  PerpetualTrading |
      |                           +-------------------+
      |                                     |
      |                                     | Pyth Oracle
      |                                     v
      |    (planned)              +-------------------+
      +- - - - - - - - - - - - -> | RWAPerpetualTrading|
      |                           +-------------------+
      |
      |    (planned)              +-------------------+
      +- - - - - - - - - - - - -> |    CopyTrading    |
                                  +-------------------+
```

---

## Frontend Architecture

**Stack**: Next.js 15, React 19, TypeScript, Tailwind CSS, @stellar/stellar-sdk, @stellar/freighter-api

### Directory Structure

```
├── app/                  # Next.js app directory (pages)
├── components/           # React components
│   ├── TokenCard.tsx
│   ├── TokenDetailPage.tsx
│   ├── TradingPanel.tsx
│   ├── BondingCurvePanel.tsx
│   ├── PositionsList.tsx
│   ├── copy-trading/     # Copy trading components
│   └── ...
├── hooks/                # Custom React hooks
│   ├── useBondingCurve.ts
│   ├── usePerpetualTrading.ts
│   ├── useRWAPerpetualTrading.ts
│   ├── useCopyTrading.ts
│   ├── useMemeTokens.ts
│   └── ...
└── lib/                  # Utilities and configurations
```

### Key Hooks

#### useBondingCurve
```typescript
const { data, actions, state } = useBondingCurve(tokenAddress);

// data
data.currentPrice    // Current token price
data.curveConfig     // Full curve configuration
data.isListed        // Whether token is listed
data.curveProgress   // % of tokens sold (0-100)
data.reserve         // ETH/XLM reserve balance

// actions
actions.buy(ethAmount, minTokensOut)
actions.sell(tokenAmount, minEthOut)

// state
state.isLoading, state.isPending, state.isConfirming, state.hash
```

#### usePerpetualTrading
```typescript
const { userPositionIds, actions, state } = usePerpetualTrading();

// actions
actions.openPosition(token, isLong, margin, leverage)
actions.closePosition(positionId)
actions.updateMemeTokenPrice(token, price)
```

#### useBuyQuote / useSellQuote
```typescript
const { quote, isLoading } = useBuyQuote(tokenAddress, ethAmount);

// quote
quote.tokensOut    // Tokens received
quote.avgPrice     // Average execution price
quote.fee          // Trading fee
quote.priceImpact  // Price impact %
```

---

## Event Indexing

Event monitoring via Soroban RPC polling (no subgraph needed).

### Event Services

| Service | File | Poll Interval | Events |
|---------|------|---------------|--------|
| TokenCreationService | `lib/tokenCreationService.ts` | 5s | Token created |
| TradeEventService | `lib/tradeEventService.ts` | 3s | Buy, Sell, Price updates |
| CopyTradingService | `lib/copyTradingService.ts` | 3s | Position open/close (planned) |

### How It Works

- Services poll Soroban RPC for contract events at fixed intervals
- Events parsed from contract topics (e.g. `["created", creator_address]`)
- In-memory cache of recent events (50 tokens, 100 trades)
- Subscribe/unsubscribe pattern for React hooks

---

## Deployment Addresses

**Network**: Stellar Testnet (Soroban)

| Contract | Address |
|----------|---------|
| TokenFactory | `CBE2O7ZNTL5YYDWA2DERTZZGLD2Y26DZPBS4UQG3AFKAKAHAYS7CIBC2` |
| BondingCurve | `CAYFHHMOOUKN3TR7OUPNDA7HDVFURQY4BYB2UYWP3JSEHZXGKVTTU36E` |
| PerpetualTrading | `CCPRQDXBRZYXNPLXAOEMXABMN6KCRRGNLL7FBRYNTKS576PEB35QXME5` |
| PikeToken | `CBBLCH7N4QPAQZPSOOD3ECCV4UPFEGIUEEVSDWZA5OX6MDNJ5PE7S476` |

### Network Configuration

| Parameter | Value |
|-----------|-------|
| Network Name | Stellar Testnet |
| RPC URL | https://soroban-testnet.stellar.org |
| Horizon URL | https://horizon-testnet.stellar.org |
| Block Explorer | https://stellar.expert/explorer/testnet |
| Native Currency | XLM |

---

## Quick Reference

### Trading Fee Summary

| Platform | Fee | Notes |
|----------|-----|-------|
| Bonding Curve | 0.5% | On buy/sell |
| Meme Perps | 0.05% | On open/close |
| RWA Perps | 0.1% | On open/close |
| Copy Trading | 5% protocol + 1-30% leader | On profits only |

### Leverage Limits

| Platform | Max Leverage |
|----------|--------------|
| Meme Perps | 100x |
| RWA Perps | 50x (default), 200x (absolute max) |

### Liquidation Thresholds

| Platform | Threshold |
|----------|-----------|
| Meme Perps | Margin depleted (0%) |
| RWA Perps | 5% margin remaining |

---

## License

MIT
