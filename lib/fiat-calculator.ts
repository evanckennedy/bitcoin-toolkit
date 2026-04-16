export type FiatCalculatorInputs = {
  loanAmount: number;
  apr: number;
  btcGrowth: number;
  cpi: number;
};

export type ChartDataPoint = {
  year: number;
  btcValue: number;
  deferred: number;
  interestOnly: number;
  amortized: number;
};

export type StrategyResult = {
  label: string;
  balanceAtEnd: number;
  totalCashPaid: number;
  debtToBtcRatio: number;
};

export type FiatCalculatorResults = {
  chartData: ChartDataPoint[];
  btcValueAtEnd: number;
  realCostOfDebt: number;
  netAnnualSpread: number;
  strategies: {
    deferred: StrategyResult;
    interestOnly: StrategyResult;
    amortized: StrategyResult;
  };
};

function amortizedBalance(
  principal: number,
  monthlyRate: number,
  totalMonths: number,
  monthsElapsed: number,
): number {
  if (monthlyRate === 0) {
    return principal * (1 - monthsElapsed / totalMonths);
  }
  const factor = Math.pow(1 + monthlyRate, totalMonths);
  const elapsed = Math.pow(1 + monthlyRate, monthsElapsed);
  return Math.round((principal * (factor - elapsed)) / (factor - 1));
}

export function calculateFiatShorting(
  inputs: FiatCalculatorInputs,
): FiatCalculatorResults {
  const { loanAmount, apr, btcGrowth, cpi } = inputs;
  const YEARS = 10;
  const monthlyRate = apr / 100 / 12;
  const totalMonths = YEARS * 12;

  // Monthly payment for full amortization
  const monthlyPayment =
    monthlyRate === 0
      ? loanAmount / totalMonths
      : (loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalMonths))) /
        (Math.pow(1 + monthlyRate, totalMonths) - 1);

  const chartData: ChartDataPoint[] = Array.from(
    { length: YEARS + 1 },
    (_, t) => ({
      year: t,
      btcValue: Math.round(loanAmount * Math.pow(1 + btcGrowth / 100, t)),
      // Debt compounds — no payments made
      deferred: Math.round(loanAmount * Math.pow(1 + apr / 100, t)),
      // Balance stays flat — only interest serviced
      interestOnly: loanAmount,
      // Standard amortization — balance shrinks to 0 at year 10
      amortized:
        t === 0
          ? loanAmount
          : amortizedBalance(loanAmount, monthlyRate, totalMonths, t * 12),
    }),
  );

  const btcValueAtEnd = chartData[YEARS].btcValue;

  const deferredEnd = chartData[YEARS].deferred;
  const interestOnlyEnd = loanAmount;
  const amortizedEnd = 0;

  return {
    chartData,
    btcValueAtEnd,
    realCostOfDebt: apr - cpi,
    netAnnualSpread: btcGrowth - apr,
    strategies: {
      deferred: {
        label: "Deferred (no payments)",
        balanceAtEnd: deferredEnd,
        totalCashPaid: 0,
        debtToBtcRatio: deferredEnd / btcValueAtEnd,
      },
      interestOnly: {
        label: "Interest-only",
        balanceAtEnd: interestOnlyEnd,
        totalCashPaid: Math.round(((loanAmount * apr) / 100) * YEARS),
        debtToBtcRatio: interestOnlyEnd / btcValueAtEnd,
      },
      amortized: {
        label: "Fully amortized",
        balanceAtEnd: amortizedEnd,
        totalCashPaid: Math.round(monthlyPayment * totalMonths),
        debtToBtcRatio: 0,
      },
    },
  };
}
