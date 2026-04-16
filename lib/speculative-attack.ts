export type FiatCalculatorInputs = {
  loanAmount: number;
  apr: number;
  btcGrowth: number;
  cpi: number;
  years: number;
};

export type ChartDataPoint = {
  year: number;
  // nominal
  btcValue: number;
  deferred: number;
  interestOnly: number;
  amortized: number;
  trueNetWorthDeferred: number;
  trueNetWorthInterestOnly: number;
  trueNetWorthAmortized: number;
  // real (inflation-adjusted to today's dollars)
  realBtcValue: number;
  realDeferred: number;
  realInterestOnly: number;
  realAmortized: number;
  realTrueNetWorthDeferred: number;
  realTrueNetWorthInterestOnly: number;
  realTrueNetWorthAmortized: number;
};

export type StrategyResult = {
  label: string;
  balanceAtEnd: number;
  totalNominalPaid: number;
  totalRealPaid: number;
  // nominal
  trueNetWorth: number;
  cashEfficiency: number | null;
  // real
  realTrueNetWorth: number;
  realCashEfficiency: number | null;
  debtToBtcRatio: number;
};

export type FiatCalculatorResults = {
  chartData: ChartDataPoint[];
  btcValueAtEnd: number;
  realCostOfDebt: number;
  netAnnualSpread: number;
  breakEvenBtcGrowth: number;
  bestNominalStrategy: "deferred" | "interestOnly" | "amortized";
  bestRealStrategy: "deferred" | "interestOnly" | "amortized";
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

// Sum of annual payments discounted to today's dollars
function realValueOfPayments(
  annualPayment: number,
  cpiRate: number,
  years: number,
): number {
  if (cpiRate === 0) return Math.round(annualPayment * years);
  let total = 0;
  for (let t = 1; t <= years; t++) {
    total += annualPayment / Math.pow(1 + cpiRate, t);
  }
  return Math.round(total);
}

// Cumulative real (PV) cash paid up to year t
function cumulativeRealPaidAt(
  t: number,
  annualInterestOnly: number,
  annualAmortizedPayment: number,
  cpiRate: number,
): { deferred: number; interestOnly: number; amortized: number } {
  if (t === 0) return { deferred: 0, interestOnly: 0, amortized: 0 };
  let interestOnly = 0;
  let amortized = 0;
  for (let i = 1; i <= t; i++) {
    const discount = cpiRate === 0 ? 1 : Math.pow(1 + cpiRate, i);
    interestOnly += annualInterestOnly / discount;
    amortized += annualAmortizedPayment / discount;
  }
  return {
    deferred: 0,
    interestOnly: Math.round(interestOnly),
    amortized: Math.round(amortized),
  };
}

export function calculateFiatShorting(
  inputs: FiatCalculatorInputs,
): FiatCalculatorResults {
  const { loanAmount, apr, btcGrowth, cpi, years } = inputs;
  const cpiRate = cpi / 100;
  const monthlyRate = apr / 100 / 12;
  const totalMonths = years * 12;

  const nominalAmortizedTotal = totalAmortizedPaid(
    loanAmount,
    monthlyRate,
    totalMonths,
  );
  const annualInterestOnly = loanAmount * (apr / 100);
  const annualAmortizedPayment = nominalAmortizedTotal / years;

  const totalNominalInterestOnly = Math.round(annualInterestOnly * years);
  const totalRealInterestOnly = realValueOfPayments(
    annualInterestOnly,
    cpiRate,
    years,
  );
  const totalRealAmortized = realValueOfPayments(
    annualAmortizedPayment,
    cpiRate,
    years,
  );

  const chartData: ChartDataPoint[] = Array.from(
    { length: years + 1 },
    (_, t) => {
      const deflator = cpiRate === 0 ? 1 : Math.pow(1 + cpiRate, t);

      // Nominal
      const btcValue = Math.round(
        loanAmount * Math.pow(1 + btcGrowth / 100, t),
      );
      const deferred = Math.round(loanAmount * Math.pow(1 + apr / 100, t));
      const interestOnly = loanAmount;
      const amortized =
        t === 0
          ? loanAmount
          : amortizedBalance(loanAmount, monthlyRate, totalMonths, t * 12);

      const cumNominalIO = Math.round(annualInterestOnly * t);
      const cumNominalAmt = Math.round(annualAmortizedPayment * t);

      // Real (deflated to today's purchasing power)
      const realBtcValue = Math.round(btcValue / deflator);
      const realDeferred = Math.round(deferred / deflator);
      const realInterestOnly = Math.round(interestOnly / deflator);
      const realAmortized = Math.round(amortized / deflator);

      const cumReal = cumulativeRealPaidAt(
        t,
        annualInterestOnly,
        annualAmortizedPayment,
        cpiRate,
      );

      return {
        year: t,
        btcValue,
        deferred,
        interestOnly,
        amortized,
        trueNetWorthDeferred: btcValue - deferred - 0,
        trueNetWorthInterestOnly: btcValue - interestOnly - cumNominalIO,
        trueNetWorthAmortized: btcValue - amortized - cumNominalAmt,
        realBtcValue,
        realDeferred,
        realInterestOnly,
        realAmortized,
        realTrueNetWorthDeferred: realBtcValue - realDeferred - 0,
        realTrueNetWorthInterestOnly:
          realBtcValue - realInterestOnly - cumReal.interestOnly,
        realTrueNetWorthAmortized:
          realBtcValue - realAmortized - cumReal.amortized,
      };
    },
  );

  const btcValueAtEnd = chartData[years].btcValue;
  const deferredEnd = chartData[years].deferred;
  const realBtcEnd = chartData[years].realBtcValue;
  const realDeferredEnd = chartData[years].realDeferred;

  // Nominal true net worths
  const nomTNW = {
    deferred: btcValueAtEnd - deferredEnd - 0,
    interestOnly: btcValueAtEnd - loanAmount - totalNominalInterestOnly,
    amortized: btcValueAtEnd - 0 - nominalAmortizedTotal,
  };

  // Real true net worths
  const realLoanEnd = Math.round(loanAmount / Math.pow(1 + cpiRate, years));
  const realTNW = {
    deferred: realBtcEnd - realDeferredEnd - 0,
    interestOnly: realBtcEnd - realLoanEnd - totalRealInterestOnly,
    amortized: realBtcEnd - 0 - totalRealAmortized,
  };

  const strategies = {
    deferred: {
      label: "Deferred (no payments)",
      balanceAtEnd: deferredEnd,
      totalNominalPaid: 0,
      totalRealPaid: 0,
      trueNetWorth: nomTNW.deferred,
      cashEfficiency: null,
      realTrueNetWorth: realTNW.deferred,
      realCashEfficiency: null,
      debtToBtcRatio: deferredEnd / btcValueAtEnd,
    },
    interestOnly: {
      label: "Interest-only",
      balanceAtEnd: loanAmount,
      totalNominalPaid: totalNominalInterestOnly,
      totalRealPaid: totalRealInterestOnly,
      trueNetWorth: nomTNW.interestOnly,
      cashEfficiency:
        totalNominalInterestOnly > 0
          ? nomTNW.interestOnly / totalNominalInterestOnly
          : null,
      realTrueNetWorth: realTNW.interestOnly,
      realCashEfficiency:
        totalRealInterestOnly > 0
          ? realTNW.interestOnly / totalRealInterestOnly
          : null,
      debtToBtcRatio: loanAmount / btcValueAtEnd,
    },
    amortized: {
      label: "Fully amortized",
      balanceAtEnd: 0,
      totalNominalPaid: nominalAmortizedTotal,
      totalRealPaid: totalRealAmortized,
      trueNetWorth: nomTNW.amortized,
      cashEfficiency:
        nominalAmortizedTotal > 0
          ? nomTNW.amortized / nominalAmortizedTotal
          : null,
      realTrueNetWorth: realTNW.amortized,
      realCashEfficiency:
        totalRealAmortized > 0 ? realTNW.amortized / totalRealAmortized : null,
      debtToBtcRatio: 0,
    },
  };

  const bestNominalStrategy = (
    ["deferred", "interestOnly", "amortized"] as const
  ).reduce((best, key) =>
    strategies[key].trueNetWorth > strategies[best].trueNetWorth ? key : best,
  );

  const bestRealStrategy = (
    ["deferred", "interestOnly", "amortized"] as const
  ).reduce((best, key) =>
    strategies[key].realTrueNetWorth > strategies[best].realTrueNetWorth
      ? key
      : best,
  );

  return {
    chartData,
    btcValueAtEnd,
    realCostOfDebt: apr - cpi,
    netAnnualSpread: btcGrowth - apr,
    breakEvenBtcGrowth: apr,
    bestNominalStrategy,
    bestRealStrategy,
    strategies,
  };
}
