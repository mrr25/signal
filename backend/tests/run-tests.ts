import { signalEngine } from '../src/signals/engine.ts';
import { normalizer } from '../src/market/normalization/index.ts';
import { db } from '../src/database/index.ts';
import { replayProvider } from '../src/market/providers/replay.provider.ts';
import { geminiService } from '../src/ai/gemini.ts';
import { MarketTick } from '../../shared/types/index.ts';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failed++;
  }
}

async function runAllTests() {
  console.log('\n========================================');
  console.log(' RUNNING SIGNAL ENGINE & INTEGRATION TESTS');
  console.log('========================================\n');

  // -------------------------------------------------------------
  // 1. SIGNAL ENGINE TESTS (Section 46.1)
  // -------------------------------------------------------------
  console.log('--- 1. Signal Engine Tests ---');

  // Test 1.1: Small movement (should be NORMAL, score <= 30)
  const smallTick: MarketTick = {
    symbol: 'INFY',
    exchange: 'NSE',
    price: 1545.0,
    previousClose: 1542.3,
    change: 2.7,
    changePercent: 0.17,
    volume: 1000000,
    timestamp: Date.now(),
    source: 'test',
  };
  const smallEval = signalEngine.evaluate(smallTick, 0.2, 0.2);
  assert(smallEval.classification === 'NORMAL', 'Small movement produces NORMAL classification');
  assert(smallEval.score <= 30, `Small movement score (${smallEval.score}) <= 30`);

  // Test 1.2: Large movement
  const largeTick: MarketTick = {
    symbol: 'INFY',
    exchange: 'NSE',
    price: 1610.0,
    previousClose: 1542.3,
    change: 67.7,
    changePercent: 4.4,
    volume: 2000000,
    timestamp: Date.now(),
    source: 'test',
  };
  const largeEval = signalEngine.evaluate(largeTick, 0.3, 0.4);
  assert(largeEval.score > 50, `Large movement yields elevated score (${largeEval.score} > 50)`);

  // Test 1.3: Volume Anomaly (2.4x volume with price move)
  const volumeAnomalyTick: MarketTick = {
    symbol: 'INFY',
    exchange: 'NSE',
    price: 1616.0,
    previousClose: 1542.3,
    change: 73.7,
    changePercent: 4.8,
    volume: 10000000, // 2.5x normal
    timestamp: Date.now(),
    source: 'test',
  };
  const volEval = signalEngine.evaluate(volumeAnomalyTick, 0.3, 0.5);
  assert(volEval.factors.volumeScore >= 80, `Volume anomaly factors volumeScore >= 80 (${volEval.factors.volumeScore})`);
  assert(volEval.classification === 'HIGH_ATTENTION', `Volume anomaly + outperformance yields HIGH_ATTENTION (${volEval.classification})`);
  assert(volEval.score >= 81, `Signal score is in High Attention range (${volEval.score} >= 81)`);

  // Test 1.4: Relative Outperformance
  const outperformingTick: MarketTick = {
    symbol: 'TCS',
    exchange: 'NSE',
    price: 3592.5,
    previousClose: 3421.5,
    change: 171.0,
    changePercent: 5.0,
    volume: 3000000,
    timestamp: Date.now(),
    source: 'test',
  };
  const outEval = signalEngine.evaluate(outperformingTick, -0.8, -0.5); // Market falling, stock rising!
  assert(outEval.factors.relativePerformanceScore >= 80, 'Relative performance score >= 80 in contrarian outperformance');
  assert(outEval.reasons.includes('contrarian_divergence') || outEval.reasons.includes('strong_market_outperformance'), 'Identifies contrarian divergence or market outperformance');

  // Test 1.5: Score boundaries (must be strictly 0-100)
  assert(volEval.score <= 100 && volEval.score >= 0, 'Score is bounded between 0 and 100');

  // -------------------------------------------------------------
  // 2. WATCHLIST TESTS (Section 46.2)
  // -------------------------------------------------------------
  console.log('\n--- 2. Watchlist Operations Tests ---');
  const testUserId = 'usr-test-runner';

  // 2.1 Create Watchlist
  const created = await db.createWatchlist(testUserId, 'Test Momentum Portfolio', true);
  assert(created.name === 'Test Momentum Portfolio', 'Watchlist created with correct name');
  assert(created.isDefault === true, 'Watchlist created as default');

  // 2.2 Add Stock
  const withStock = await db.addStockToWatchlist(created.id, testUserId, 'INFY', 'Test holding note');
  assert(withStock !== null && withStock.stocks.some((s) => s.symbol === 'INFY'), 'Stock added to watchlist');

  // 2.3 Rename Watchlist
  const renamed = await db.updateWatchlist(created.id, testUserId, { name: 'Renamed Portfolio' });
  assert(renamed?.name === 'Renamed Portfolio', 'Watchlist renamed successfully');

  // 2.4 Remove Stock
  const afterRemove = await db.removeStockFromWatchlist(created.id, testUserId, 'INFY');
  assert(afterRemove !== null && !afterRemove.stocks.some((s) => s.symbol === 'INFY'), 'Stock removed from watchlist');

  // 2.5 Unauthorized access protection
  const unauthorizedCheck = await db.getWatchlist(created.id, 'unauthorized-user-id');
  assert(unauthorizedCheck === null, 'Unauthorized access to user watchlist is blocked');

  // 2.6 Delete Watchlist
  const deleted = await db.deleteWatchlist(created.id, testUserId);
  assert(deleted === true, 'Watchlist deleted successfully');

  // -------------------------------------------------------------
  // 3. MARKET DATA NORMALIZATION & RELIABILITY (Section 46.3)
  // -------------------------------------------------------------
  console.log('\n--- 3. Market Data Normalization Tests ---');

  // 3.1 Valid tick
  const validRaw = {
    symbol: 'INFY',
    price: 1542.3,
    close: 1500.0,
    volume: 50000,
    timestamp: Date.now(),
  };
  const norm1 = normalizer.normalize(validRaw);
  assert(norm1 !== null && norm1.symbol === 'INFY' && norm1.price === 1542.3, 'Valid tick correctly normalized');

  // 3.2 Malformed tick (negative price)
  const malformedNegativePrice = { symbol: 'INFY', price: -500, timestamp: Date.now() };
  const norm2 = normalizer.normalize(malformedNegativePrice);
  assert(norm2 === null, 'Negative price tick is strictly rejected');

  // 3.3 Malformed tick (missing symbol)
  const malformedMissingSymbol = { price: 1500, timestamp: Date.now() };
  const norm3 = normalizer.normalize(malformedMissingSymbol);
  assert(norm3 === null, 'Tick without symbol is rejected');

  // 3.4 Duplicate tick detection
  const ts = Date.now();
  normalizer.normalize({ symbol: 'HDFCBANK', price: 1890.1, timestamp: ts });
  const duplicate = normalizer.normalize({ symbol: 'HDFCBANK', price: 1890.1, timestamp: ts });
  assert(duplicate === null, 'Identical duplicate tick is safely discarded');

  // -------------------------------------------------------------
  // 4. AI & DETERMINISTIC FALLBACK TESTS (Section 46.4)
  // -------------------------------------------------------------
  console.log('\n--- 4. AI & Contextual Intelligence Tests ---');

  const aiInput = {
    symbol: 'INFY',
    companyName: 'Infosys Limited',
    priceChange: 4.8,
    volumeMultiple: 2.4,
    marketChange: 0.4,
    sectorChange: 0.6,
    signalScore: 87,
    reasons: ['price_outperformance', 'volume_anomaly'],
    sector: 'Information Technology',
  };

  const explanationResult = await geminiService.explain(aiInput);
  assert(typeof explanationResult.explanation === 'string' && explanationResult.explanation.length > 20, 'AI explanation generated valid non-empty text');
  assert(explanationResult.explanation.includes('INFY'), 'Explanation includes symbol name');
  assert(explanationResult.explanation.includes('4.8%') || explanationResult.explanation.includes('outperforming'), 'Explanation contextually references performance');

  const fallback = geminiService.generateFallbackExplanation(aiInput);
  assert(fallback.includes('87/100') && fallback.includes('outperforming'), 'Deterministic fallback explanation correctly formats scores and comparisons');

  // -------------------------------------------------------------
  // 5. REPLAY PROVIDER TESTS (Section 46.5)
  // -------------------------------------------------------------
  console.log('\n--- 5. Market Replay Engine Tests ---');

  const initialStatus = replayProvider.getStatus();
  assert(initialStatus.dataMode === 'REPLAY', 'Replay provider identifies as REPLAY mode');

  replayProvider.pause();
  assert(replayProvider.getReplayState().isPlaying === false, 'Replay provider pause works');

  replayProvider.play();
  assert(replayProvider.getReplayState().isPlaying === true, 'Replay provider play/resume works');

  replayProvider.setSpeed(5);
  assert(replayProvider.getReplayState().speed === 5, 'Replay speed adjusted to 5x');

  replayProvider.setSpeed(1);
  assert(replayProvider.getReplayState().speed === 1, 'Replay speed restored to 1x');

  replayProvider.seek(0.5);
  const seekState = replayProvider.getReplayState();
  assert(seekState.progressPercent >= 45 && seekState.progressPercent <= 55, 'Replay seek to 50% ratio works');

  // Anomaly trigger test
  replayProvider.triggerAnomaly('volume_spike', 'INFY');
  assert(true, 'Trigger manual market anomaly (volume spike) executed without error');

  // Pause replay loop so Node event loop can cleanly terminate
  replayProvider.pause();

  console.log('\n========================================');
  console.log(` TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAllTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
