export type StrcInputs = {
  loanAmount: number;
  loanApr: number;
  strcYield: number;
  btcGrowth: number;
  years: number;
};

export type StrcChartPoint = {
  year: number;
  spreadToBtc: number;
  compoundStrc: number;
};

export type StrcStrategyResult = {
  finalValue: number;
  totalInterestPaid: number;
  totalDividendsReceived: number;
  netCashGenerated: number;
};

export type StrcResults = {
  chartData: StrcChartPoint[];
  annualSpread: number;
  netSpreadPct: number;
  breakEvenYield: number;
  strategies: {
    spreadToBtc: StrcStrategyResult;
    compoundStrc: StrcStrategyResult;
  };
  bestStrategy: "spreadToBtc" | "compoundStrc";
};

export function calculateStrcArbitrage(inputs: StrcInputs): StrcResults {
  const { loanAmount, loanApr, strcYield, btcGrowth, years } = inputs;
  const g = btcGrowth / 100;
  const aprRate = loanApr / 100;
  const yieldRate = strcYield / 100;

  const baseDividend = loanAmount * yieldRate;
  const baseInterest = loanAmount * aprRate;
  const annualSpread = baseDividend - baseInterest;

  const chartData: StrcChartPoint[] = [
    { year: 0, spreadToBtc: 0, compoundStrc: 0 },
  ];

  // Strategy 1: Direct BTC Stack — fixed spread buys BTC each year
  let btcValue1 = 0;
  let totalInterest1 = 0;
  let totalDividends1 = 0;

  // Strategy 2: STRC Compound — reinvest spread into growing STRC position
  let strcPosition = loanAmount;
  let totalInterest2 = 0;
  let totalDividends2 = 0;

  for (let t = 1; t <= years; t++) {
    // Strategy 1
    btcValue1 = btcValue1 * (1 + g) + Math.max(0, annualSpread);
    totalInterest1 += baseInterest;
    totalDividends1 += baseDividend;

    // Strategy 2
    const dividend2 = strcPosition * yieldRate;
    const spread2 = dividend2 - baseInterest;
    totalInterest2 += baseInterest;
    totalDividends2 += dividend2;
    if (spread2 > 0) strcPosition += spread2;
    const excessStrc = Math.max(0, strcPosition - loanAmount);

    chartData.push({
      year: t,
      spreadToBtc: Math.round(btcValue1),
      compoundStrc: Math.round(excessStrc),
    });
  }

  const strategies = {
    spreadToBtc: {
      finalValue: Math.round(btcValue1),
      totalInterestPaid: Math.round(totalInterest1),
      totalDividendsReceived: Math.round(totalDividends1),
      netCashGenerated: Math.round(totalDividends1 - totalInterest1),
    },
    compoundStrc: {
      finalValue: Math.round(strcPosition - loanAmount),
      totalInterestPaid: Math.round(totalInterest2),
      totalDividendsReceived: Math.round(totalDividends2),
      netCashGenerated: Math.round(totalDividends2 - totalInterest2),
    },
  };

  const bestStrategy: "spreadToBtc" | "compoundStrc" =
    strategies.compoundStrc.finalValue > strategies.spreadToBtc.finalValue
      ? "compoundStrc"
      : "spreadToBtc";

  return {
    chartData,
    annualSpread,
    netSpreadPct: strcYield - loanApr,
    breakEvenYield: loanApr,
    strategies,
    bestStrategy,
  };
}
