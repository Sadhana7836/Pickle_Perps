# Contract Addresses

All contracts are deployed on **Stellar Testnet** (Soroban).

## Core Contracts

### TokenFactory
**Address:** `CBE2O7ZNTL5YYDWA2DERTZZGLD2Y26DZPBS4UQG3AFKAKAHAYS7CIBC2`
**Network:** Stellar Testnet
**Explorer:** https://stellar.expert/explorer/testnet/contract/CBE2O7ZNTL5YYDWA2DERTZZGLD2Y26DZPBS4UQG3AFKAKAHAYS7CIBC2
**Description:** Factory contract for creating meme tokens with bonding curve integration and social links support

### BondingCurve
**Address:** `CAYFHHMOOUKN3TR7OUPNDA7HDVFURQY4BYB2UYWP3JSEHZXGKVTTU36E`
**Network:** Stellar Testnet
**Explorer:** https://stellar.expert/explorer/testnet/contract/CAYFHHMOOUKN3TR7OUPNDA7HDVFURQY4BYB2UYWP3JSEHZXGKVTTU36E
**Description:** Bonding curve marketplace for meme tokens with automatic market-making

### PerpetualTrading
**Address:** `CCPRQDXBRZYXNPLXAOEMXABMN6KCRRGNLL7FBRYNTKS576PEB35QXME5`
**Network:** Stellar Testnet
**Explorer:** https://stellar.expert/explorer/testnet/contract/CCPRQDXBRZYXNPLXAOEMXABMN6KCRRGNLL7FBRYNTKS576PEB35QXME5
**Description:** Perpetual trading contract for long/short positions with leverage

### PikeToken
**Address:** `CBBLCH7N4QPAQZPSOOD3ECCV4UPFEGIUEEVSDWZA5OX6MDNJ5PE7S476`
**Network:** Stellar Testnet
**Explorer:** https://stellar.expert/explorer/testnet/contract/CBBLCH7N4QPAQZPSOOD3ECCV4UPFEGIUEEVSDWZA5OX6MDNJ5PE7S476
**Description:** Template token contract for meme tokens created via TokenFactory

## Network Information

- **Network Name:** Stellar Testnet
- **RPC URL:** https://soroban-testnet.stellar.org
- **Horizon URL:** https://horizon-testnet.stellar.org
- **Block Explorer:** https://stellar.expert/explorer/testnet
- **Native Currency:** XLM

## Contract Interactions

- **BondingCurve** is connected to **TokenFactory**
- **PerpetualTrading** uses **BondingCurve** for price feeds
- All meme tokens created via **TokenFactory** are automatically listed on **BondingCurve**
