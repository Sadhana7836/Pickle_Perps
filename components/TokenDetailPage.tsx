"use client";

import { TokenData } from "./TokenCard";
import {
  ArrowLeft,
  ExternalLink,
  Star,
  Settings,
  Globe,
  Send,
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
} from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";
import { IPFSImage } from "./IPFSImage";
import { usePerpetualTrading } from "@/hooks/usePerpetualTrading";
import { useSubgraphPriceHistory } from "@/hooks/useSubgraphPriceHistory";
import { useBondingCurve } from "@/hooks/useBondingCurve";
import { useStellarWallet } from "@/contexts/StellarContext";
import { BondingCurvePanel } from "./BondingCurvePanel";
import { TradingPanel } from "./TradingPanel";
import { PositionsList } from "./PositionsList";

interface TokenDetailPageProps {
  token: TokenData;
  onBack: () => void;
}

// Note: Chart data is now fetched from blockchain events in real-time

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

export function TokenDetailPage({ token, onBack }: TokenDetailPageProps) {
  const { address } = useStellarWallet();
  const { userPositionIds, actions, refetch } = usePerpetualTrading();
  const { data: curveData } = useBondingCurve(token.id);
  const [tradingMode, setTradingMode] = useState<"spot" | "perps">(
    curveData?.isListed ? "spot" : "perps"
  );
  const [activeTab, setActiveTab] = useState("Trades");
  
  // Refresh positions when tab changes or after position is opened
  useEffect(() => {
    if (activeTab === "Positions" && address) {
      refetch();
    }
  }, [activeTab, address, refetch]);
  const [selectedTool, setSelectedTool] = useState("Select");
  const [priceMode, setPriceMode] = useState<"Price" | "MCap">("Price");
  const [currencyMode, setCurrencyMode] = useState<"USD" | "XLM">("USD");
  const [timeframe, setTimeframe] = useState("1D");
  const [chartType, setChartType] = useState<"candles" | "graph">("candles");

  // Fetch price data from subgraph with live polling (every 3 seconds)
  const {
    candleData,
    recentTrades,
    currentPrice: livePrice,
    isLoading: isLoadingChart,
    lastUpdate,
  } = useSubgraphPriceHistory(token.id, timeframe, 3000);

  // Suppress unused variable warnings - available for future use
  void recentTrades;
  void livePrice;
  void lastUpdate;

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
  const startIndex = Math.max(0, (candleData?.length || 0) - visibleCandles - scrollOffset);
  const endIndex = Math.min(candleData?.length || 0, startIndex + visibleCandles);
  const visibleData = (candleData || []).slice(startIndex, endIndex);

  const maxPrice = visibleData.length > 0 ? Math.max(...visibleData.map(c => c.high)) : 0;
  const minPrice = visibleData.length > 0 ? Math.min(...visibleData.map(c => c.low)) : 0;
  // Use 10% of price as minimum range to avoid negative Y-axis with flat prices
  const calculatedRange = maxPrice - minPrice;
  const minRange = maxPrice > 0 ? maxPrice * 0.1 : 0.0001; // 10% of price or small fallback
  const priceRange = calculatedRange > 0 ? calculatedRange : minRange;

  const currentCandle = visibleData.length > 0 ? visibleData[visibleData.length - 1] : null;
  const displayCandle = hoveredCandle !== null && visibleData[hoveredCandle] ? visibleData[hoveredCandle] : currentCandle;
  const priceChange = displayCandle ? ((displayCandle.close - displayCandle.open) / displayCandle.open * 100) : 0;

  // Format price
  const formatPrice = (price: number) => {
    if (price >= 1000) return `${(price / 1000).toFixed(1)}K`;
    if (price >= 1) return price.toFixed(2);
    return price.toFixed(6);
  };

  // Format date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Zoom handlers
  const handleZoomIn = () => setVisibleCandles(prev => Math.max(prev - 15, 20));
  const handleZoomOut = () => setVisibleCandles(prev => Math.min(prev + 15, 150));
  const handleResetZoom = () => {
    setVisibleCandles(80);
    setScrollOffset(0);
  };

  // Mouse wheel zoom - scroll to zoom, shift+scroll to pan
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.shiftKey) {
      // Shift + scroll = pan through history
      setScrollOffset(prev => {
        const newOffset = prev + (e.deltaY > 0 ? -3 : 3);
        return Math.max(0, Math.min((candleData?.length || 0) - visibleCandles, newOffset));
      });
    } else {
      // Regular scroll = zoom in/out
      if (e.deltaY < 0) {
        // Scroll up = zoom in (fewer candles, bigger)
        setVisibleCandles(prev => Math.max(prev - 5, 15));
      } else {
        // Scroll down = zoom out (more candles, smaller)
        setVisibleCandles(prev => Math.min(prev + 5, 200));
      }
    }
  }, [visibleCandles, candleData?.length]);

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
          return Math.max(0, Math.min((candleData?.length || 0) - visibleCandles, prev + change));
        });
        setDragStart({ x: e.clientX, y: dragStart.y });
      }
    }
    if (isResizing) {
      const deltaY = e.clientY - dragStart.y;
      setChartHeight(prev => Math.max(250, Math.min(700, prev + deltaY)));
      setDragStart({ x: dragStart.x, y: e.clientY });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging, isResizing, dragStart, visibleCandles]);

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

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--sidebar-bg)]">
      {/* Token Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--card-bg)] bg-[var(--background)]">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 hover:bg-[var(--card-bg)] rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-[#888] hover:text-[var(--foreground)]" />
          </button>
          <div className="w-8 h-8 rounded-lg overflow-hidden bg-[var(--card-bg)] flex items-center justify-center">
            {token.image ? (
              <IPFSImage src={token.image} alt={token.name} width={32} height={32} className="w-full h-full object-cover" fallback={<span className="text-xl">🪙</span>} />
            ) : (
              <span className="text-xl">🪙</span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[var(--foreground)] font-bold">{token.name}</span>
              <span className="text-[var(--accent-green)] text-xs bg-[var(--accent-green)]/10 px-1.5 py-0.5 rounded">PERP</span>
              <button
                onClick={() => window.open(`https://stellar.expert/explorer/testnet/contract/${token.id}`, '_blank', 'noopener,noreferrer')}
                className="hover:bg-[var(--card-bg)] p-0.5 rounded transition-colors"
                title="View on Block Explorer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[var(--text-muted)] hover:text-[var(--foreground)] cursor-pointer" />
              </button>
              {token.websiteUrl && (
                <button
                  onClick={() => window.open(token.websiteUrl, '_blank', 'noopener,noreferrer')}
                  className="hover:bg-[var(--card-bg)] p-0.5 rounded transition-colors"
                  title="Website"
                >
                  <Globe className="w-3.5 h-3.5 text-[var(--text-muted)] hover:text-[#00bfff] cursor-pointer" />
                </button>
              )}
              {token.twitterUrl && (
                <button
                  onClick={() => {
                    const url = token.twitterUrl!.startsWith('http')
                      ? token.twitterUrl
                      : `https://x.com/${token.twitterUrl!.replace(/^@/, '')}`;
                    window.open(url, '_blank', 'noopener,noreferrer');
                  }}
                  className="hover:bg-[var(--card-bg)] p-0.5 rounded transition-colors"
                  title="X"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="w-3.5 h-3.5 text-[var(--text-muted)] hover:text-[var(--foreground)]"
                    fill="currentColor"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </button>
              )}
              {token.telegramUrl && (
                <button
                  onClick={() => {
                    const url = token.telegramUrl!.startsWith('http')
                      ? token.telegramUrl
                      : `https://t.me/${token.telegramUrl!.replace(/^@/, '')}`;
                    window.open(url, '_blank', 'noopener,noreferrer');
                  }}
                  className="hover:bg-[var(--card-bg)] p-0.5 rounded transition-colors"
                  title="Telegram"
                >
                  <Send className="w-3.5 h-3.5 text-[var(--text-muted)] hover:text-[#0088cc] cursor-pointer" />
                </button>
              )}
              <Star className="w-3.5 h-3.5 text-[var(--text-muted)] hover:text-yellow-400 cursor-pointer" />
            </div>
            <span className="text-[#888] text-xs">{token.symbol}</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-xl font-bold text-[var(--foreground)]">{token.price || "Price TBD"}</p>
            <p className="text-[#888] text-xs">Price set on first trade</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div><span className="text-[var(--text-muted)]">24h High</span><p className="text-[var(--foreground)]">--</p></div>
            <div><span className="text-[var(--text-muted)]">24h Low</span><p className="text-[var(--foreground)]">--</p></div>
            <div><span className="text-[var(--text-muted)]">24h Vol</span><p className="text-[var(--foreground)]">--</p></div>
            <div><span className="text-[var(--text-muted)]">MC</span><p className="text-[var(--accent-green)]">{token.marketCap}</p></div>
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
            </div>

            <div className="flex items-center gap-2">
              {/* Price/MCap toggle */}
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
              {/* Currency toggle */}
              <div className="flex items-center bg-[var(--card-bg)] rounded text-xs">
                <button
                  onClick={() => setCurrencyMode("USD")}
                  className={`px-2 py-1 rounded-l ${currencyMode === "USD" ? "bg-[#2962ff] text-[var(--foreground)]" : "text-[#888]"}`}
                >
                  USD
                </button>
                <button
                  onClick={() => setCurrencyMode("XLM")}
                  className={`px-2 py-1 rounded-r ${currencyMode === "XLM" ? "bg-[#2962ff] text-[var(--foreground)]" : "text-[#888]"}`}
                >
                  XLM
                </button>
              </div>
              <Camera className="w-4 h-4 text-[var(--text-muted)] hover:text-[var(--foreground)] cursor-pointer" />
              <Settings className="w-4 h-4 text-[var(--text-muted)] hover:text-[var(--foreground)] cursor-pointer" />
            </div>
          </div>

          {/* OHLC Info Bar */}
          <div className="flex items-center gap-4 px-3 py-1 border-b border-[var(--card-bg)] bg-[var(--sidebar-bg)] text-xs">
            <span className="text-[#888]">{token.name}/USD • {timeframe} • PicklePerps</span>
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
            <span className="text-[#888] ml-auto">Vol<span className="text-[var(--foreground)] ml-1">{displayCandle ? formatPrice(displayCandle.volume) : "0"}</span></span>
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
                  {/* Horizontal grid lines */}
                  {[...Array(8)].map((_, i) => (
                    <line
                      key={`h-${i}`}
                      x1="40"
                      y1={`${(i / 7) * 85 + 5}%`}
                      x2="100%"
                      y2={`${(i / 7) * 85 + 5}%`}
                      stroke="var(--card-bg)"
                      strokeWidth="1"
                    />
                  ))}
                  {/* Vertical grid lines */}
                  {visibleData.filter((_, i) => i % 10 === 0).map((candle, i) => (
                    <line
                      key={`v-${i}`}
                      x1={`${40 + (i * 10 / visibleData.length) * (100 - 8)}%`}
                      y1="5%"
                      x2={`${40 + (i * 10 / visibleData.length) * (100 - 8)}%`}
                      y2="90%"
                      stroke="var(--card-bg)"
                      strokeWidth="1"
                    />
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

                {/* Loading State */}
                {isLoadingChart && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[var(--sidebar-bg)]/80 z-20">
                    <div className="text-[#888] text-sm">Loading chart data...</div>
                  </div>
                )}

                {/* Empty State */}
                {!isLoadingChart && (!candleData || candleData.length === 0) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[var(--sidebar-bg)]/80 z-20">
                    <div className="text-center">
                      <div className="text-[#888] text-sm mb-2">No trading data available</div>
                      <div className="text-[var(--text-muted)] text-xs">Price data will appear after first trade</div>
                    </div>
                  </div>
                )}

                {/* Chart Content - Candlesticks or Line */}
                {!isLoadingChart && candleData && candleData.length > 0 && (
                  chartType === "candles" ? (
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
                            {/* Wick */}
                            <div
                              className="absolute left-1/2 -translate-x-1/2"
                              style={{
                                width: 1,
                                top: `${wickTop}%`,
                                height: `${wickHeight}%`,
                                backgroundColor: isGreen ? 'var(--accent-green)' : '#ff4757',
                              }}
                            />
                            {/* Body */}
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
                    <div
                      className="absolute left-10 right-16 top-[5%]"
                      style={{ height: '75%', cursor: isDragging ? 'grabbing' : 'crosshair' }}
                    >
                      {(() => {
                        // Calculate points with proper scaling
                        const chartWidth = 1000;
                        const chartHeight = 100;
                        const padding = 2;

                        // Interpolate data to always have enough points for smooth curves
                        const interpolateData = (data: typeof visibleData) => {
                          if (data.length === 0) return [];
                          if (data.length >= 20) return data;

                          // For few points, interpolate to create smooth curve
                          const result: typeof data = [];
                          const targetPoints = Math.max(40, data.length * 8);

                          for (let i = 0; i < targetPoints; i++) {
                            const t = i / (targetPoints - 1);
                            const scaledIndex = t * (data.length - 1);
                            const lowerIndex = Math.floor(scaledIndex);
                            const upperIndex = Math.min(lowerIndex + 1, data.length - 1);
                            const fraction = scaledIndex - lowerIndex;

                            const lower = data[lowerIndex];
                            const upper = data[upperIndex];

                            // Smooth interpolation using cosine
                            const smoothFraction = (1 - Math.cos(fraction * Math.PI)) / 2;

                            result.push({
                              time: lower.time + (upper.time - lower.time) * fraction,
                              open: lower.open + (upper.open - lower.open) * smoothFraction,
                              high: lower.high + (upper.high - lower.high) * smoothFraction,
                              low: lower.low + (upper.low - lower.low) * smoothFraction,
                              close: lower.close + (upper.close - lower.close) * smoothFraction,
                              volume: lower.volume + (upper.volume - lower.volume) * smoothFraction,
                            });
                          }
                          return result;
                        };

                        const effectiveData = interpolateData(visibleData);

                        const points = effectiveData.map((candle, i) => ({
                          x: padding + (i / Math.max(effectiveData.length - 1, 1)) * (chartWidth - padding * 2),
                          y: padding + ((maxPrice - candle.close) / priceRange) * (chartHeight - padding * 2)
                        }));

                        // Always generate smooth curves using Catmull-Rom splines
                        const generateLinePath = () => {
                          if (points.length === 0) return '';
                          if (points.length === 1) {
                            // Single point - draw a slight curve
                            const y = points[0].y;
                            return `M ${padding} ${y} Q ${chartWidth / 2} ${y} ${chartWidth - padding} ${y}`;
                          }

                          let path = `M ${points[0].x} ${points[0].y}`;

                          for (let i = 0; i < points.length - 1; i++) {
                            const p0 = points[Math.max(0, i - 1)];
                            const p1 = points[i];
                            const p2 = points[i + 1];
                            const p3 = points[Math.min(points.length - 1, i + 2)];

                            // Catmull-Rom to Bezier conversion with higher tension for smoother curves
                            const tension = 0.5;
                            const cp1x = p1.x + (p2.x - p0.x) * tension;
                            const cp1y = p1.y + (p2.y - p0.y) * tension;
                            const cp2x = p2.x - (p3.x - p1.x) * tension;
                            const cp2y = p2.y - (p3.y - p1.y) * tension;

                            path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
                          }

                          return path;
                        };

                        const generateAreaPath = () => {
                          if (points.length === 0) return '';

                          const linePath = generateLinePath();
                          if (!linePath) return '';
                          const lastPoint = points[points.length - 1];
                          const firstPoint = points[0];
                          return `${linePath} L ${lastPoint.x} ${chartHeight} L ${firstPoint.x} ${chartHeight} Z`;
                        };

                        const linePath = generateLinePath();
                        const areaPath = generateAreaPath();

                        // Determine if overall trend is up or down
                        const isUpTrend = visibleData.length > 1
                          ? visibleData[visibleData.length - 1].close >= visibleData[0].close
                          : true; // Default to green for single point
                        const lineColor = isUpTrend ? 'var(--accent-green)' : '#ff4757';

                        return (
                          <>
                            <svg
                              className="w-full h-full"
                              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                              preserveAspectRatio="none"
                            >
                              <defs>
                                <linearGradient id="graphGradientUp" x1="0%" y1="0%" x2="0%" y2="100%">
                                  <stop offset="0%" stopColor="var(--accent-green)" stopOpacity="0.3" />
                                  <stop offset="50%" stopColor="var(--accent-green)" stopOpacity="0.1" />
                                  <stop offset="100%" stopColor="var(--accent-green)" stopOpacity="0" />
                                </linearGradient>
                                <linearGradient id="graphGradientDown" x1="0%" y1="0%" x2="0%" y2="100%">
                                  <stop offset="0%" stopColor="#ff4757" stopOpacity="0.3" />
                                  <stop offset="50%" stopColor="#ff4757" stopOpacity="0.1" />
                                  <stop offset="100%" stopColor="#ff4757" stopOpacity="0" />
                                </linearGradient>
                              </defs>
                              {/* Area fill */}
                              {areaPath && (
                                <path
                                  d={areaPath}
                                  fill={isUpTrend ? "url(#graphGradientUp)" : "url(#graphGradientDown)"}
                                />
                              )}
                              {/* Line */}
                              {linePath && (
                                <path
                                  d={linePath}
                                  fill="none"
                                  stroke={lineColor}
                                  strokeWidth="2"
                                  vectorEffect="non-scaling-stroke"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              )}
                            </svg>
                            {/* Hover detection layer */}
                            <div className="absolute inset-0 flex">
                              {visibleData.map((_, i) => (
                                <div
                                  key={i}
                                  className="flex-1 h-full"
                                  onMouseEnter={() => setHoveredCandle(i)}
                                  onMouseLeave={() => setHoveredCandle(null)}
                                />
                              ))}
                            </div>
                            {/* Hover dot and crosshair */}
                            {hoveredCandle !== null && visibleData[hoveredCandle] && (
                              <>
                                {/* Vertical line */}
                                <div
                                  className="absolute top-0 bottom-0 w-px bg-[#333] pointer-events-none"
                                  style={{
                                    left: `${(hoveredCandle / Math.max(visibleData.length - 1, 1)) * 100}%`,
                                  }}
                                />
                                {/* Horizontal line */}
                                <div
                                  className="absolute left-0 right-0 h-px bg-[#333] pointer-events-none"
                                  style={{
                                    top: `${((maxPrice - visibleData[hoveredCandle].close) / priceRange) * 100}%`,
                                  }}
                                />
                                {/* Dot */}
                                <div
                                  className="absolute w-3 h-3 rounded-full border-2 border-white shadow-lg pointer-events-none"
                                  style={{
                                    left: `${(hoveredCandle / Math.max(visibleData.length - 1, 1)) * 100}%`,
                                    top: `${((maxPrice - visibleData[hoveredCandle].close) / priceRange) * 100}%`,
                                    transform: 'translate(-50%, -50%)',
                                    backgroundColor: lineColor,
                                  }}
                                />
                              </>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )
                )}

                {/* Time Scale (Bottom) */}
                <div className="absolute left-10 right-16 bottom-0 h-6 flex items-center border-t border-[var(--card-bg)] bg-[var(--background)]">
                  {visibleData.filter((_, i) => i % Math.floor(visibleData.length / 6) === 0).map((candle, i) => (
                    <span
                      key={i}
                      className="text-[10px] text-[#888] absolute"
                      style={{ left: `${(i * Math.floor(visibleData.length / 6) / visibleData.length) * 100}%` }}
                    >
                      {formatDate(candle.time)}
                    </span>
                  ))}
                </div>

                {/* Zoom Controls */}
                <div className="absolute right-20 bottom-14 flex items-center gap-1 bg-[var(--card-bg)] rounded-lg p-1 z-10">
                  <button onClick={handleZoomOut} className="p-1 hover:bg-[var(--hover-bg)] rounded" title="Zoom Out">
                    <Minus className="w-3 h-3 text-[#888]" />
                  </button>
                  <button onClick={handleResetZoom} className="p-1 hover:bg-[var(--hover-bg)] rounded" title="Reset">
                    <RotateCcw className="w-3 h-3 text-[#888]" />
                  </button>
                  <button onClick={handleZoomIn} className="p-1 hover:bg-[var(--hover-bg)] rounded" title="Zoom In">
                    <Plus className="w-3 h-3 text-[#888]" />
                  </button>
                </div>

                {/* Fullscreen button */}
                <button className="absolute right-20 top-2 p-1.5 bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] rounded z-10">
                  <Expand className="w-3.5 h-3.5 text-[#888]" />
                </button>
              </div>

              {/* Resize Handle */}
              <div
                onMouseDown={handleResizeStart}
                className="h-1.5 bg-[var(--background)] border-y border-[var(--card-bg)] cursor-row-resize flex items-center justify-center hover:bg-[var(--card-bg)] transition-colors"
              >
                <GripHorizontal className="w-4 h-4 text-[#333]" />
              </div>
            </div>
          </div>

          {/* Bottom Tabs */}
          <div className="flex-1 flex flex-col min-h-0 border-t border-[var(--card-bg)] max-h-[200px]">
            <div className="flex items-center gap-4 px-4 py-2 border-b border-[var(--card-bg)] bg-[var(--background)]">
              {["Trades", "Positions", "Top Traders", "Order Book", "Info"].map((tab) => (
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
              {activeTab === "Trades" && (
                <div className="flex flex-col items-center justify-center h-full py-8">
                  <div className="text-[var(--text-muted)] text-sm mb-2">Recent Trades</div>
                  <div className="text-[#888] text-xs">Trade history will appear here after positions are opened</div>
                </div>
              )}
              {activeTab === "Top Traders" && (
                <div className="flex flex-col items-center justify-center h-full py-8">
                  <div className="text-[var(--text-muted)] text-sm mb-2">Top Traders</div>
                  <div className="text-[#888] text-xs">Leaderboard coming soon</div>
                </div>
              )}
              {activeTab === "Positions" && (
                <PositionsList
                  positionIds={userPositionIds}
                  tokenAddress={token.id}
                  onClosePosition={async (positionId) => {
                    try {
                      await actions.closePosition(positionId);
                      // Wait for transaction to be mined
                      await new Promise(resolve => setTimeout(resolve, 2000));
                      refetch();
                      // Trigger trade confirmed event for chart updates
                      window.dispatchEvent(new CustomEvent('tradeConfirmed', {
                        detail: { tokenAddress: token.id, action: 'close' }
                      }));
                    } catch (error: unknown) {
                      const errorMessage = error instanceof Error ? error.message : "Unknown error";
                      alert(`Error closing position: ${errorMessage}`);
                    }
                  }}
                />
              )}
              {activeTab === "Order Book" && <div className="flex items-center justify-center h-full text-[var(--text-muted)] text-sm py-8">Order book coming soon</div>}
              {activeTab === "Info" && (
                <div className="p-4 text-xs space-y-2">
                  <div className="flex justify-between"><span className="text-[var(--text-muted)]">Contract</span><span className="text-[var(--accent-green)]">{token.walletAddress || "0x1234...5678"}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--text-muted)]">Holders</span><span className="text-[var(--foreground)]">{token.holders || 0}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--text-muted)]">Transactions</span><span className="text-[var(--foreground)]">{token.transactions || 0}</span></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Trading Panel */}
        <div className="w-[340px] border-l border-[var(--card-bg)] flex flex-col bg-[var(--background)]">
          {/* Spot/Perps Toggle */}
          <div className="flex bg-[var(--sidebar-bg)] p-1 border-b border-[var(--card-bg)]">
            <button
              onClick={() => setTradingMode("spot")}
              disabled={!curveData?.isListed}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                tradingMode === "spot"
                  ? "bg-[var(--accent-green)] text-black"
                  : "text-[var(--text-muted)] hover:text-[var(--foreground)] disabled:opacity-30 disabled:cursor-not-allowed"
              }`}
            >
              Spot
            </button>
            <button
              onClick={() => setTradingMode("perps")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                tradingMode === "perps"
                  ? "bg-[#2962ff] text-[var(--foreground)]"
                  : "text-[var(--text-muted)] hover:text-[var(--foreground)]"
              }`}
            >
              Perps
            </button>
          </div>

          {/* Spot Trading Mode */}
          {tradingMode === "spot" && curveData?.isListed && (
            <div className="flex-1 overflow-y-auto">
              <BondingCurvePanel tokenAddress={token.id} tokenSymbol={token.symbol} />
            </div>
          )}

          {/* Perps Trading Mode */}
          {tradingMode === "perps" && (
            <div className="flex-1 overflow-y-auto">
              <TradingPanel
                tokenAddress={token.id}
                tokenSymbol={token.symbol}
                tokenPrice={token.price}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
