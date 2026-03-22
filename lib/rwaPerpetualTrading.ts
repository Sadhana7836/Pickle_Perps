import { CONTRACT_IDS } from './stellar';

// Soroban contract ID for RWA Perpetual Trading on Stellar Testnet
export const rwaPerpetualTradingAddress = CONTRACT_IDS.rwaPerpeturalTrading;
export const rwaPerpetualTradingABI = [] as readonly unknown[];

// Check if contract is deployed
export const isRWAContractDeployed = (): boolean => {
  return rwaPerpetualTradingAddress !== '';
};
