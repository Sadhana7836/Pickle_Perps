/**
 * Pyth WebSocket Service for Real-Time Price Feeds
 * Provides sub-second price updates instead of polling
 */

type PriceCallback = (price: PythPrice) => void;

export interface PythPrice {
  id: string;
  price: number;
  expo: number;
  conf: number;
  publishTime: number;
  normalizedPrice: number;
}

interface PythWSMessage {
  type: string;
  price_feed?: {
    id: string;
    price: {
      price: string;
      conf: string;
      expo: number;
      publish_time: number;
    };
    ema_price: {
      price: string;
      conf: string;
      expo: number;
      publish_time: number;
    };
  };
}

class PythWebSocketService {
  private ws: WebSocket | null = null;
  private subscribers: Map<string, Set<PriceCallback>> = new Map();
  private prices: Map<string, PythPrice> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private pendingSubscriptions: Set<string> = new Set();

  private readonly wsUrl = "wss://hermes.pyth.network/ws";

  connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    if (this.isConnecting) {
      return new Promise((resolve) => {
        const checkConnection = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            clearInterval(checkConnection);
            resolve();
          }
        }, 100);
      });
    }

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.wsUrl);

        this.ws.onopen = () => {
          console.log("[Pyth WS] Connected");
          this.isConnecting = false;
          this.reconnectAttempts = 0;

          // Resubscribe to all feeds
          this.resubscribeAll();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          console.error("[Pyth WS] Error:", error);
          this.isConnecting = false;
        };

        this.ws.onclose = () => {
          console.log("[Pyth WS] Disconnected");
          this.isConnecting = false;
          this.attemptReconnect();
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  private handleMessage(data: string) {
    try {
      const message: PythWSMessage = JSON.parse(data);

      if (message.type === "price_update" && message.price_feed) {
        const feed = message.price_feed;
        const id = feed.id;
        const priceData = feed.price;

        const price = parseInt(priceData.price);
        const expo = priceData.expo;
        const normalizedPrice = price * Math.pow(10, expo);

        const pythPrice: PythPrice = {
          id,
          price,
          expo,
          conf: parseInt(priceData.conf),
          publishTime: priceData.publish_time,
          normalizedPrice,
        };

        this.prices.set(id, pythPrice);

        // Notify subscribers
        const callbacks = this.subscribers.get(id);
        if (callbacks) {
          callbacks.forEach((cb) => cb(pythPrice));
        }
      }
    } catch {
      // Ignore parse errors for non-JSON messages
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("[Pyth WS] Max reconnect attempts reached");
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`[Pyth WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  private resubscribeAll() {
    const allIds = new Set([...this.subscribers.keys(), ...this.pendingSubscriptions]);
    if (allIds.size > 0) {
      this.sendSubscribe([...allIds]);
    }
    this.pendingSubscriptions.clear();
  }

  private sendSubscribe(ids: string[]) {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      ids.forEach((id) => this.pendingSubscriptions.add(id));
      return;
    }

    const cleanIds = ids.map((id) => id.replace("0x", ""));

    this.ws.send(
      JSON.stringify({
        type: "subscribe",
        ids: cleanIds,
      })
    );

    console.log(`[Pyth WS] Subscribed to ${cleanIds.length} feeds`);
  }

  private sendUnsubscribe(ids: string[]) {
    if (this.ws?.readyState !== WebSocket.OPEN) return;

    const cleanIds = ids.map((id) => id.replace("0x", ""));

    this.ws.send(
      JSON.stringify({
        type: "unsubscribe",
        ids: cleanIds,
      })
    );
  }

  subscribe(priceFeedId: string, callback: PriceCallback): () => void {
    const cleanId = priceFeedId.replace("0x", "");

    // Add to subscribers
    if (!this.subscribers.has(cleanId)) {
      this.subscribers.set(cleanId, new Set());
      // Subscribe to this feed
      this.sendSubscribe([cleanId]);
    }

    this.subscribers.get(cleanId)!.add(callback);

    // Return cached price immediately if available
    const cachedPrice = this.prices.get(cleanId);
    if (cachedPrice) {
      setTimeout(() => callback(cachedPrice), 0);
    }

    // Connect if not connected
    if (this.ws?.readyState !== WebSocket.OPEN) {
      this.connect();
    }

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(cleanId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscribers.delete(cleanId);
          this.sendUnsubscribe([cleanId]);
        }
      }
    };
  }

  getPrice(priceFeedId: string): PythPrice | undefined {
    const cleanId = priceFeedId.replace("0x", "");
    return this.prices.get(cleanId);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscribers.clear();
    this.prices.clear();
  }
}

// Singleton instance
export const pythWS = new PythWebSocketService();

// Preconnect function - call early in app lifecycle for faster first price
export function preconnectPythWS(): void {
  if (typeof window !== "undefined") {
    pythWS.connect().catch(() => {
      // Silent fail - will retry on first subscription
    });
  }
}

// React hook for using Pyth WebSocket
export function usePythWebSocket() {
  return pythWS;
}

// Auto-preconnect on module load (client-side only)
if (typeof window !== "undefined") {
  // Delay slightly to not block initial render
  setTimeout(preconnectPythWS, 100);
}
