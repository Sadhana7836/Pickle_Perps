"use client";

import Image from "next/image";
import { type RWAAssetConfig, CATEGORY_CONFIG } from "@/lib/rwaAssets";
import { useRWAPerpetualTrading, useRWAPosition } from "@/hooks/useRWAPerpetualTrading";
import { useRWAPriceHistory } from "@/hooks/useRWAPriceHistory";
import { RWATradingPanel } from "./RWATradingPanel";
import {
  ArrowLeft,
  Star,
  Settings,
  GripHorizontal,
  Crosshair,
  TrendingUp as TrendLine,
  Square,
  Circle,
  Type,
  Smile,
  Pencil,
  MousePointer,
  Minus,
  Plus,
  RotateCcw,
  Camera,
  Expand,
  MoreHorizontal,
  Globe,
  TrendingUp,
  TrendingDown,
  Loader2,
} from "lucide-react";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";

// Position Card Component
function RWAPositionCard({
  positionId,
  asset,
  onClose
}: {
  positionId: number;
  asset: RWAAssetConfig;
  onClose: (positionId: number, priceFeedId: string) => Promise<void>;
}) {
  const { position, pnl, liquidationPrice, isLoading } = useRWAPosition(positionId);
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = async () => {
    if (confirm("Are you sure you want to close this position?")) {
      setIsClosing(true);
      try {
        await onClose(positionId, asset.priceFeedId);
      } catch (error) {
        console.error("Error closing position:", error);
      } finally {
        setIsClosing(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="bg-[var(--card-bg)] rounded-lg p-3 border border-[var(--card-border)]">
        <div className="flex items-center justify-center py-2">
          <Loader2 className="w-4 h-4 animate-spin text-[var(--text-muted)]" />
        </div>
      </div>
    );
  }

  if (!position || !position.isOpen) {
    console.log("[RWAPositionCard] Position", positionId, "not open or null:", position);
    return null;
  }

  // Filter: only show positions for this specific asset
  console.log("[RWAPositionCard] Comparing assetIds:", {
    positionAssetId: position.assetId,
    currentAssetId: asset.assetId,
    match: position.assetId.toLowerCase() === asset.assetId.toLowerCase()
  });

  if (position.assetId.toLowerCase() !== asset.assetId.toLowerCase()) {
    // Position is for a different asset - show nothing
    return null;
  }

  return (
    <div className="bg-[var(--card-bg)] rounded-lg p-3 border border-[var(--card-border)]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold ${position.isLong ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
            {position.isLong ? 'LONG' : 'SHORT'}
          </span>
          <span className="text-[#888] text-xs">{position.leverage}x</span>
        </div>
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">Size</span>
          <span className="text-[var(--foreground)]">${parseFloat(position.size).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">Margin</span>
          <span className="text-[var(--foreground)]">${parseFloat(position.margin).toFixed(4)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">Entry Price</span>
          <span className="text-[var(--foreground)]">${position.entryPrice}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">Liquidation Price</span>
          <span className="text-[var(--accent-red)]">${liquidationPrice || "N/A"}</span>
        </div>
        <div className="flex justify-between border-t border-[#222] pt-1.5 mt-1.5">
          <span className="text-[var(--text-muted)]">Unrealized PnL</span>
          {pnl ? (
            <span className={pnl.isProfit ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}>
              {pnl.isProfit ? '+' : '-'}${parseFloat(pnl.value).toFixed(4)}
            </span>
          ) : (
            <span className="text-[#888]">--</span>
          )}
        </div>
      </div>

      <button
        onClick={handleClose}
        disabled={isClosing}
        className="w-full mt-3 py-2 bg-[var(--accent-red)] hover:bg-[#ff5a67] disabled:opacity-50 text-[var(--foreground)] text-xs font-bold rounded transition-colors flex items-center justify-center gap-2"
      >
        {isClosing ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            Closing...
          </>
        ) : (
          'Close Position'
        )}
      </button>
    </div>
  );
}

interface RWADetailPageProps {
  asset: RWAAssetConfig;
  onBack: () => void;
}

// Drawing tools
const drawingTools = [
  { icon: MousePointer, name: "Select" },
  { icon: Crosshair, name: "Crosshair" },
  { icon: TrendLine, name: "Trend Line" },
  { icon: Minus, name: "Horizontal Line" },
  { icon: Square, name: "Rectangle" },
  { icon: Circle, name: "Circle" },
  { icon: Type, name: "Text" },
  { icon: Smile, name: "Emoji" },
  { icon: Pencil, name: "Draw" },
];

// RWA assets use Pyth oracle prices with real-time candle building

export function RWADetailPage({ asset, onBack }: RWADetailPageProps) {
  const { userPositionIds, closePosition } = useRWAPerpetualTrading();
  const category = CATEGORY_CONFIG[asset.category];

  const [activeTab, setActiveTab] = useState("Info");
  const [selectedTool, setSelectedTool] = useState("Select");
  const [priceMode, setPriceMode] = useState<"Price" | "MCap">("Price");
  const [currencyMode, setCurrencyMode] = useState<"USD" | "ETH">("USD");
  const [timeframe, setTimeframe] = useState("1m");
  const [chartType, setChartType] = useState<"candles" | "graph">("candles");

  // Use real-time Pyth price history for candle data
  // Pass symbol for Pyth Benchmarks API historical data
  const { candleData, currentPrice, isLoading, lastUpdate } = useRWAPriceHistory(
    asset.priceFeedId,
    timeframe,
    asset.symbol // Symbol for historical API (e.g., "XAU/USD", "EUR/USD")
  );

  // Format price for display
  const price = currentPrice > 0 ? currentPrice.toFixed(asset.category === "forex" ? 5 : 2) : "0.00";

  // Calculate 24h change (estimate based on first vs last candle if we have enough data)
  const change24h = useMemo(() => {
    if (candleData.length < 2) return 0;
    const firstPrice = candleData[0].open;
    const lastPrice = candleData[candleData.length - 1].close;
    return ((lastPrice - firstPrice) / firstPrice) * 100;
  }, [candleData]);

  const isLive = lastUpdate > 0 && Date.now() - lastUpdate < 10000;

  // Chart controls
  const [chartHeight, setChartHeight] = useState(450);
  const [visibleCandles, setVisibleCandles] = useState(80);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredCandle, setHoveredCandle] = useState<number | null>(null);

  const chartRef = useRef<HTMLDivElement>(null);

  // Calculate visible candle data
  const startIndex = Math.max(0, candleData.length - visibleCandles - scrollOffset);
  const endIndex = Math.min(candleData.length, startIndex + visibleCandles);
  const visibleData = candleData.slice(startIndex, endIndex);

  const maxPrice = visibleData.length > 0 ? Math.max(...visibleData.map(c => c.high)) : 0;
  const minPrice = visibleData.length > 0 ? Math.min(...visibleData.map(c => c.low)) : 0;
  // Use 10% of price as minimum range to avoid negative Y-axis values
  const calculatedRange = maxPrice - minPrice;
  const minRange = maxPrice > 0 ? maxPrice * 0.1 : 0.0001;
  const priceRange = calculatedRange > 0 ? calculatedRange : minRange;

  const currentCandle = visibleData.length > 0 ? visibleData[visibleData.length - 1] : null;
  const displayCandle = hoveredCandle !== null && visibleData[hoveredCandle] ? visibleData[hoveredCandle] : currentCandle;
  const priceChange = displayCandle ? ((displayCandle.close - displayCandle.open) / displayCandle.open * 100) : 0;

  // Format price based on asset type
  const formatPrice = (priceVal: number) => {
    if (asset.category === "forex") return priceVal.toFixed(5);
    if (priceVal >= 10000) return `${(priceVal / 1000).toFixed(1)}K`;
    if (priceVal >= 100) return priceVal.toFixed(2);
    if (priceVal >= 1) return priceVal.toFixed(2);
    return priceVal.toFixed(4);
  };

  // Format date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit' });
  };

  // Zoom handlers
  const handleZoomIn = () => setVisibleCandles(prev => Math.max(prev - 15, 20));
  const handleZoomOut = () => setVisibleCandles(prev => Math.min(prev + 15, 150));
  const handleResetZoom = () => {
    setVisibleCandles(80);
    setScrollOffset(0);
  };

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.shiftKey) {
      setScrollOffset(prev => {
        const newOffset = prev + (e.deltaY > 0 ? -3 : 3);
        return Math.max(0, Math.min(candleData.length - visibleCandles, newOffset));
      });
    } else {
      if (e.deltaY < 0) {
        setVisibleCandles(prev => Math.max(prev - 5, 15));
      } else {
        setVisibleCandles(prev => Math.min(prev + 5, 200));
      }
    }
  }, [visibleCandles, candleData.length]);

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const deltaX = e.clientX - dragStart.x;
      if (Math.abs(deltaX) > 3) {
        setScrollOffset(prev => {
          const change = deltaX > 0 ? 1 : -1;
          return Math.max(0, Math.min(candleData.length - visibleCandles, prev + change));
        });
        setDragStart({ x: e.clientX, y: dragStart.y });
      }
    }
    if (isResizing) {
      const deltaY = e.clientY - dragStart.y;
      setChartHeight(prev => Math.max(250, Math.min(700, prev + deltaY)));
      setDragStart({ x: dragStart.x, y: e.clientY });
    }
  }, [isDragging, isResizing, dragStart, visibleCandles, candleData.length]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  const candleWidth = Math.max(3, Math.floor((chartRef.current?.clientWidth || 800) / visibleCandles * 0.7));
  const candleGap = Math.max(1, candleWidth * 0.3);

  const isPositive = change24h >= 0;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--sidebar-bg)]">
      {/* Asset Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--card-bg)] bg-[var(--background)]">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 hover:bg-[var(--card-bg)] rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-[#888] hover:text-[var(--foreground)]" />
          </button>
          <div className="w-10 h-10 rounded-lg bg-[var(--card-bg)] flex items-center justify-center border border-[#333] overflow-hidden">
            <Image
              src={asset.image}
              alt={asset.name}
              width={32}
              height={32}
              className="object-contain"
              unoptimized
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[var(--foreground)] font-bold">{asset.name}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${category.bgColor} ${category.color}`}>
                {category.label}
              </span>
              <span className="text-[#ffd700] text-xs bg-[#ffd700]/10 px-1.5 py-0.5 rounded">RWA</span>
              <Globe className="w-3.5 h-3.5 text-[var(--text-muted)] hover:text-[var(--foreground)] cursor-pointer" />
              <Star className="w-3.5 h-3.5 text-[var(--text-muted)] hover:text-yellow-400 cursor-pointer" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#888] text-xs">{asset.symbol}</span>
              <span className="text-[#a855f7] text-xs">via Pyth Oracle</span>
              {!isLive && <span className="text-[#ff8c00] text-xs">(Demo)</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="flex items-center gap-2 justify-end">
              <p className="text-xl font-bold text-[var(--foreground)]">${price}</p>
              <div className={`flex items-center gap-0.5 ${isPositive ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
                {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span className="text-sm font-medium">{isPositive ? '+' : ''}{change24h.toFixed(2)}%</span>
              </div>
            </div>
            <p className="text-[#888] text-xs">24h Change</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div><span className="text-[var(--text-muted)]">24h High</span><p className="text-[var(--accent-green)]">${(parseFloat(price) * 1.02).toFixed(2)}</p></div>
            <div><span className="text-[var(--text-muted)]">24h Low</span><p className="text-[var(--accent-red)]">${(parseFloat(price) * 0.98).toFixed(2)}</p></div>
            <div><span className="text-[var(--text-muted)]">Max Lev</span><p className="text-[var(--foreground)]">{asset.maxLeverage}x</p></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chart Section */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chart Header Bar */}
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--card-bg)] bg-[var(--background)]">
            <div className="flex items-center gap-3">
              {/* Timeframe buttons */}
              <div className="flex items-center gap-0.5">
                {["1m", "5m", "15m", "1H", "4H", "1D", "1W"].map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-2 py-1 text-xs rounded ${
                      timeframe === tf ? "bg-[#2962ff] text-[var(--foreground)]" : "text-[#888] hover:text-[var(--foreground)] hover:bg-[var(--card-bg)]"
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
              <span className="text-[#333]">|</span>
              <div className="flex items-center bg-[var(--card-bg)] rounded text-xs">
                <button
                  onClick={() => setChartType("candles")}
                  className={`px-2 py-1 rounded-l flex items-center gap-1 ${chartType === "candles" ? "bg-[#2962ff] text-[var(--foreground)]" : "text-[#888]"}`}
                >
                  Candles
                </button>
                <button
                  onClick={() => setChartType("graph")}
                  className={`px-2 py-1 rounded-r flex items-center gap-1 ${chartType === "graph" ? "bg-[#2962ff] text-[var(--foreground)]" : "text-[#888]"}`}
                >
                  Graph
                </button>
              </div>
              <button className="text-[#888] hover:text-[var(--foreground)] text-xs">Indicators</button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-[var(--card-bg)] rounded text-xs">
                <button
                  onClick={() => setPriceMode("Price")}
                  className={`px-2 py-1 rounded-l ${priceMode === "Price" ? "bg-[#2962ff] text-[var(--foreground)]" : "text-[#888]"}`}
                >
                  Price
                </button>
                <button
                  onClick={() => setPriceMode("MCap")}
                  className={`px-2 py-1 rounded-r ${priceMode === "MCap" ? "bg-[#2962ff] text-[var(--foreground)]" : "text-[#888]"}`}
                >
                  MCap
                </button>
              </div>
              <div className="flex items-center bg-[var(--card-bg)] rounded text-xs">
                <button
                  onClick={() => setCurrencyMode("USD")}
                  className={`px-2 py-1 rounded-l ${currencyMode === "USD" ? "bg-[#2962ff] text-[var(--foreground)]" : "text-[#888]"}`}
                >
                  USD
                </button>
                <button
                  onClick={() => setCurrencyMode("ETH")}
                  className={`px-2 py-1 rounded-r ${currencyMode === "ETH" ? "bg-[#2962ff] text-[var(--foreground)]" : "text-[#888]"}`}
                >
                  ETH
                </button>
              </div>
              <Camera className="w-4 h-4 text-[var(--text-muted)] hover:text-[var(--foreground)] cursor-pointer" />
              <Settings className="w-4 h-4 text-[var(--text-muted)] hover:text-[var(--foreground)] cursor-pointer" />
            </div>
          </div>

          {/* OHLC Info Bar */}
          <div className="flex items-center gap-4 px-3 py-1 border-b border-[var(--card-bg)] bg-[var(--sidebar-bg)] text-xs">
            <span className="text-[#888]">{asset.symbol} • {timeframe} • Pyth Oracle</span>
            {displayCandle && (
              <>
                <span className="text-[#888]">O<span className="text-[var(--foreground)] ml-1">{formatPrice(displayCandle.open)}</span></span>
                <span className="text-[#888]">H<span className="text-[var(--accent-green)] ml-1">{formatPrice(displayCandle.high)}</span></span>
                <span className="text-[#888]">L<span className="text-[var(--accent-red)] ml-1">{formatPrice(displayCandle.low)}</span></span>
                <span className="text-[#888]">C<span className="text-[var(--foreground)] ml-1">{formatPrice(displayCandle.close)}</span></span>
                <span className={priceChange >= 0 ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"}>
                  {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)}%
                </span>
              </>
            )}
            <span className="text-[#888] ml-auto">Vol<span className="text-[var(--foreground)] ml-1">{displayCandle ? `$${(displayCandle.volume / 1000000).toFixed(1)}M` : "0"}</span></span>
          </div>

          {/* Chart Container */}
          <div className="flex-1 flex">
            {/* Drawing Tools Sidebar */}
            <div className="w-10 bg-[var(--background)] border-r border-[var(--card-bg)] flex flex-col items-center py-2 gap-1">
              {drawingTools.map((tool) => (
                <button
                  key={tool.name}
                  onClick={() => setSelectedTool(tool.name)}
                  className={`p-2 rounded hover:bg-[var(--card-bg)] transition-colors ${
                    selectedTool === tool.name ? "bg-[var(--card-bg)] text-[var(--foreground)]" : "text-[var(--text-muted)]"
                  }`}
                  title={tool.name}
                >
                  <tool.icon className="w-4 h-4" />
                </button>
              ))}
              <div className="flex-1" />
              <button className="p-2 rounded hover:bg-[var(--card-bg)] text-[var(--text-muted)]" title="More">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>

            {/* Main Chart Area */}
            <div className="flex-1 flex flex-col">
              <div
                ref={chartRef}
                className="flex-1 relative bg-[var(--sidebar-bg)] select-none overflow-hidden"
                style={{ height: chartHeight }}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
              >
                {/* Grid */}
                <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }}>
                  {[...Array(8)].map((_, i) => (
                    <line key={`h-${i}`} x1="40" y1={`${(i / 7) * 85 + 5}%`} x2="100%" y2={`${(i / 7) * 85 + 5}%`} stroke="var(--card-bg)" strokeWidth="1" />
                  ))}
                  {visibleData.filter((_, i) => i % 10 === 0).map((_, i) => (
                    <line key={`v-${i}`} x1={`${40 + (i * 10 / visibleData.length) * (100 - 8)}%`} y1="5%" x2={`${40 + (i * 10 / visibleData.length) * (100 - 8)}%`} y2="90%" stroke="var(--card-bg)" strokeWidth="1" />
                  ))}
                </svg>

                {/* Price Scale (Right) */}
                <div className="absolute right-0 top-0 bottom-12 w-16 bg-[var(--background)] border-l border-[var(--card-bg)] flex flex-col justify-between py-4 text-[10px] text-[#888] z-10">
                  {[...Array(8)].map((_, i) => (
                    <span key={i} className="text-right pr-2">{formatPrice(maxPrice - (priceRange * i / 7))}</span>
                  ))}
                </div>

                {/* Current Price Line */}
                {currentCandle && (
                  <div
                    className="absolute left-10 right-16 border-t border-dashed z-10"
                    style={{
                      top: `${5 + ((maxPrice - currentCandle.close) / priceRange) * 85}%`,
                      borderColor: currentCandle.close >= currentCandle.open ? 'var(--accent-green)' : '#ff4757',
                    }}
                  >
                    <span
                      className="absolute right-0 -top-2.5 text-[10px] px-2 py-0.5 rounded text-[var(--foreground)] font-medium"
                      style={{ backgroundColor: currentCandle.close >= currentCandle.open ? 'var(--accent-green)' : '#ff4757' }}
                    >
                      {formatPrice(currentCandle.close)}
                    </span>
                  </div>
                )}

                {/* Chart Content */}
                {isLoading || visibleData.length === 0 ? (
                  <div className="absolute left-10 right-16 top-[5%] flex items-center justify-center" style={{ height: '75%' }}>
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-[var(--text-muted)] mx-auto mb-2" />
                      <p className="text-[#888] text-sm">
                        {isLoading ? "Connecting to Pyth Oracle..." : "Waiting for price data..."}
                      </p>
                      <p className="text-[var(--text-muted)] text-xs mt-1">Candles will build as prices stream in</p>
                    </div>
                  </div>
                ) : chartType === "candles" ? (
                  <div
                    className="absolute left-10 right-16 top-[5%] flex items-end"
                    style={{ height: '75%', cursor: isDragging ? 'grabbing' : 'crosshair' }}
                  >
                    {visibleData.map((candle, i) => {
                      const isGreen = candle.close >= candle.open;
                      const bodyHeight = Math.abs(candle.close - candle.open) / priceRange * 100;
                      const wickTop = (maxPrice - candle.high) / priceRange * 100;
                      const bodyTop = (maxPrice - Math.max(candle.open, candle.close)) / priceRange * 100;
                      const wickHeight = (candle.high - candle.low) / priceRange * 100;

                      return (
                        <div
                          key={i}
                          className="relative h-full flex-shrink-0"
                          style={{ width: candleWidth + candleGap }}
                          onMouseEnter={() => setHoveredCandle(i)}
                          onMouseLeave={() => setHoveredCandle(null)}
                        >
                          <div
                            className="absolute left-1/2 -translate-x-1/2"
                            style={{ width: 1, top: `${wickTop}%`, height: `${wickHeight}%`, backgroundColor: isGreen ? 'var(--accent-green)' : '#ff4757' }}
                          />
                          <div
                            className="absolute left-1/2 -translate-x-1/2 rounded-[1px]"
                            style={{
                              width: candleWidth,
                              top: `${bodyTop}%`,
                              height: `${Math.max(bodyHeight, 0.3)}%`,
                              backgroundColor: isGreen ? 'var(--accent-green)' : '#ff4757',
                              boxShadow: hoveredCandle === i ? `0 0 8px ${isGreen ? 'var(--accent-green)' : '#ff4757'}40` : 'none',
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="absolute left-10 right-16 top-[5%]" style={{ height: '75%', cursor: isDragging ? 'grabbing' : 'crosshair' }}>
                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="rwaGraphGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="var(--accent-green)" stopOpacity="0.4" />
                          <stop offset="50%" stopColor="var(--accent-green)" stopOpacity="0.15" />
                          <stop offset="100%" stopColor="var(--accent-green)" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path
                        d={(() => {
                          const points = visibleData.map((candle, i) => ({
                            x: (i / (visibleData.length - 1)) * 100,
                            y: ((maxPrice - candle.close) / priceRange) * 100
                          }));
                          let path = `M ${points[0]?.x || 0} ${points[0]?.y || 50}`;
                          for (let i = 1; i < points.length; i++) {
                            const prev = points[i - 1];
                            const curr = points[i];
                            const cpx = (prev.x + curr.x) / 2;
                            path += ` Q ${cpx} ${prev.y} ${curr.x} ${curr.y}`;
                          }
                          path += ` L 100 100 L 0 100 Z`;
                          return path;
                        })()}
                        fill="url(#rwaGraphGradient)"
                      />
                      <path
                        d={(() => {
                          const points = visibleData.map((candle, i) => ({
                            x: (i / (visibleData.length - 1)) * 100,
                            y: ((maxPrice - candle.close) / priceRange) * 100
                          }));
                          let path = `M ${points[0]?.x || 0} ${points[0]?.y || 50}`;
                          for (let i = 1; i < points.length; i++) {
                            const prev = points[i - 1];
                            const curr = points[i];
                            const cpx = (prev.x + curr.x) / 2;
                            path += ` Q ${cpx} ${prev.y} ${curr.x} ${curr.y}`;
                          }
                          return path;
                        })()}
                        fill="none"
                        stroke="var(--accent-green)"
                        strokeWidth="0.4"
                        vectorEffect="non-scaling-stroke"
                        style={{ strokeWidth: '2px' }}
                      />
                    </svg>
                  </div>
                )}

                {/* Time Scale (Bottom) */}
                <div className="absolute left-10 right-16 bottom-0 h-6 flex items-center border-t border-[var(--card-bg)] bg-[var(--background)]">
                  {visibleData.filter((_, i) => i % Math.floor(visibleData.length / 6) === 0).map((candle, i) => (
                    <span key={i} className="text-[10px] text-[#888] absolute" style={{ left: `${(i * Math.floor(visibleData.length / 6) / visibleData.length) * 100}%` }}>
                      {formatDate(candle.time)}
                    </span>
                  ))}
                </div>

                {/* Zoom Controls */}
                <div className="absolute right-20 bottom-14 flex items-center gap-1 bg-[var(--card-bg)] rounded-lg p-1 z-10">
                  <button onClick={handleZoomOut} className="p-1 hover:bg-[var(--hover-bg)] rounded" title="Zoom Out"><Minus className="w-3 h-3 text-[#888]" /></button>
                  <button onClick={handleResetZoom} className="p-1 hover:bg-[var(--hover-bg)] rounded" title="Reset"><RotateCcw className="w-3 h-3 text-[#888]" /></button>
                  <button onClick={handleZoomIn} className="p-1 hover:bg-[var(--hover-bg)] rounded" title="Zoom In"><Plus className="w-3 h-3 text-[#888]" /></button>
                </div>

                <button className="absolute right-20 top-2 p-1.5 bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] rounded z-10">
                  <Expand className="w-3.5 h-3.5 text-[#888]" />
                </button>
              </div>

              {/* Resize Handle */}
              <div onMouseDown={handleResizeStart} className="h-1.5 bg-[var(--background)] border-y border-[var(--card-bg)] cursor-row-resize flex items-center justify-center hover:bg-[var(--card-bg)] transition-colors">
                <GripHorizontal className="w-4 h-4 text-[#333]" />
              </div>
            </div>
          </div>

          {/* Bottom Tabs */}
          <div className="flex-1 flex flex-col min-h-0 border-t border-[var(--card-bg)] max-h-[200px]">
            <div className="flex items-center gap-4 px-4 py-2 border-b border-[var(--card-bg)] bg-[var(--background)]">
              {["Positions", "Info", "Market Data"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`text-xs pb-1 ${activeTab === tab ? "text-[var(--foreground)] border-b-2 border-[#2962ff]" : "text-[var(--text-muted)] hover:text-[var(--foreground)]"}`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto">
              {activeTab === "Positions" && (
                <div className="p-4">
                  {userPositionIds.length > 0 ? (
                    <div className="space-y-3">
                      <div className="text-[#888] text-xs mb-2">
                        {userPositionIds.length} position{userPositionIds.length !== 1 ? 's' : ''} found
                      </div>
                      {userPositionIds.map((id) => (
                        <RWAPositionCard
                          key={Number(id)}
                          positionId={Number(id)}
                          asset={asset}
                          onClose={closePosition}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full py-8">
                      <div className="text-[var(--text-muted)] text-sm mb-2">Your {asset.name} Positions</div>
                      <div className="text-[#888] text-xs">No open positions on this asset</div>
                    </div>
                  )}
                </div>
              )}
              {activeTab === "Info" && (
                <div className="p-4 text-xs space-y-2">
                  <div className="flex justify-between"><span className="text-[var(--text-muted)]">Asset Type</span><span className={category.color}>{category.label}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--text-muted)]">Symbol</span><span className="text-[var(--foreground)]">{asset.symbol}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--text-muted)]">Oracle</span><span className="text-[#a855f7]">Pyth Network</span></div>
                  <div className="flex justify-between"><span className="text-[var(--text-muted)]">Max Leverage</span><span className="text-[var(--foreground)]">{asset.maxLeverage}x</span></div>
                  <div className="flex justify-between"><span className="text-[var(--text-muted)]">Trading Fee</span><span className="text-[var(--foreground)]">0.1%</span></div>
                  <div className="mt-3 pt-3 border-t border-[var(--card-bg)]">
                    <p className="text-[#888]">{asset.description}</p>
                  </div>
                </div>
              )}
              {activeTab === "Market Data" && (
                <div className="p-4 text-xs space-y-2">
                  <div className="flex justify-between"><span className="text-[var(--text-muted)]">Current Price</span><span className="text-[var(--foreground)]">${price}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--text-muted)]">24h Change</span><span className={isPositive ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"}>{isPositive ? '+' : ''}{change24h.toFixed(2)}%</span></div>
                  <div className="flex justify-between"><span className="text-[var(--text-muted)]">Price Source</span><span className="text-[#a855f7]">Pyth Oracle</span></div>
                  <div className="flex justify-between"><span className="text-[var(--text-muted)]">Update Frequency</span><span className="text-[var(--foreground)]">Real-time</span></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Trading Panel */}
        <div className="w-[340px] border-l border-[var(--card-bg)] flex flex-col bg-[var(--background)] overflow-y-auto">
          <RWATradingPanel asset={asset} />
        </div>
      </div>
    </div>
  );
}
