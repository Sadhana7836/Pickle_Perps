import {
  MemeTokenFactoryV2,
  BondingCurveMarket,
  PerpetualTrading,
  Token,
  Trade,
  Position,
  User,
  PriceCandle,
  Protocol,
  FeeWithdrawal,
} from "generated";

// Helper to get or create Protocol entity
async function getOrCreateProtocol(context: any): Promise<Protocol> {
  let protocol = await context.Protocol.get("protocol");
  if (!protocol) {
    protocol = {
      id: "protocol",
      totalTokensCreated: 0n,
      totalTrades: 0n,
      totalVolume: 0n,
      totalFees: 0n,
      totalPositions: 0n,
      totalLiquidations: 0n,
      uniqueUsers: 0n,
      lastUpdated: 0n,
    };
  }
  return protocol;
}

// Helper to get or create User entity
async function getOrCreateUser(context: any, address: string): Promise<User> {
  let user = await context.User.get(address);
  if (!user) {
    user = {
      id: address,
      address: address,
      tokensCreated: 0n,
      totalTrades: 0n,
      totalBuys: 0n,
      totalSells: 0n,
      totalVolumeTraded: 0n,
      totalPositions: 0n,
      openPositions: 0n,
      totalPnl: 0n,
      winCount: 0n,
      lossCount: 0n,
      liquidationCount: 0n,
      firstTradeAt: undefined,
      lastTradeAt: undefined,
    };
  }
  return user;
}

// Helper to get hourly bucket timestamp
function getHourlyBucket(timestamp: bigint): bigint {
  return (timestamp / 3600n) * 3600n;
}

// ============================================
// MemeTokenFactoryV2 Event Handlers
// ============================================

MemeTokenFactoryV2.TokenCreated.handler(async ({ event, context }) => {
  const tokenAddress = event.params.tokenAddress.toLowerCase();
  const creatorAddress = event.params.creator.toLowerCase();

  // Create Token entity
  const token: Token = {
    id: tokenAddress,
    address: tokenAddress,
    creator: creatorAddress,
    name: event.params.name,
    symbol: event.params.symbol,
    totalSupply: event.params.totalSupply,
    imageHash: event.params.imageHash,
    creatorAllocationBps: event.params.creatorAllocationBps,
    createdAt: event.params.timestamp,
    createdAtBlock: BigInt(event.block.number),
    curveSupply: undefined,
    initialPrice: undefined,
    currentPrice: undefined,
    soldFromCurve: undefined,
    reserveBalance: undefined,
    isActive: false,
    totalVolume: 0n,
    totalTrades: 0n,
    totalBuys: 0n,
    totalSells: 0n,
  };

  context.Token.set(token);

  // Update creator user
  const user = await getOrCreateUser(context, creatorAddress);
  user.tokensCreated = user.tokensCreated + 1n;
  context.User.set(user);

  // Update protocol stats
  const protocol = await getOrCreateProtocol(context);
  protocol.totalTokensCreated = protocol.totalTokensCreated + 1n;
  protocol.lastUpdated = BigInt(event.block.timestamp);
  context.Protocol.set(protocol);
});

MemeTokenFactoryV2.MintingFeeUpdated.handler(async ({ event, context }) => {
  // Log fee updates - could track in a separate entity if needed
  context.log.info(
    `Minting fee updated from ${event.params.oldFee} to ${event.params.newFee}`
  );
});

MemeTokenFactoryV2.BondingCurveMarketUpdated.handler(
  async ({ event, context }) => {
    context.log.info(
      `Bonding curve market updated from ${event.params.oldMarket} to ${event.params.newMarket}`
    );
  }
);

// ============================================
// BondingCurveMarket Event Handlers
// ============================================

BondingCurveMarket.CurveInitialized.handler(async ({ event, context }) => {
  const tokenAddress = event.params.token.toLowerCase();

  let token = await context.Token.get(tokenAddress);
  if (token) {
    token = {
      ...token,
      curveSupply: event.params.curveSupply,
      initialPrice: event.params.initialPrice,
      currentPrice: event.params.initialPrice,
      soldFromCurve: 0n,
      reserveBalance: 0n,
      isActive: true,
    };
    context.Token.set(token);
  }
});

BondingCurveMarket.TokenBought.handler(async ({ event, context }) => {
  const tokenAddress = event.params.token.toLowerCase();
  const buyerAddress = event.params.buyer.toLowerCase();
  const tradeId = `${event.transaction.hash}-${event.logIndex}`;

  // Create Trade entity
  const trade: Trade = {
    id: tradeId,
    token_id: tokenAddress,
    trader: buyerAddress,
    isBuy: true,
    ethAmount: event.params.ethIn,
    tokenAmount: event.params.tokensOut,
    price: event.params.newPrice,
    fee: event.params.fee,
    timestamp: BigInt(event.block.timestamp),
    blockNumber: BigInt(event.block.number),
    txHash: event.transaction.hash,
  };
  context.Trade.set(trade);

  // Update token stats
  let token = await context.Token.get(tokenAddress);
  if (token) {
    token = {
      ...token,
      currentPrice: event.params.newPrice,
      totalVolume: token.totalVolume + event.params.ethIn,
      totalTrades: token.totalTrades + 1n,
      totalBuys: token.totalBuys + 1n,
    };
    context.Token.set(token);
  }

  // Update user stats
  const user = await getOrCreateUser(context, buyerAddress);
  user.totalTrades = user.totalTrades + 1n;
  user.totalBuys = user.totalBuys + 1n;
  user.totalVolumeTraded = user.totalVolumeTraded + event.params.ethIn;
  user.lastTradeAt = BigInt(event.block.timestamp);
  if (!user.firstTradeAt) {
    user.firstTradeAt = BigInt(event.block.timestamp);
  }
  context.User.set(user);

  // Update price candle
  const hourlyBucket = getHourlyBucket(BigInt(event.block.timestamp));
  const candleId = `${tokenAddress}-${hourlyBucket}`;
  let candle = await context.PriceCandle.get(candleId);

  if (!candle) {
    candle = {
      id: candleId,
      token_id: tokenAddress,
      timestamp: hourlyBucket,
      openPrice: event.params.newPrice,
      high: event.params.newPrice,
      low: event.params.newPrice,
      closePrice: event.params.newPrice,
      volume: event.params.ethIn,
      trades: 1n,
    };
  } else {
    candle = {
      ...candle,
      high:
        event.params.newPrice > candle.high
          ? event.params.newPrice
          : candle.high,
      low:
        event.params.newPrice < candle.low ? event.params.newPrice : candle.low,
      closePrice: event.params.newPrice,
      volume: candle.volume + event.params.ethIn,
      trades: candle.trades + 1n,
    };
  }
  context.PriceCandle.set(candle);

  // Update protocol stats
  const protocol = await getOrCreateProtocol(context);
  protocol.totalTrades = protocol.totalTrades + 1n;
  protocol.totalVolume = protocol.totalVolume + event.params.ethIn;
  protocol.totalFees = protocol.totalFees + event.params.fee;
  protocol.lastUpdated = BigInt(event.block.timestamp);
  context.Protocol.set(protocol);
});

BondingCurveMarket.TokenSold.handler(async ({ event, context }) => {
  const tokenAddress = event.params.token.toLowerCase();
  const sellerAddress = event.params.seller.toLowerCase();
  const tradeId = `${event.transaction.hash}-${event.logIndex}`;

  // Create Trade entity
  const trade: Trade = {
    id: tradeId,
    token_id: tokenAddress,
    trader: sellerAddress,
    isBuy: false,
    ethAmount: event.params.ethOut,
    tokenAmount: event.params.tokensIn,
    price: event.params.newPrice,
    fee: event.params.fee,
    timestamp: BigInt(event.block.timestamp),
    blockNumber: BigInt(event.block.number),
    txHash: event.transaction.hash,
  };
  context.Trade.set(trade);

  // Update token stats
  let token = await context.Token.get(tokenAddress);
  if (token) {
    token = {
      ...token,
      currentPrice: event.params.newPrice,
      totalVolume: token.totalVolume + event.params.ethOut,
      totalTrades: token.totalTrades + 1n,
      totalSells: token.totalSells + 1n,
    };
    context.Token.set(token);
  }

  // Update user stats
  const user = await getOrCreateUser(context, sellerAddress);
  user.totalTrades = user.totalTrades + 1n;
  user.totalSells = user.totalSells + 1n;
  user.totalVolumeTraded = user.totalVolumeTraded + event.params.ethOut;
  user.lastTradeAt = BigInt(event.block.timestamp);
  if (!user.firstTradeAt) {
    user.firstTradeAt = BigInt(event.block.timestamp);
  }
  context.User.set(user);

  // Update price candle
  const hourlyBucket = getHourlyBucket(BigInt(event.block.timestamp));
  const candleId = `${tokenAddress}-${hourlyBucket}`;
  let candle = await context.PriceCandle.get(candleId);

  if (!candle) {
    candle = {
      id: candleId,
      token_id: tokenAddress,
      timestamp: hourlyBucket,
      openPrice: event.params.newPrice,
      high: event.params.newPrice,
      low: event.params.newPrice,
      closePrice: event.params.newPrice,
      volume: event.params.ethOut,
      trades: 1n,
    };
  } else {
    candle = {
      ...candle,
      high:
        event.params.newPrice > candle.high
          ? event.params.newPrice
          : candle.high,
      low:
        event.params.newPrice < candle.low ? event.params.newPrice : candle.low,
      closePrice: event.params.newPrice,
      volume: candle.volume + event.params.ethOut,
      trades: candle.trades + 1n,
    };
  }
  context.PriceCandle.set(candle);

  // Update protocol stats
  const protocol = await getOrCreateProtocol(context);
  protocol.totalTrades = protocol.totalTrades + 1n;
  protocol.totalVolume = protocol.totalVolume + event.params.ethOut;
  protocol.totalFees = protocol.totalFees + event.params.fee;
  protocol.lastUpdated = BigInt(event.block.timestamp);
  context.Protocol.set(protocol);
});

BondingCurveMarket.FeesWithdrawn.handler(async ({ event, context }) => {
  const withdrawalId = `${event.transaction.hash}-${event.logIndex}`;

  const withdrawal: FeeWithdrawal = {
    id: withdrawalId,
    recipient: event.params.recipient.toLowerCase(),
    amount: event.params.amount,
    timestamp: BigInt(event.block.timestamp),
    txHash: event.transaction.hash,
  };
  context.FeeWithdrawal.set(withdrawal);
});

BondingCurveMarket.TradingFeeUpdated.handler(async ({ event, context }) => {
  context.log.info(
    `Trading fee updated from ${event.params.oldFee} to ${event.params.newFee}`
  );
});

// ============================================
// PerpetualTrading Event Handlers
// ============================================

PerpetualTrading.PositionOpened.handler(async ({ event, context }) => {
  const positionId = event.params.positionId.toString();
  const userAddress = event.params.user.toLowerCase();
  const tokenAddress = event.params.token.toLowerCase();

  // Create Position entity
  const position: Position = {
    id: positionId,
    positionId: event.params.positionId,
    user: userAddress,
    token_id: tokenAddress,
    isLong: event.params.isLong,
    size: event.params.size,
    margin: event.params.margin,
    leverage: event.params.leverage,
    entryPrice: event.params.entryPrice,
    exitPrice: undefined,
    pnl: undefined,
    isOpen: true,
    openedAt: BigInt(event.block.timestamp),
    closedAt: undefined,
    liquidatedAt: undefined,
    liquidationPrice: undefined,
    txHash: event.transaction.hash,
  };
  context.Position.set(position);

  // Update user stats
  const user = await getOrCreateUser(context, userAddress);
  user.totalPositions = user.totalPositions + 1n;
  user.openPositions = user.openPositions + 1n;
  context.User.set(user);

  // Update protocol stats
  const protocol = await getOrCreateProtocol(context);
  protocol.totalPositions = protocol.totalPositions + 1n;
  protocol.lastUpdated = BigInt(event.block.timestamp);
  context.Protocol.set(protocol);
});

PerpetualTrading.PositionClosed.handler(async ({ event, context }) => {
  const positionId = event.params.positionId.toString();

  let position = await context.Position.get(positionId);
  if (position) {
    const isProfit = event.params.pnl > 0n;

    position = {
      ...position,
      exitPrice: event.params.exitPrice,
      pnl: event.params.pnl,
      isOpen: false,
      closedAt: BigInt(event.block.timestamp),
    };
    context.Position.set(position);

    // Update user stats
    const user = await getOrCreateUser(context, position.user);
    user.openPositions = user.openPositions - 1n;
    user.totalPnl = user.totalPnl + event.params.pnl;
    if (isProfit) {
      user.winCount = user.winCount + 1n;
    } else {
      user.lossCount = user.lossCount + 1n;
    }
    context.User.set(user);
  }
});

PerpetualTrading.PositionLiquidated.handler(async ({ event, context }) => {
  const positionId = event.params.positionId.toString();

  let position = await context.Position.get(positionId);
  if (position) {
    position = {
      ...position,
      isOpen: false,
      liquidatedAt: BigInt(event.block.timestamp),
      liquidationPrice: event.params.liquidationPrice,
    };
    context.Position.set(position);

    // Update user stats
    const user = await getOrCreateUser(context, position.user);
    user.openPositions = user.openPositions - 1n;
    user.liquidationCount = user.liquidationCount + 1n;
    // Assume full margin loss on liquidation
    user.totalPnl = user.totalPnl - position.margin;
    user.lossCount = user.lossCount + 1n;
    context.User.set(user);

    // Update protocol stats
    const protocol = await getOrCreateProtocol(context);
    protocol.totalLiquidations = protocol.totalLiquidations + 1n;
    protocol.lastUpdated = BigInt(event.block.timestamp);
    context.Protocol.set(protocol);
  }
});

PerpetualTrading.PriceUpdated.handler(async ({ event, context }) => {
  const tokenAddress = event.params.token.toLowerCase();

  let token = await context.Token.get(tokenAddress);
  if (token) {
    token = {
      ...token,
      currentPrice: event.params.price,
    };
    context.Token.set(token);
  }
});
