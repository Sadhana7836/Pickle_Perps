import { CONTRACT_IDS } from './stellar';

// Soroban contract ID for CopyTrading on Stellar Testnet
export const copyTradingAddress = CONTRACT_IDS.copyTrading;
export const copyTradingABI = [] as readonly unknown[];

// Check if contract is deployed
export const isCopyTradingDeployed = (): boolean => {
  return copyTradingAddress !== '';
};

// Types for CopyTrading contract
export interface Leader {
  wallet: string;
  profitShareBps: bigint;
  minFollowAmount: bigint;
  totalFollowers: bigint;
  totalCopiedVolume: bigint;
  totalProfitEarned: bigint;
  registeredAt: bigint;
  isActive: boolean;
}

export interface SubscriptionConfig {
  allocationAmount: bigint;
  maxLeverage: bigint;
  maxPositionSize: bigint;
  copyLongs: boolean;
  copyShorts: boolean;
  copyMeme: boolean;
  copyRWA: boolean;
  useProportionalCopy: boolean;
}

export interface Subscription {
  id: bigint;
  follower: string;
  leader: string;
  config: SubscriptionConfig;
  totalCopiedTrades: bigint;
  totalPnl: bigint;
  totalPnlIsProfit: boolean;
  profitSharePaid: bigint;
  subscribedAt: bigint;
  isActive: boolean;
}

export interface CopyPosition {
  originalPositionId: bigint;
  copiedPositionId: bigint;
  leader: string;
  follower: string;
  subscriptionId: bigint;
  isRWA: boolean;
  leaderMargin: bigint;
  followerMargin: bigint;
  createdAt: bigint;
  isOpen: boolean;
}

// Default subscription config
export const defaultSubscriptionConfig: SubscriptionConfig = {
  allocationAmount: BigInt(0),
  maxLeverage: BigInt(10),
  maxPositionSize: BigInt(0),
  copyLongs: true,
  copyShorts: true,
  copyMeme: true,
  copyRWA: true,
  useProportionalCopy: true,
};
