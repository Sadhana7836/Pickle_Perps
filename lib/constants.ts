// Centralized theme constants
export const colors = {
  // Primary colors
  primary: "#2E8B57",
  primaryHover: "#3AA86A",
  primaryDark: "#236B44",

  // Accent colors
  accent: "#2962ff",
  accentHover: "#3d72ff",

  // Status colors
  success: "#2E8B57",
  error: "#ff4757",
  warning: "#ffc107",
  info: "#00bfff",

  // Background colors
  bgDark: "#111111",
  bgCard: "#0d0d0d",
  bgElevated: "#111111",
  bgHover: "#1a1a1a",
  bgInput: "#0d0d0d",

  // Border colors
  border: "#1a1a1a",
  borderLight: "#2a2a2a",
  borderHover: "#252525",

  // Text colors
  textPrimary: "#ffffff",
  textSecondary: "#888888",
  textMuted: "#555555",
  textDim: "#444444",
  textDisabled: "#333333",
} as const

// Polling intervals (in milliseconds) - optimized for performance with WebSocket/events fallback
export const POLLING = {
  TOKENS_REFRESH: 60000,      // 60 seconds - main token list (event-based updates are primary)
  NEW_TOKEN_CHECK: 30000,     // 30 seconds - check for new tokens (events handle real-time)
  PRICE_UPDATE: 10000,        // 10 seconds - price updates (WebSocket primary, this is fallback)
  POSITIONS_REFRESH: 30000,   // 30 seconds - positions refresh (multicall batched now)
  TRANSACTIONS_REFRESH: 60000, // 60 seconds - transaction history
} as const

// WebSocket configuration
export const WEBSOCKET = {
  PYTH_URL: "wss://hermes.pyth.network/ws",
  RECONNECT_DELAY: 1000,      // 1 second initial delay
  MAX_RECONNECT_ATTEMPTS: 5,
  HEARTBEAT_INTERVAL: 30000,  // 30 seconds
} as const

// Caching configuration
export const CACHE = {
  PYTH_PRICE_TTL: 5000,       // 5 seconds - Pyth price data cache
  POSITION_DATA_TTL: 10000,   // 10 seconds - position data cache
  STALE_TIME: 5000,           // 5 seconds - React Query stale time
  GC_TIME: 300000,            // 5 minutes - garbage collection time
} as const

// Request timeouts (in milliseconds)
export const TIMEOUTS = {
  CONTRACT_READ: 10000,       // 10 seconds (reduced)
  BALANCE_FETCH: 5000,        // 5 seconds (reduced)
  BLOCK_FETCH: 15000,         // 15 seconds (reduced)
  TRANSACTION_WAIT: 60000,    // 60 seconds
  WEBSOCKET_FALLBACK: 3000,   // 3 seconds - fallback to HTTP if WS fails
} as const

// Chat configuration
export const CHAT = {
  MAX_MESSAGES: 100,          // Maximum messages to keep in memory
  MESSAGE_TRIM_COUNT: 50,     // Number of messages to keep when trimming
} as const

// Trading configuration
export const TRADING = {
  MAX_LEVERAGE: 100,
  DEFAULT_LEVERAGE: 10,
  MIN_LEVERAGE: 1,
  FEE_PERCENTAGE: 0.0005,     // 0.05%
  DEFAULT_PRICE: BigInt(10000000),   // $0.0001 * 1e8
} as const

// Age color thresholds (in days)
export const AGE_THRESHOLDS = {
  NEW: 1,                     // < 1 day = green
  RECENT: 7,                  // 1-7 days = yellow
                              // > 7 days = red
} as const

// Default values for token data when real data is unavailable
export const TOKEN_DEFAULTS = {
  holders: 0,
  transactions: 0,
  comments: 0,
  quotes: 0,
  fundingValue: "0.000",
  netChange: "$0.00",
  topHolderPercent: "0%",
  buySellRatio: "0%/0%",
  progressBar: 0,
} as const
