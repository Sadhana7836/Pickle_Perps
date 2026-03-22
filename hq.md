# PicklePerps

## Description

PicklePerps is a high-speed perpetual trading platform on Stellar Network (Soroban) that combines meme token creation with leveraged trading for both crypto and real-world assets. It provides bonding curve AMM for instant token liquidity, up to 100x leverage on perpetuals, RWA trading via Pyth oracles, and copy trading infrastructure.


## The Solution

PicklePerps integrates token creation, bonding curve liquidity, and perpetual trading into a unified platform:

1. **Token Launch**: Deploy tokens with 1-10% creator allocation, IPFS metadata, and instant bonding curve initialization in a single transaction.

2. **Bonding Curve Trading**: Linear AMM with automatic price discovery. Formula: `Price = initialPrice + (coefficient * sold / supply)`. No LP required.

3. **Perpetual Positions**: Open leveraged long/short positions up to 100x on any bonding curve token. Positions use curve price as oracle.

4. **RWA Perpetuals**: Trade gold, silver, oil, forex, and equities via Pyth Network oracles. Same interface, same wallet.

5. **Copy Trading**: Follow top traders and automatically mirror positions with proportional sizing and configurable profit sharing.


## Technical Architecture

| Component | Specification |
|-----------|---------------|
| Bonding Curve | Linear AMM (P = P0 + k*S) |
| Price Precision | 1e8 (8 decimals) |
| Max Leverage | 100x (tokens), 50x (forex), 20x (commodities) |
| Oracle | Pyth Network + Bonding Curve |

**Fee Structure:**

| Action | Fee |
|--------|-----|
| Token Creation | 0.01 XLM |
| Bonding Curve Trade | 0.5% |
| Meme Perpetual | 0.05% per side |
| RWA Perpetual | 0.1% per side |
| Copy Trading Profit | 5% protocol + 1-30% leader |

**Perpetual Mechanics:**

```
Position Size = Margin * Leverage
Long PnL = ((currentPrice - entryPrice) * size) / entryPrice
Short PnL = ((entryPrice - currentPrice) * size) / entryPrice
Liquidation (Long) = entryPrice * (1 - 1/leverage)
Liquidation (Short) = entryPrice * (1 + 1/leverage)
```

**Gas Costs on Stellar:**

| Operation | Cost |
|-----------|------|
| Token Creation | ~$0.01 |
| Bonding Curve Buy | ~$0.005 |
| Open Perp Position | ~$0.01 |
| Close Perp Position | ~$0.008 |


## Smart Contracts

Deployed on Stellar Testnet (Soroban).

| Contract | Address | Explorer |
|----------|---------|----------|
| TokenFactory | `CBE2O7ZNTL5YYDWA2DERTZZGLD2Y26DZPBS4UQG3AFKAKAHAYS7CIBC2` | [View](https://stellar.expert/explorer/testnet/contract/CBE2O7ZNTL5YYDWA2DERTZZGLD2Y26DZPBS4UQG3AFKAKAHAYS7CIBC2) |
| BondingCurve | `CAYFHHMOOUKN3TR7OUPNDA7HDVFURQY4BYB2UYWP3JSEHZXGKVTTU36E` | [View](https://stellar.expert/explorer/testnet/contract/CAYFHHMOOUKN3TR7OUPNDA7HDVFURQY4BYB2UYWP3JSEHZXGKVTTU36E) |
| PerpetualTrading | `CCPRQDXBRZYXNPLXAOEMXABMN6KCRRGNLL7FBRYNTKS576PEB35QXME5` | [View](https://stellar.expert/explorer/testnet/contract/CCPRQDXBRZYXNPLXAOEMXABMN6KCRRGNLL7FBRYNTKS576PEB35QXME5) |
| PikeToken | `CBBLCH7N4QPAQZPSOOD3ECCV4UPFEGIUEEVSDWZA5OX6MDNJ5PE7S476` | [View](https://stellar.expert/explorer/testnet/contract/CBBLCH7N4QPAQZPSOOD3ECCV4UPFEGIUEEVSDWZA5OX6MDNJ5PE7S476) |


## Supported Assets

**Meme Token Perpetuals (100x max leverage):**
- Any token created through MemeTokenFactoryV3
- Price derived from BondingCurveMarket

**Real-World Asset Perpetuals:**

| Category | Assets | Max Leverage |
|----------|--------|--------------|
| Commodities | Gold (XAU/USD), Silver (XAG/USD), Oil (WTI/USD) | 20x |
| Forex | EUR/USD, GBP/USD, JPY/USD, AUD/USD, CHF/USD | 50x |
| Equities | AAPL, TSLA, NVDA, AMZN, GOOGL, MSFT | 50x |
| Crypto | BTC/USD, ETH/USD, SOL/USD | 50x |


## Security Model

| Property | Mechanism |
|----------|-----------|
| Position Integrity | Margin held in contract |
| Liquidation | Automated threshold monitoring |
| Price Manipulation | Multi-source oracle (Curve + Pyth) |
| Access Control | Owner-only admin functions |
| Emergency | Pausable contracts |

**Liquidation Thresholds:**
- Meme Perps: Liquidation when margin depleted
- RWA Perps: 5% margin threshold
- Liquidators incentivized with rewards


## Progress During Hackathon

A complete perpetual trading infrastructure for Stellar featuring four deployed Soroban smart contracts (TokenFactory, BondingCurve, PerpetualTrading, PikeToken), a Next.js 15 web application with real-time trading panels and candlestick charts, and Soroban RPC event polling for real-time data indexing.


## Fundraising Status

We are seeking seed funding to conduct professional security audits of our smart contracts and perpetual trading logic, expand RWA asset coverage with additional oracle integrations, and grow our engineering team. Our goal is to raise $50k to accelerate mainnet launch on Stellar and establish PicklePerps as the primary perpetual trading infrastructure for meme tokens and real-world assets on L2.


## Links

- Website: https://pickle-perps-lilac.vercel.app
- GitHub: https://github.com/Sadhana7836/picklePerps
- Subgraph API: https://api.goldsky.com/api/public/project_cmj709d6q6eqo01w6advl8q19/subgraphs/pickleperps/2.1.0/gn


## Contract Addresses

CBE2O7ZNTL5YYDWA2DERTZZGLD2Y26DZPBS4UQG3AFKAKAHAYS7CIBC2, CAYFHHMOOUKN3TR7OUPNDA7HDVFURQY4BYB2UYWP3JSEHZXGKVTTU36E, CCPRQDXBRZYXNPLXAOEMXABMN6KCRRGNLL7FBRYNTKS576PEB35QXME5, CBBLCH7N4QPAQZPSOOD3ECCV4UPFEGIUEEVSDWZA5OX6MDNJ5PE7S476
