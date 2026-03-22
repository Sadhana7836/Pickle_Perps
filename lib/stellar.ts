import * as StellarSdk from '@stellar/stellar-sdk';

export const STELLAR_NETWORK = 'TESTNET';
export const STELLAR_NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET;
export const STELLAR_RPC_URL = 'https://soroban-testnet.stellar.org';
export const STELLAR_HORIZON_URL = 'https://horizon-testnet.stellar.org';

// Contract IDs - Deployed on Stellar Testnet
export const CONTRACT_IDS = {
  tokenFactory: 'CBE2O7ZNTL5YYDWA2DERTZZGLD2Y26DZPBS4UQG3AFKAKAHAYS7CIBC2',
  bondingCurve: 'CAYFHHMOOUKN3TR7OUPNDA7HDVFURQY4BYB2UYWP3JSEHZXGKVTTU36E',
  perpetualTrading: 'CCPRQDXBRZYXNPLXAOEMXABMN6KCRRGNLL7FBRYNTKS576PEB35QXME5',
  pickleToken: 'CBBLCH7N4QPAQZPSOOD3ECCV4UPFEGIUEEVSDWZA5OX6MDNJ5PE7S476',
  copyTrading: '',
  rwaPerpeturalTrading: '',
};

// Create server instance
export const server = new StellarSdk.SorobanRpc.Server(STELLAR_RPC_URL);
export const horizonServer = new StellarSdk.Horizon.Server(STELLAR_HORIZON_URL);
