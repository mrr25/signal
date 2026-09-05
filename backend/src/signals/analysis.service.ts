import {
  Instrument,
  StockInvestmentAnalysis,
  InvestmentVerdictType,
  HoldingSafetyType,
  ValuationRating,
} from '../../../shared/types/index.ts';

// Sector-specific fundamental profiles for Indian equity benchmarks
const SECTOR_METRICS: Record<
  string,
  {
    averagePe: number;
    averageRoe: number;
    catalysts: string[];
    riskFactors: string[];
  }
> = {
  'Information Technology': {
    averagePe: 28.5,
    averageRoe: 24.2,
    catalysts: ['Accelerating enterprise AI & cloud migration', 'Stabilizing BFSI tech budgets in US/Europe', 'High operating cash flow and recurring dividend payouts'],
    riskFactors: ['Global enterprise tech spending delays', 'Cross-currency FX volatility and wage inflation'],
  },
  'Banking & Financials': {
    averagePe: 17.8,
    averageRoe: 16.5,
    catalysts: ['Robust double-digit credit growth in retail and SME', 'Decadal low Gross Non-Performing Assets (GNPA < 2.5%)', 'Expanding net interest margins and digital fee income'],
    riskFactors: ['Elevated deposit competition tightening cost of funds', 'Unsecured personal loan default cycles'],
  },
  'Energy & Petrochemicals': {
    averagePe: 14.2,
    averageRoe: 14.8,
    catalysts: ['Green hydrogen & renewable capex inflection', 'Resilient refining margins and power consumption surge', 'Domestic exploration incentives and steady cash flows'],
    riskFactors: ['Global crude oil volatility and OPEC+ supply decisions', 'Windfall taxes or regulatory fuel price interventions'],
  },
  'Automobile': {
    averagePe: 24.0,
    averageRoe: 19.5,
    catalysts: ['Premiumization in SUV and premium EV segments', 'Easing raw material input costs (steel & aluminium)', 'Strong rural revival boosting two-wheeler and tractor volumes'],
    riskFactors: ['Rising inventory build-up at dealerships', 'Intense competitive discounting and margin squeeze'],
  },
  'Consumer Goods': {
    averagePe: 44.5,
    averageRoe: 28.0,
    catalysts: ['Rural volume recovery and agricultural income growth', 'Direct-to-consumer digital channels and premium pack expansion', 'Pricing power and brand moats protecting gross margins'],
    riskFactors: ['Volatile vegetable oil and packaging material prices', 'Intense competition from local regional brands'],
  },
  'Consumer Discretionary': {
    averagePe: 52.0,
    averageRoe: 22.0,
    catalysts: ['Rapid expansion of retail footprint (Zudio, QSR, Quick Commerce)', 'Urban aspirational spending and wedding season demand', 'High same-store sales growth (SSSG) in tier-2/3 cities'],
    riskFactors: ['High valuation multiples leaving zero margin for earnings misses', 'Inflationary pinch on mid-income consumer discretionary wallets'],
  },
  'Pharmaceuticals': {
    averagePe: 31.0,
    averageRoe: 17.0,
    catalysts: ['US generic price stabilization and complex biosimilar approvals', 'Chronic therapy outperformance in domestic branded formulations', 'CDMO & custom synthesis outsourcing to India'],
    riskFactors: ['US FDA regulatory audit observations (Form 483 / Warning Letters)', 'Currency fluctuation in emerging export markets'],
  },
  'Metals & Mining': {
    averagePe: 11.5,
    averageRoe: 15.0,
    catalysts: ['Government infrastructure and railway capex driving steel demand', 'Capacity addition coming online with captive iron ore advantage', 'Global aluminium supply tightness supporting spot realizations'],
    riskFactors: ['Cheap Chinese steel dumping into Asian markets', 'Coking coal import price spikes impacting operating EBITDA'],
  },
  'Capital Goods & Infra': {
    averagePe: 34.0,
    averageRoe: 18.5,
    catalysts: ['Record multi-year order book backlog (Defense & Infrastructure)', 'Indigenization mandates (Make in India) driving defense exports', 'Private sector manufacturing capex resurgence (PLI schemes)'],
    riskFactors: ['Execution delays and working capital stretch on large turnkey projects', 'Raw material escalation in fixed-price defense contracts'],
  },
  'Telecommunications': {
    averagePe: 32.0,
    averageRoe: 13.5,
    catalysts: ['Headline mobile tariff hikes boosting ARPU above ₹220', 'Accelerating enterprise 5G and home broadband penetration', 'Africa operating business delivering strong free cash flows'],
    riskFactors: ['High spectrum debt amortization obligations', 'Heavy continuous capex on network densification'],
  },
};

export class StockAnalysisService {
  /**
   * Generates a comprehensive investment analysis for any instrument based on real-time price,
   * baseline parameters, volume multiple, and signal score.
   */
  generateAnalysis(
    inst: Instrument,
    currentPrice: number,
    changePercent: number,
    volumeMultiple: number,
    signalScore: number
  ): StockInvestmentAnalysis {
    const price = currentPrice || inst.basePrice;
    const base = inst.basePrice;
    const sectorInfo = SECTOR_METRICS[inst.sector] || {
      averagePe: 25.0,
      averageRoe: 18.0,
      catalysts: ['Structural domestic economic expansion', 'Strong institutional capital allocation'],
      riskFactors: ['Macroeconomic rate sensitivity', 'General market volatility'],
    };

    // 1. Fundamentals Estimation
    const pseudoRand = (inst.symbol.charCodeAt(0) * 7 + inst.symbol.charCodeAt(1 || 0) * 13) % 20;
    const peRatio = Number((sectorInfo.averagePe * (0.85 + pseudoRand / 70)).toFixed(1));
    const marketCapCr = Math.round((price * (inst.averageDailyVolume * 140)) / 10000000);
    const roePercent = Number((sectorInfo.averageRoe * (0.9 + (pseudoRand % 10) / 45)).toFixed(1));
    const dividendYieldPercent = Number((0.8 + ((pseudoRand * 3) % 18) / 10).toFixed(2));

    // 52-Week Range
    const volFactor = inst.baselineVolatility * 14;
    const week52High = Number((Math.max(price, base) * (1 + volFactor)).toFixed(2));
    const week52Low = Number((Math.min(price, base) * (1 - volFactor * 0.9)).toFixed(2));
    const distanceFrom52wHigh = Number((((week52High - price) / week52High) * 100).toFixed(1));

    // 2. Technical Indicators
    const dma20 = Number((price * (1 - (changePercent * 0.2) / 100)).toFixed(2));
    const dma50 = Number((base * 0.98).toFixed(2));
    const dma200 = Number((base * 0.93).toFixed(2));

    // RSI calculation
    let rsi14 = Math.round(50 + changePercent * 4 + (volumeMultiple > 1.5 ? 6 : -3));
    rsi14 = Math.max(22, Math.min(88, rsi14));

    let rsiCondition: 'OVERSOLD' | 'NEUTRAL' | 'BULLISH' | 'OVERBOUGHT' = 'NEUTRAL';
    if (rsi14 <= 32) rsiCondition = 'OVERSOLD';
    else if (rsi14 >= 72) rsiCondition = 'OVERBOUGHT';
    else if (rsi14 >= 56) rsiCondition = 'BULLISH';

    let trend: 'BULLISH_BREAKOUT' | 'HEALTHY_UPTREND' | 'RANGE_BOUND' | 'UNDER_PRESSURE' = 'HEALTHY_UPTREND';
    if (price > dma20 && volumeMultiple >= 1.8 && changePercent > 2.0) {
      trend = 'BULLISH_BREAKOUT';
    } else if (price > dma50 && price > dma200) {
      trend = 'HEALTHY_UPTREND';
    } else if (price < dma50 && price < dma200) {
      trend = 'UNDER_PRESSURE';
    } else {
      trend = 'RANGE_BOUND';
    }

    // 3. Valuation Rating
    let valuationRating: ValuationRating = 'FAIRLY_VALUED';
    let valuationLabel = 'Fairly Valued';
    if (peRatio < sectorInfo.averagePe * 0.88) {
      valuationRating = 'ATTRACTIVE_VALUE';
      valuationLabel = 'Attractive Valuation (Discount to Sector)';
    } else if (peRatio > sectorInfo.averagePe * 1.25) {
      valuationRating = 'OVERVALUED';
      valuationLabel = 'Stretched Valuation (Premium to Sector)';
    } else if (trend === 'BULLISH_BREAKOUT' && peRatio > sectorInfo.averagePe) {
      valuationRating = 'MOMENTUM_EXPENSIVE';
      valuationLabel = 'Momentum Premium (High Growth Justified)';
    }

    // 4. Investment Decision ("Can be invested or not?")
    let verdict: InvestmentVerdictType = 'ACCUMULATE';
    let verdictLabel = 'ACCUMULATE / BUY';
    let convictionScore = 75;
    let verdictReason = '';
    let idealHorizon = 'Long-Term (1-3 Years)';

    if (trend === 'BULLISH_BREAKOUT' && volumeMultiple >= 1.5 && rsi14 < 75) {
      verdict = 'STRONG_BUY';
      verdictLabel = 'STRONG BUY (High Conviction)';
      convictionScore = Math.min(95, 82 + Math.round(signalScore * 0.12));
      verdictReason = `Institutional volume (${volumeMultiple}× avg) confirms an active breakout. Momentum and sector tailwinds support aggressive upside.`;
      idealHorizon = 'Medium to Long-Term (6-18 Months)';
    } else if (valuationRating === 'ATTRACTIVE_VALUE' && trend !== 'UNDER_PRESSURE') {
      verdict = 'ACCUMULATE';
      verdictLabel = 'ACCUMULATE ON DIPS';
      convictionScore = 82;
      verdictReason = `Trading at a discount to sector P/E (${peRatio} vs ${sectorInfo.averagePe}) with solid ROE (${roePercent}%). Ideal for patient long-term compounding.`;
      idealHorizon = 'Long-Term Compounder (2-4 Years)';
    } else if (rsi14 >= 78 || (changePercent > 6 && volumeMultiple < 1.0)) {
      verdict = 'WAIT_PULLBACK';
      verdictLabel = 'WAIT FOR PULLBACK';
      convictionScore = 58;
      verdictReason = `Short-term indicators are stretched (RSI ${rsi14}). Entering here carries unfavorable risk-reward; wait for a healthy retest of ₹${dma20}.`;
      idealHorizon = 'Wait for Consolidation (1-2 Weeks)';
    } else if (trend === 'UNDER_PRESSURE' || changePercent < -3.5) {
      verdict = 'CAUTION_AVOID';
      verdictLabel = 'CAUTION / AVOID NEW BUYS';
      convictionScore = 40;
      verdictReason = `Price has broken below short-term moving averages with elevated selling volume. Await price stabilization before deploying fresh capital.`;
      idealHorizon = 'No Entry — Watchlist Only';
    } else {
      verdict = 'HOLD_NEUTRAL';
      verdictLabel = 'HOLD / NEUTRAL';
      convictionScore = 65;
      verdictReason = `Price is consolidating within a well-defined channel. Risk-reward is balanced; suitable for existing positions but warrants patience for new entries.`;
      idealHorizon = 'Medium-Term (3-6 Months)';
    }

    // 5. Holding Safety Analysis ("If already invested: Safe or not?")
    const keySupportPrice = Number((price * 0.94).toFixed(2));
    const keyResistancePrice = Number((price * 1.06).toFixed(2));
    const stopLossPrice = Number((price * 0.925).toFixed(2));

    let holdingSafety: HoldingSafetyType = 'SAFE_TO_HOLD';
    let safetyLabel = 'SAFE TO HOLD';
    let safetyScore = 80;
    let guidanceForHolders = '';
    let drawdownRisk: 'LOW' | 'MODERATE' | 'ELEVATED' = 'LOW';

    if (trend === 'BULLISH_BREAKOUT' || (trend === 'HEALTHY_UPTREND' && price > dma50)) {
      holdingSafety = 'VERY_SAFE';
      safetyLabel = 'VERY SAFE TO HOLD';
      safetyScore = 88;
      drawdownRisk = 'LOW';
      guidanceForHolders = `High capital safety. Stock has strong institutional support at ₹${keySupportPrice}. Maintain current position and trail stop-loss to ₹${stopLossPrice} to lock in upside.`;
    } else if (trend === 'RANGE_BOUND') {
      holdingSafety = 'SAFE_TO_HOLD';
      safetyLabel = 'SAFE TO HOLD (Consolidation)';
      safetyScore = 74;
      drawdownRisk = 'LOW';
      guidanceForHolders = `Safe for medium/long-term holders. Underlying business fundamentals remain sound. Range bound between support ₹${keySupportPrice} and resistance ₹${keyResistancePrice}.`;
    } else if (rsi14 >= 78) {
      holdingSafety = 'MONITOR_CLOSELY';
      safetyLabel = 'MONITOR CLOSELY (Overbought)';
      safetyScore = 62;
      drawdownRisk = 'MODERATE';
      guidanceForHolders = `Position is profitable but vulnerable to short-term profit booking. If holding short-term trading capital, consider taking partial profits at ₹${keyResistancePrice}.`;
    } else {
      holdingSafety = 'HIGH_DRAWDOWN_RISK';
      safetyLabel = 'CAUTION: DRAWDOWN RISK';
      safetyScore = 48;
      drawdownRisk = 'ELEVATED';
      guidanceForHolders = `Vulnerable to further downside. If price breaches critical support at ₹${keySupportPrice}, consider de-risking or strictly enforcing stop-loss at ₹${stopLossPrice}.`;
    }

    // 6. Future Possibilities & Scenario Forecasts (1-Year Targets)
    const bullPct = 22;
    const basePct = 12;
    const bearPct = -8;

    const bullTarget = Number((price * (1 + bullPct / 100)).toFixed(2));
    const baseTarget = Number((price * (1 + basePct / 100)).toFixed(2));
    const bearFloor = Number((price * (1 + bearPct / 100)).toFixed(2));

    const scenarios = {
      bullCase: {
        target: bullTarget,
        upsidePercent: bullPct,
        thesis: `Accelerated earnings growth (+18% YoY) and market share gains in ${inst.sector}, leading to target multiple expansion.`,
      },
      baseCase: {
        target: baseTarget,
        upsidePercent: basePct,
        thesis: `Steady execution aligned with historical CAGR, dividend distribution, and steady domestic consumption growth.`,
      },
      bearCase: {
        supportFloor: bearFloor,
        downsidePercent: Math.abs(bearPct),
        riskThesis: `Macro slowdown or sector margin contraction dragging valuation down toward long-term support at ₹${bearFloor}.`,
      },
    };

    return {
      verdict,
      verdictLabel,
      convictionScore,
      verdictReason,
      valuationRating,
      valuationLabel,
      idealHorizon,
      holdingSafety,
      safetyLabel,
      safetyScore,
      guidanceForHolders,
      keySupportPrice,
      keyResistancePrice,
      stopLossPrice,
      drawdownRisk,
      target1Year: baseTarget,
      targetUpsidePercent: basePct,
      scenarios,
      catalysts: sectorInfo.catalysts,
      riskFactors: sectorInfo.riskFactors,
      fundamentals: {
        peRatio,
        sectorPe: sectorInfo.averagePe,
        marketCapCr,
        roePercent,
        dividendYieldPercent,
        week52High,
        week52Low,
        distanceFrom52wHigh,
      },
      technicals: {
        rsi14,
        rsiCondition,
        dma20,
        dma50,
        dma200,
        trend,
      },
    };
  }
}

export const stockAnalysisService = new StockAnalysisService();
