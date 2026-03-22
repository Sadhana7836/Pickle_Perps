import { CONTRACT_IDS } from './stellar';

// Soroban contract ID for MemeTokenFactory on Stellar Testnet
export const memeTokenFactoryAddress = CONTRACT_IDS.tokenFactory;
// ABI not needed for Soroban - contract methods are called by name
export const memeTokenFactoryABI = [] as readonly unknown[];
