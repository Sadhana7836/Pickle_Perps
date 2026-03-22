/**
 * Real-Time Token Creation Service
 * Uses Stellar/Soroban event polling for token creation updates
 */

import { server } from './stellar';
import { CONTRACT_IDS } from './stellar';
import { formatAmount, decodeSorobanEvent } from './soroban';

export interface TokenCreatedEvent {
  tokenAddress: string;
  creator: string;
  name: string;
  symbol: string;
  totalSupply: string;
  imageHash: string;
  creatorAllocationBps: number;
  timestamp: number;
  txHash: string;
  blockNumber: bigint;
  website?: string;
  twitter?: string;
  telegram?: string;
}

type TokenCreatedCallback = (token: TokenCreatedEvent) => void;

class TokenCreationService {
  private subscribers: Set<TokenCreatedCallback> = new Set();
  private isListening = false;
  private recentTokens: TokenCreatedEvent[] = [];
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private lastLedger: number = 0;

  initialize() {
    if (this.isListening) return;
    this.startListening();
  }

  private startListening() {
    if (this.isListening) return;

    this.isListening = true;
    console.log("[TokenCreation] Starting Soroban event polling...");

    const contractId = CONTRACT_IDS.tokenFactory;
    if (!contractId) {
      console.warn("[TokenCreation] Token factory contract ID not set");
      return;
    }

    // Poll for events every 5 seconds
    this.pollingInterval = setInterval(async () => {
      try {
        // Get latest ledger if we don't have one yet
        if (!this.lastLedger) {
          try {
            const latestLedger = await server.getLatestLedger();
            this.lastLedger = latestLedger.sequence - 100; // Start from ~100 ledgers ago
          } catch {
            return; // Can't poll without a starting ledger
          }
        }

        const events = await server.getEvents({
          startLedger: this.lastLedger,
          filters: [
            {
              type: 'contract',
              contractIds: [contractId],
            },
          ],
          limit: 20,
        });

        if (events.events && events.events.length > 0) {
          for (const event of events.events) {
            const token = this.parseSorobanEvent(event);
            if (token) {
              this.handleNewToken(token);
            }
          }

          // Update last ledger
          const lastEvent = events.events[events.events.length - 1];
          if (lastEvent && lastEvent.ledger) {
            this.lastLedger = lastEvent.ledger;
          }
        }
      } catch {
        // Polling error - will retry on next interval
      }
    }, 5000);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseSorobanEvent(event: any): TokenCreatedEvent | null {
    try {
      const { topics, value } = decodeSorobanEvent(event);
      if (!topics.length || !value) return null;

      // Contract emits:
      //   topics: [symbol("created"), creator_address]
      //   value:  (token_address, name, symbol, total_supply)
      const symbol = String(topics[0]);
      if (symbol !== 'created') return null;

      const creator = String(topics[1] || '');
      const vals = Array.isArray(value) ? value : [value];

      const tokenAddress = String(vals[0] || '');
      const name = String(vals[1] || '');
      const tokenSymbol = String(vals[2] || '');
      const totalSupply = vals[3] ? formatAmount(BigInt(vals[3])) : '0';

      if (!tokenAddress || !name || !tokenSymbol) return null;

      return {
        tokenAddress,
        creator,
        name,
        symbol: tokenSymbol,
        totalSupply,
        imageHash: '',
        creatorAllocationBps: 0,
        timestamp: event.ledgerClosedAt ? new Date(event.ledgerClosedAt).getTime() : Date.now(),
        txHash: event.txHash || '',
        blockNumber: BigInt(event.ledger || 0),
      };
    } catch (error) {
      console.error("[TokenCreation] Failed to parse event:", error);
      return null;
    }
  }

  private handleNewToken(token: TokenCreatedEvent) {
    console.log(`[TokenCreation] New token created: ${token.name} (${token.symbol}) at ${token.tokenAddress}`);

    this.recentTokens.unshift(token);
    if (this.recentTokens.length > 50) {
      this.recentTokens.pop();
    }

    this.subscribers.forEach((callback) => {
      try {
        callback(token);
      } catch (e) {
        console.error("[TokenCreation] Callback error:", e);
      }
    });
  }

  subscribe(callback: TokenCreatedCallback): () => void {
    this.subscribers.add(callback);

    return () => {
      this.subscribers.delete(callback);
    };
  }

  getRecentTokens(limit = 50): TokenCreatedEvent[] {
    return this.recentTokens.slice(0, limit);
  }

  async fetchRecentTokensFromChain(
    fromLedger: number,
    _toLedger?: number
  ): Promise<TokenCreatedEvent[]> {
    const contractId = CONTRACT_IDS.tokenFactory;
    if (!contractId) return [];

    try {
      const events = await server.getEvents({
        startLedger: fromLedger,
        filters: [
          {
            type: 'contract',
            contractIds: [contractId],
          },
        ],
        limit: 100,
      });

      const tokens: TokenCreatedEvent[] = [];

      if (events.events) {
        for (const event of events.events) {
          const token = this.parseSorobanEvent(event);
          if (token) tokens.push(token);
        }
      }

      tokens.sort((a, b) => Number(b.blockNumber - a.blockNumber));
      return tokens;
    } catch (error) {
      console.error("[TokenCreation] Failed to fetch historical tokens:", error);
      return [];
    }
  }

  stop() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isListening = false;
    this.subscribers.clear();
  }
}

// Singleton instance
export const tokenCreationService = new TokenCreationService();
