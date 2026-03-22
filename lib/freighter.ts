import { isConnected, getPublicKey, signTransaction, isAllowed, setAllowed, requestAccess } from '@stellar/freighter-api';

export async function connectFreighter(): Promise<string | null> {
  try {
    const connected = await isConnected();
    if (!connected) {
      throw new Error('Freighter wallet is not installed. Please install the Freighter browser extension.');
    }

    const allowed = await isAllowed();
    if (!allowed) {
      await setAllowed();
      await requestAccess();
    }

    const publicKey = await getPublicKey();
    return publicKey;
  } catch (error) {
    console.error('Failed to connect Freighter:', error);
    return null;
  }
}

export async function getFreighterAddress(): Promise<string | null> {
  try {
    const connected = await isConnected();
    if (!connected) return null;
    const publicKey = await getPublicKey();
    return publicKey;
  } catch {
    return null;
  }
}

export async function signStellarTransaction(xdr: string): Promise<string> {
  const signedXdr = await signTransaction(xdr, {
    network: 'TESTNET',
    networkPassphrase: 'Test SDF Network ; September 2015',
  });
  return signedXdr;
}

export { isConnected as isFreighterConnected };
