"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useStellarWallet } from "@/contexts/StellarContext";
import { callContract, toScVal, formatAmount, parseAmount } from "@/lib/soroban";
import { CONTRACT_IDS } from "@/lib/stellar";
import { RWA_ASSETS, getAssetByAssetId, FALLBACK_PRICES, type RWAAssetConfig } from "@/lib/rwaAssets";
import { pythWS, type PythPrice } from "@/lib/pythWebSocket";

// ============ Optimized Pyth Price Fetch (with caching) ============

const priceUpdateCache = new Map<string, { data: string[]; timestamp: number }>();
const CACHE_TTL = 5000; // 5 second cache

async function fetchPythPriceUpdate(priceFeedId: string): Promise<string[]> {
  const cacheKey = priceFeedId;
  const cached = priceUpdateCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const feedId = priceFeedId.replace("0x", "");
    const response = await fetch(
      `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${feedId}&encoding=hex`
    );

    if (!response.ok) {
      console.warn("Failed to fetch Pyth price update:", response.status);
      return cached?.data || [];
    }

    const data = await response.json();
    if (data.binary && data.binary.data && data.binary.data.length > 0) {
      const result = data.binary.data.map((d: string) => `0x${d}`);
      priceUpdateCache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    }
    return [];
  } catch (error) {
    console.warn("Error fetching Pyth price update:", error);
    return cached?.data || [];
  }
}

// ============ Types ============

export interface RWAPosition {
  positionId: number;
  user: string;
  assetId: string;
  asset: RWAAssetConfig | undefined;
  isLong: boolean;
  size: string;
  margin: string;
  leverage: number;
  entryPrice: bigint;
  entryExpo: number;
  entryTime: bigint;
  isOpen: boolean;
  pnl?: string;
  isProfit?: boolean;
  liquidationPrice?: string;
}

export interface RWATradingState {
  isLoading: boolean;
  isPending: boolean;
  isConfirming: boolean;
  isConfirmed: boolean;
  hash: string | undefined;
  error: Error | null;
}

// Optimistic position for immediate UI feedback
interface OptimisticPosition {
  assetId: string;
  isLong: boolean;
  margin: string;
  leverage: number;
  timestamp: number;
}

// ============ Main Hook with All Optimizations ============

export const useRWAPerpetualTrading = () => {
  const { address } = useStellarWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [hash, setHash] = useState<string | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);
  const [positions, setPositions] = useState<RWAPosition[]>([]);
  const [userPositionIds, setUserPositionIds] = useState<bigint[]>([]);
  const [optimisticPositions, setOptimisticPositions] = useState<OptimisticPosition[]>([]);

  const contractId = CONTRACT_IDS.rwaPerpeturalTrading;
  const isDeployed = contractId !== '';

  const fetchPositions = useCallback(async () => {
    if (!contractId || !address) return;

    try {
      const ids = await callContract(
        contractId,
        "get_user_positions",
        [toScVal(address, 'address')],
        address
      );
      setUserPositionIds(ids || []);
    } catch {
      // Contract not deployed
    }
  }, [contractId, address]);

  useEffect(() => {
    fetchPositions();
    const interval = setInterval(fetchPositions, 30000);
    return () => clearInterval(interval);
  }, [fetchPositions]);

  // ============ Open Position with Optimistic Update ============

  const openPosition = useCallback(
    async (
      assetId: string,
      isLong: boolean,
      marginXlm: string,
      leverage: number
    ): Promise<number> => {
      if (!isDeployed) {
        console.log("Demo mode: Contract not deployed");
        return Math.floor(Math.random() * 1000);
      }

      if (!marginXlm || !leverage || !address) {
        throw new Error("Margin, leverage, and wallet are required");
      }

      const optimistic: OptimisticPosition = {
        assetId,
        isLong,
        margin: marginXlm,
        leverage,
        timestamp: Date.now(),
      };
      setOptimisticPositions(prev => [...prev, optimistic]);

      try {
        setIsLoading(true);
        setIsPending(true);
        setError(null);
        setIsConfirmed(false);

        const marginScaled = parseAmount(marginXlm);
        const asset = RWA_ASSETS.find(a => a.assetId.toLowerCase() === assetId.toLowerCase());

        let priceUpdateData: string[] = [];
        if (asset) {
          priceUpdateData = await fetchPythPriceUpdate(asset.priceFeedId);
        }

        const result = await callContract(
          contractId,
          "open_position",
          [
            toScVal(assetId, 'string'),
            toScVal(isLong, 'bool'),
            toScVal(BigInt(leverage).toString(), 'u64'),
            toScVal(priceUpdateData.join(','), 'string'),
          ],
          address,
          true
        );

        setOptimisticPositions(prev => prev.filter(p => p.timestamp !== optimistic.timestamp));
        setIsPending(false);
        setIsConfirming(false);
        setIsConfirmed(true);

        await fetchPositions();
        return result ? Number(result) : 0;
      } catch (err: unknown) {
        setOptimisticPositions(prev => prev.filter(p => p.timestamp !== optimistic.timestamp));
        console.error("Error opening RWA position:", err);
        setError(err as Error);
        throw err;
      } finally {
        setIsLoading(false);
        setIsPending(false);
        setIsConfirming(false);
      }
    },
    [isDeployed, contractId, address, fetchPositions]
  );

  // ============ Close Position ============

  const closePosition = useCallback(
    async (positionId: number, priceFeedId?: string): Promise<void> => {
      if (!isDeployed || !address) {
        console.log("Demo mode: Cannot close position");
        return;
      }

      try {
        setIsLoading(true);
        setIsPending(true);
        setError(null);

        let priceUpdateData: string[] = [];
        if (priceFeedId) {
          priceUpdateData = await fetchPythPriceUpdate(priceFeedId);
        }

        await callContract(
          contractId,
          "close_position",
          [
            toScVal(BigInt(positionId).toString(), 'u64'),
            toScVal(priceUpdateData.join(','), 'string'),
          ],
          address,
          true
        );

        setIsConfirmed(true);
        await fetchPositions();
      } catch (err) {
        console.error("Error closing RWA position:", err);
        setError(err as Error);
        throw err;
      } finally {
        setIsLoading(false);
        setIsPending(false);
        setIsConfirming(false);
      }
    },
    [isDeployed, contractId, address, fetchPositions]
  );

  // ============ State ============

  const state: RWATradingState = {
    isLoading,
    isPending,
    isConfirming,
    isConfirmed,
    hash,
    error,
  };

  return {
    isDeployed,
    userPositionIds,
    positions,
    optimisticPositions,
    openPosition,
    closePosition,
    state,
    refetch: fetchPositions,
  };
};

// ============ Optimized Position Hook ============

export const useRWAPosition = (positionId: number) => {
  const { address } = useStellarWallet();
  const [position, setPosition] = useState<{
    isLong: boolean;
    size: string;
    margin: string;
    leverage: number;
    entryPrice: string;
    isOpen: boolean;
    assetId: string;
  } | null>(null);
  const [pnl, setPnl] = useState<{ value: string; isProfit: boolean } | null>(null);
  const [liquidationPrice, setLiquidationPrice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const contractId = CONTRACT_IDS.rwaPerpeturalTrading;

  useEffect(() => {
    const fetchPosition = async () => {
      if (!contractId || positionId < 0 || !address) return;

      try {
        setIsLoading(true);

        const positionData = await callContract(
          contractId,
          "get_position",
          [toScVal(BigInt(positionId).toString(), 'u64')],
          address
        );

        if (!positionData || !positionData.isOpen) {
          setPosition(null);
          setIsLoading(false);
          return;
        }

        const entryPriceNum = Number(positionData.entryPrice) * Math.pow(10, positionData.entryExpo);

        setPosition({
          isLong: positionData.isLong,
          size: formatAmount(positionData.size),
          margin: formatAmount(positionData.margin),
          leverage: Number(positionData.leverage),
          entryPrice: entryPriceNum.toFixed(entryPriceNum < 1 ? 4 : 2),
          isOpen: positionData.isOpen,
          assetId: positionData.assetId,
        });

        // Fetch PnL
        try {
          const pnlData = await callContract(
            contractId,
            "get_position_pnl",
            [toScVal(BigInt(positionId).toString(), 'u64')],
            address
          );

          if (pnlData) {
            const [pnlValue, isProfit] = pnlData;
            const absPnl = pnlValue < BigInt(0) ? -pnlValue : pnlValue;
            setPnl({
              value: formatAmount(absPnl),
              isProfit,
            });
          }
        } catch {
          setPnl(null);
        }

        // Fetch liquidation price
        try {
          const liqPrice = await callContract(
            contractId,
            "get_liquidation_price",
            [toScVal(BigInt(positionId).toString(), 'u64')],
            address
          );

          if (liqPrice) {
            const liqPriceNum = Number(liqPrice) * Math.pow(10, positionData.entryExpo);
            setLiquidationPrice(liqPriceNum.toFixed(liqPriceNum < 1 ? 4 : 2));
          }
        } catch {
          setLiquidationPrice(null);
        }
      } catch (error) {
        console.error("[RWAPosition] Error fetching position:", error);
        setPosition(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosition();
    const interval = setInterval(fetchPosition, 10000);
    return () => clearInterval(interval);
  }, [contractId, positionId, address]);

  return { position, pnl, liquidationPrice, isLoading };
};

// ============ WebSocket-Based Price Hook (Real-Time) ============

export const useRWAPrice = (assetId: string) => {
  const fallback = FALLBACK_PRICES[assetId] || { price: "0", change24h: 0 };
  const [priceData, setPriceData] = useState<{ price: string; change24h: number }>(fallback);
  const [isLive, setIsLive] = useState(false);
  const asset = RWA_ASSETS.find((a) => a.id === assetId);

  useEffect(() => {
    if (!asset) return;

    const fallbackData = FALLBACK_PRICES[assetId];
    if (fallbackData) {
      setPriceData(fallbackData);
    }

    pythWS.connect().then(() => {
      console.log(`[Price WS] Subscribing to ${asset.symbol}`);
    }).catch(err => {
      console.warn("[Price WS] Connection failed, falling back to HTTP:", err);
    });

    const unsubscribe = pythWS.subscribe(asset.priceFeedId, (price: PythPrice) => {
      const normalizedPrice = price.normalizedPrice;
      setPriceData({
        price: normalizedPrice.toFixed(normalizedPrice < 1 ? 4 : 2),
        change24h: fallbackData?.change24h || 0,
      });
      setIsLive(true);
    });

    const fallbackTimeout = setTimeout(async () => {
      if (!isLive) {
        try {
          const feedId = asset.priceFeedId.replace("0x", "");
          const response = await fetch(
            `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${feedId}`
          );

          if (response.ok) {
            const data = await response.json();
            if (data.parsed && data.parsed.length > 0) {
              const priceInfo = data.parsed[0].price;
              const price = Number(priceInfo.price);
              const expo = priceInfo.expo;
              const normalizedPrice = price * Math.pow(10, expo);

              setPriceData({
                price: normalizedPrice.toFixed(normalizedPrice < 1 ? 4 : 2),
                change24h: fallbackData?.change24h || 0,
              });
              setIsLive(true);
            }
          }
        } catch {
          // Keep using fallback
        }
      }
    }, 1500);

    return () => {
      unsubscribe();
      clearTimeout(fallbackTimeout);
    };
  }, [asset, assetId, isLive]);

  return {
    price: priceData.price,
    change24h: priceData.change24h,
    isLive,
  };
};

// ============ Batch Positions Hook ============

export const useRWAPositions = (positionIds: bigint[]) => {
  const { address } = useStellarWallet();
  const [positions, setPositions] = useState<Map<bigint, RWAPosition>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  const contractId = CONTRACT_IDS.rwaPerpeturalTrading;

  useEffect(() => {
    const fetchAllPositions = async () => {
      if (!contractId || positionIds.length === 0 || !address) {
        setPositions(new Map());
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const positionsMap = new Map<bigint, RWAPosition>();

        for (const id of positionIds) {
          try {
            const positionData = await callContract(
              contractId,
              "get_position",
              [toScVal(id.toString(), 'u64')],
              address
            );

            if (!positionData || !positionData.isOpen) continue;

            const asset = getAssetByAssetId(positionData.assetId);
            const entryPriceNum = Number(positionData.entryPrice) * Math.pow(10, positionData.entryExpo);

            positionsMap.set(id, {
              positionId: Number(id),
              user: positionData.user,
              assetId: positionData.assetId,
              asset,
              isLong: positionData.isLong,
              size: formatAmount(positionData.size),
              margin: formatAmount(positionData.margin),
              leverage: positionData.leverage,
              entryPrice: positionData.entryPrice,
              entryExpo: positionData.entryExpo,
              entryTime: positionData.entryTime,
              isOpen: positionData.isOpen,
            });
          } catch {
            // Skip failed position fetch
          }
        }

        setPositions(positionsMap);
      } catch (error) {
        console.error("Error fetching positions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllPositions();
    const interval = setInterval(fetchAllPositions, 10000);
    return () => clearInterval(interval);
  }, [contractId, positionIds, address]);

  return { positions, isLoading };
};

// ============ Export ============

export { RWA_ASSETS };
