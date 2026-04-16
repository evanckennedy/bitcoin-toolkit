export type FiatCalculatorInputs = {
  loanAmount: number;
  apr: number;
  btcGrowth: number;
  cpi: number;
  years: number;
};

export type ChartDataPoint = {
  year: number;
  btcValue: number;
  deferred: number;
  interestOnly: number;
  amortized: number;
  trueNetWorthDeferred: number;
  trueNetWorthInterestOnly: number;
  trueNetWorthAmortized: number;
};

export type StrategyResult = {
  label: string;
  balanceAtEnd: number;
  totalNominalPaid: number;
  totalRealPaid: number;
  trueNetWorth: number; // BTC - remaining debt - total cash paid
  cashEfficiency: number | null; // trueNetWorth / totalNominalPaid (null = infinite)
  debtToBtcRatio: number;
};

export type FiatCalculatorResults = {
  chartData: ChartDataPoint[];
  btcValueAtEnd: number;
  realCostOfDebt: number;
  netAnnualSpread: number;
  breakEvenBtcGrowth: number;
  bestTrueNetWorthStrategy: "deferred" | "interestOnly" | "amortized";
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
    return Math.round(principal * (1 - monthsElapsed / totalMonths));
  }
  const factor = Math.pow(1 + monthlyRate, totalMonths);
  const elapsed = Math.pow(1 + monthlyRate, monthsElapsed);
  return Math.max(
    0,
    Math.round((principal * (factor - elapsed)) / (factor - 1)),
  );
}

function totalAmortizedPaid(
  loanAmount: number,
  monthlyRate: number,
  totalMonths: number,
): number {
  if (monthlyRate === 0) return loanAmount;
  const monthlyPayment =
    (loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalMonths))) /
    (Math.pow(1 + monthlyRate, totalMonths) - 1);
  return Math.round(monthlyPayment * totalMonths);
}

function realValueOfPayments(
  annualPayment: number,
  cpiRate: number,
  years: number,
): number {
  if (cpiRate === 0) return annualPayment * years;
  let total = 0;
  for (let t = 1; t <= years; t++) {
    total += annualPayment / Math.pow(1 + cpiRate, t);
  }
  return Math.round(total);
}

// Cumulative nominal cash paid up to year t for each strategy
function cumulativePaidAt(
  t: number,
  annualInterestOnly: number,
  annualAmortizedPayment: number,
): { deferred: number; interestOnly: number; amortized: number } {
  return {
    deferred: 0,
    interestOnly: Math.round(annualInterestOnly * t),
    amortized: Math.round(annualAmortizedPayment * t),
  };
}

export function calculateFiatShorting(
  inputs: FiatCalculatorInputs,
): FiatCalculatorResults {
  const { loanAmount, apr, btcGrowth, cpi, years } = inputs;
  const monthlyRate = apr / 100 / 12;
  const totalMonths = years * 12;

  const nominalAmortizedTotal = totalAmortizedPaid(
    loanAmount,
    monthlyRate,
    totalMonths,
  );
  const annualInterestOnly = loanAmount * (apr / 100);
  const annualAmortizedPayment = nominalAmortizedTotal / years;

  const realInterestOnlyPaid = realValueOfPayments(
    annualInterestOnly,
    cpi / 100,
    years,
  );
  const realAmortizedPaid = realValueOfPayments(
    annualAmortizedPayment,
    cpi / 100,
    years,
  );

  const chartData: ChartDataPoint[] = Array.from(
    { length: years + 1 },
    (_, t) => {
      const btcValue = Math.round(
        loanAmount * Math.pow(1 + btcGrowth / 100, t),
      );
      const deferred = Math.round(loanAmount * Math.pow(1 + apr / 100, t));
      const interestOnly = loanAmount;
      const amortized =
        t === 0
          ? loanAmount
          : amortizedBalance(loanAmount, monthlyRate, totalMonths, t * 12);

      const cumPaid = cumulativePaidAt(
        t,
        annualInterestOnly,
        annualAmortizedPayment,
      );

      return {
        year: t,
        btcValue,
        deferred,
        interestOnly,
        amortized,
        trueNetWorthDeferred: btcValue - deferred - cumPaid.deferred,
        trueNetWorthInterestOnly:
          btcValue - interestOnly - cumPaid.interestOnly,
        trueNetWorthAmortized: btcValue - amortized - cumPaid.amortized,
      };
    },
  );

  const btcValueAtEnd = chartData[years].btcValue;
  const deferredEnd = chartData[years].deferred;

  const trueNetWorthDeferred = btcValueAtEnd - deferredEnd - 0;
  const trueNetWorthInterestOnly =
    btcValueAtEnd - loanAmount - Math.round(annualInterestOnly * years);
  const trueNetWorthAmortized = btcValueAtEnd - 0 - nominalAmortizedTotal;

  const strategies = {
    deferred: {
      label: "Deferred (no payments)",
      balanceAtEnd: deferredEnd,
      totalNominalPaid: 0,
      totalRealPaid: 0,
      trueNetWorth: trueNetWorthDeferred,
      cashEfficiency: null, // spent nothing — infinite efficiency
      debtToBtcRatio: deferredEnd / btcValueAtEnd,
    },
    interestOnly: {
      label: "Interest-only",
      balanceAtEnd: loanAmount,
      totalNominalPaid: Math.round(annualInterestOnly * years),
      totalRealPaid: realInterestOnlyPaid,
      trueNetWorth: trueNetWorthInterestOnly,
      cashEfficiency:
        Math.round(annualInterestOnly * years) > 0
          ? trueNetWorthInterestOnly / Math.round(annualInterestOnly * years)
          : null,
      debtToBtcRatio: loanAmount / btcValueAtEnd,
    },
    amortized: {
      label: "Fully amortized",
      balanceAtEnd: 0,
      totalNominalPaid: nominalAmortizedTotal,
      totalRealPaid: realAmortizedPaid,
      trueNetWorth: trueNetWorthAmortized,
      cashEfficiency:
        nominalAmortizedTotal > 0
          ? trueNetWorthAmortized / nominalAmortizedTotal
          : null,
      debtToBtcRatio: 0,
    },
  };

  const bestTrueNetWorthStrategy = (
    ["deferred", "interestOnly", "amortized"] as const
  ).reduce((best, key) =>
    strategies[key].trueNetWorth > strategies[best].trueNetWorth ? key : best,
  );

  return {
    chartData,
    btcValueAtEnd,
    realCostOfDebt: apr - cpi,
    netAnnualSpread: btcGrowth - apr,
    breakEvenBtcGrowth: apr,
    bestTrueNetWorthStrategy,
    strategies,
  };
}
