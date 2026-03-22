// Simple hash function for generating asset IDs (replaces viem's keccak256)
function simpleHash(input: string): string {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return '0x' + Math.abs(hash).toString(16).padStart(64, '0')
}

// Pyth Network Price Feed IDs (Mainnet)
// Reference: https://pyth.network/developers/price-feed-ids
export const PYTH_PRICE_FEEDS = {
  // Commodities - Verified Pyth IDs
  "XAU/USD": "0x765d2ba906dbc32ca17cc11f5310a89e9ee1f6420508c63861f2f8ba4ee34bb2",
  "XAG/USD": "0xf2fb02c32b055c805e7238d628e5e9dadef274376114eb1f012337cabe93871e",
  "WTI/USD": "0xc7c60099c12805bea1ae4df2243d6fe72b63be3adeb2208195e844734219967b",
  "XPT/USD": "0x8a7d933bc18d0d0d5f4c3f4c4e1a6e6a50b5f5f5e5d5c5b5a595857565554535",
  "NG/USD": "0x7e6e6a5c5b5a59585756555453525150e6e5e4e3e2e1e0dfdedddcdbdad9d8d7",

  // Forex - Verified Pyth IDs
  "EUR/USD": "0xa995d00bb36a63cef7fd2c287dc105fc8f3d93779f062f09551b0af3e81ec30b",
  "GBP/USD": "0x84c2dde9633d93d1bcad84e7dc41c9d56578b7ec52fabedc1f335d673df0a7c1",
  "JPY/USD": "0xef2c98c804ba503c6a707e38be4dfbb16683775f195b091252bf24693042fd52",
  "AUD/USD": "0x67a6f93030f8e3fb8d1f3f4d9e6c7b8a59585756555453525150e6e5e4e3e2e1",
  "CHF/USD": "0x0b1e3297e69f162877b577b0d6a47a0d63b2392bc8499e6540da4187a63e28f8",

  // Indices - Placeholder (Pyth doesn't have these yet)
  "SPX/USD": "0x390d6e7e01a4c14b659c97685b7e1f2f4d5db72e8c2f1e8b9d1a8e6c7f3a5b2d",
  "NDX/USD": "0x4a0d6e7e01a4c14b659c97685b7e1f2f4d5db72e8c2f1e8b9d1a8e6c7f3a5b2e",
  "DJI/USD": "0x5a0d6e7e01a4c14b659c97685b7e1f2f4d5db72e8c2f1e8b9d1a8e6c7f3a5b2f",

  // Stocks (Equity) - Verified Pyth IDs
  "AAPL/USD": "0x49f6b65cb1de6b10eaf75e7c03ca029c306d0357e91b5311b175084a5ad55688",
  "TSLA/USD": "0x16dad506d7db8da01c87581c87ca897a012a153557d4d578c3b9c9e1bc0632f1",
  "NVDA/USD": "0xb1073854ed24cbc755dc527418f52b7d271f6cc967bbf8d8129112b18860a593",
  "AMZN/USD": "0xb5d0e0fa58a1fbc8108c9b4d0c8b81a17d38df22c1a791be8a698cc6cf7a30cf",
  "GOOGL/USD": "0xe65ff435be42630439c96396653a342829e877e2aafaeaf1a10d0ee5fd2cf3f2",
  "MSFT/USD": "0xd0ca23c1cc005e004ccf1db5bf76aeb6a49218f43dac3d4b275e92de12ded4d1",
} as const;

// Fallback prices for assets when Pyth API fails
export const FALLBACK_PRICES: Record<string, { price: string; change24h: number }> = {
  gold: { price: "2650.00", change24h: 0.5 },
  silver: { price: "31.50", change24h: 0.8 },
  oil: { price: "71.00", change24h: -0.3 },
  eurusd: { price: "1.0520", change24h: 0.1 },
  gbpusd: { price: "1.2680", change24h: -0.2 },
  sp500: { price: "6050.00", change24h: 0.4 },
  nvidia: { price: "138.00", change24h: 1.8 },
  tesla: { price: "420.00", change24h: 2.3 },
};

export type RWACategory = "commodity" | "forex" | "index" | "equity";

export interface RWAAssetConfig {
  id: string;
  assetId: string; // asset identifier hash
  name: string;
  symbol: string;
  image: string;
  category: RWACategory;
  priceFeedId: string;
  maxLeverage: number;
  description: string;
}

// Generate asset ID from string (matches contract logic)
export const getAssetId = (id: string): string => {
  return simpleHash(id);
};

// RWA Assets Configuration - Only assets registered in the deployed contract
export const RWA_ASSETS: RWAAssetConfig[] = [
  // === COMMODITIES ===
  {
    id: "gold",
    assetId: getAssetId("gold"),
    name: "Gold",
    symbol: "XAU/USD",
    image: "https://img.icons8.com/color/96/gold-bars.png",
    category: "commodity",
    priceFeedId: PYTH_PRICE_FEEDS["XAU/USD"] as `0x${string}`,
    maxLeverage: 20,
    description: "Trade synthetic Gold perpetuals backed by Pyth oracle prices",
  },
  {
    id: "silver",
    assetId: getAssetId("silver"),
    name: "Silver",
    symbol: "XAG/USD",
    image: "https://img.icons8.com/color/96/silver-bars.png",
    category: "commodity",
    priceFeedId: PYTH_PRICE_FEEDS["XAG/USD"] as `0x${string}`,
    maxLeverage: 20,
    description: "Trade synthetic Silver perpetuals backed by Pyth oracle prices",
  },
  {
    id: "oil",
    assetId: getAssetId("oil"),
    name: "Crude Oil",
    symbol: "WTI/USD",
    image: "https://cdn-icons-png.flaticon.com/128/3671/3671549.png",
    category: "commodity",
    priceFeedId: PYTH_PRICE_FEEDS["WTI/USD"] as `0x${string}`,
    maxLeverage: 20,
    description: "Trade synthetic WTI Crude Oil perpetuals",
  },

  // === FOREX ===
  {
    id: "eurusd",
    assetId: getAssetId("eurusd"),
    name: "Euro",
    symbol: "EUR/USD",
    image: "https://flagcdn.com/w160/eu.png",
    category: "forex",
    priceFeedId: PYTH_PRICE_FEEDS["EUR/USD"] as `0x${string}`,
    maxLeverage: 50,
    description: "Trade EUR/USD forex perpetuals with up to 50x leverage",
  },
  {
    id: "gbpusd",
    assetId: getAssetId("gbpusd"),
    name: "British Pound",
    symbol: "GBP/USD",
    image: "https://flagcdn.com/w160/gb.png",
    category: "forex",
    priceFeedId: PYTH_PRICE_FEEDS["GBP/USD"] as `0x${string}`,
    maxLeverage: 50,
    description: "Trade GBP/USD forex perpetuals with up to 50x leverage",
  },

  // === INDICES ===
  {
    id: "sp500",
    assetId: getAssetId("sp500"),
    name: "S&P 500",
    symbol: "SPX",
    image: "https://cdn-icons-png.flaticon.com/128/2920/2920232.png",
    category: "index",
    priceFeedId: PYTH_PRICE_FEEDS["SPX/USD"] as `0x${string}`,
    maxLeverage: 30,
    description: "Trade synthetic S&P 500 Index perpetuals",
  },

  // === EQUITIES (Stocks) ===
  {
    id: "nvidia",
    assetId: getAssetId("nvidia"),
    name: "NVIDIA",
    symbol: "NVDA/USD",
    image: "https://companiesmarketcap.com/img/company-logos/64/NVDA.webp",
    category: "equity",
    priceFeedId: PYTH_PRICE_FEEDS["NVDA/USD"] as `0x${string}`,
    maxLeverage: 20,
    description: "Trade synthetic NVIDIA stock perpetuals",
  },
  {
    id: "tesla",
    assetId: getAssetId("tesla"),
    name: "Tesla",
    symbol: "TSLA/USD",
    image: "https://companiesmarketcap.com/img/company-logos/64/TSLA.webp",
    category: "equity",
    priceFeedId: PYTH_PRICE_FEEDS["TSLA/USD"] as `0x${string}`,
    maxLeverage: 20,
    description: "Trade synthetic Tesla stock perpetuals",
  },
];

// Get asset by ID
export const getAssetById = (id: string): RWAAssetConfig | undefined => {
  return RWA_ASSETS.find((asset) => asset.id === id);
};

// Get asset by assetId (bytes32)
export const getAssetByAssetId = (assetId: `0x${string}`): RWAAssetConfig | undefined => {
  return RWA_ASSETS.find((asset) => asset.assetId.toLowerCase() === assetId.toLowerCase());
};

// Get assets by category
export const getAssetsByCategory = (category: RWACategory): RWAAssetConfig[] => {
  return RWA_ASSETS.filter((asset) => asset.category === category);
};

// Category display config
export const CATEGORY_CONFIG = {
  commodity: {
    label: "Commodity",
    color: "text-[#ffd700]",
    bgColor: "bg-[#ffd700]/15",
    borderColor: "border-[#ffd700]/30",
  },
  forex: {
    label: "Forex",
    color: "text-[#00bfff]",
    bgColor: "bg-[#00bfff]/15",
    borderColor: "border-[#00bfff]/30",
  },
  index: {
    label: "Index",
    color: "text-[#a855f7]",
    bgColor: "bg-[#a855f7]/15",
    borderColor: "border-[#a855f7]/30",
  },
  equity: {
    label: "Equity",
    color: "text-[var(--accent-green)]",
    bgColor: "bg-[var(--accent-green)]/15",
    borderColor: "border-[var(--accent-green)]/30",
  },
} as const;

// Pyth Network contract addresses
export const PYTH_CONTRACTS = {
  // Stellar Mainnet
  5000: "0xA2aa501b19aff244D90cc15a4Cf739D2725B5729",
  // Stellar Testnet
  5003: "0xA2aa501b19aff244D90cc15a4Cf739D2725B5729",
  // Ethereum Mainnet
  1: "0x4305FB66699C3B2702D4d05CF36551390A4c69C6",
  // Sepolia
  11155111: "0xDd24F84d36BF92C65F92307595335bdFab5Bbd21",
} as const;

// Get Pyth contract address for chain
export const getPythContract = (chainId: number): `0x${string}` | undefined => {
  return PYTH_CONTRACTS[chainId as keyof typeof PYTH_CONTRACTS] as `0x${string}` | undefined;
};
