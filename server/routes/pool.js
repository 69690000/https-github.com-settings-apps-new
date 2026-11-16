import { Router } from 'express';
import {
  listCoins,
  getCoin,
  coinServers,
  hashrateSeries,
  coinBlocks,
  recentBlocks,
} from '../db.js';

const router = Router();

function mapCoin(coin, series = []) {
  return {
    symbol: coin.symbol,
    name: coin.name,
    algorithm: coin.algorithm,
    payment: coin.payment,
    fee: coin.fee,
    threshold: coin.threshold,
    priceUsd: coin.price_usd,
    poolHashrate: coin.pool_hashrate,
    networkHashrate: coin.network_hashrate,
    miners: coin.miners,
    blocks24h: coin.blocks_24h,
    rewardPerBlock: coin.reward_per_block,
    revenueUnit: coin.revenue_unit,
    revenueUsdPerDay: coin.revenue_usd_day,
    merged: coin.merged,
    poolShare: coin.network_hashrate ? coin.pool_hashrate / coin.network_hashrate : 0,
    spark: series.map((point) => point.hashrate),
  };
}

router.get('/coins', (_req, res) => {
  const coins = listCoins().map((coin) => {
    const series = hashrateSeries(coin.symbol, 24);
    return mapCoin(coin, series);
  });
  res.json({ coins });
});

router.get('/coins/:symbol', (req, res) => {
  const coin = getCoin(req.params.symbol);
  if (!coin) {
    res.status(404).json({ error: 'Unknown coin' });
    return;
  }
  const series = hashrateSeries(coin.symbol, 48);
  const blocks = coinBlocks(coin.symbol, 12);
  res.json({
    coin: mapCoin(coin, series),
    series,
    servers: coinServers(coin.symbol),
    blocks,
    latestHeight: blocks[0]?.height ?? null,
  });
});

router.get('/blocks', (req, res) => {
  const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 12));
  const coins = new Map(listCoins().map((coin) => [coin.symbol, coin]));
  const blocks = recentBlocks(limit).map((block) => ({
    ...block,
    coinName: coins.get(block.symbol)?.name || block.symbol,
  }));
  res.json({ blocks });
});

export default router;
