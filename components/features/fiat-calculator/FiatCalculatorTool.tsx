"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import {
  calculateFiatShorting,
  type StrategyResult,
} from "@/lib/fiat-calculator";

const DEFAULT_INPUTS = {
  loanAmount: 100000,
  apr: 10,
  btcGrowth: 40,
  cpi: 3,
  years: 10,
};

const STRATEGY_KEYS = ["deferred", "interestOnly", "amortized"] as const;

const chartConfig = {
  btcValue: { label: "BTC Value", color: "var(--primary)" },
  deferred: { label: "Deferred", color: "#ef4444" },
  interestOnly: { label: "Interest-only", color: "#94a3b8" },
  amortized: { label: "Fully amortized", color: "#22c55e" },
  trueNetWorthDeferred: {
    label: "True net worth (deferred)",
    color: "#f97316",
  },
  trueNetWorthInterestOnly: {
    label: "True net worth (interest-only)",
    color: "#64748b",
  },
  trueNetWorthAmortized: {
    label: "True net worth (amortized)",
    color: "#16a34a",
  },
} satisfies ChartConfig;

function fmt(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

function fmtEfficiency(value: number | null): string {
  if (value === null) return "∞";
  return `${value.toFixed(1)}x`;
}

const STRATEGY_LABELS: Record<(typeof STRATEGY_KEYS)[number], string> = {
  deferred: "Deferred",
  interestOnly: "Interest-only",
  amortized: "Fully amortized",
};

function StrategyCard({
  strategyKey,
  s,
  isBest,
}: {
  strategyKey: (typeof STRATEGY_KEYS)[number];
  s: StrategyResult;
  isBest: boolean;
}) {
  return (
    <Card className={isBest ? "border-primary" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {STRATEGY_LABELS[strategyKey]}
          </CardTitle>
          {isBest && (
            <span className="text-xs font-semibold text-primary">
              Best outcome
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div>
          <p
            className={`text-xl font-bold ${s.trueNetWorth >= 0 ? "text-primary" : "text-destructive"}`}
          >
            {fmt(s.trueNetWorth)}
          </p>
          <p className="text-xs text-muted-foreground">
            True net worth (BTC − debt − cash paid)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <p
            className={`text-lg font-semibold ${s.cashEfficiency === null ? "text-primary" : ""}`}
          >
            {fmtEfficiency(s.cashEfficiency)}
          </p>
          <p className="text-xs text-muted-foreground">return per $ paid out</p>
        </div>
        <div className="border-t border-border pt-2 flex flex-col gap-1 text-xs text-muted-foreground">
          <p>
            Remaining balance:{" "}
            <span className="text-foreground font-medium">
              {fmt(s.balanceAtEnd)}
            </span>
          </p>
          <p>
            Total paid (nominal):{" "}
            <span className="text-foreground font-medium">
              {fmt(s.totalNominalPaid)}
            </span>
          </p>
          <p>
            Total paid (real):{" "}
            <span className="text-foreground font-medium">
              {fmt(s.totalRealPaid)}
            </span>
          </p>
          <p>
            Debt-to-BTC:{" "}
            <span
              className={`font-semibold ${s.debtToBtcRatio < 1 ? "text-primary" : "text-destructive"}`}
            >
              {(s.debtToBtcRatio * 100).toFixed(0)}%
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function FiatCalculatorTool() {
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  const [showResults, setShowResults] = useState(false);
  const [showTrueNetWorth, setShowTrueNetWorth] = useState(false);
  const results = useMemo(() => calculateFiatShorting(inputs), [inputs]);

  function handleChange(field: keyof typeof inputs, raw: string) {
    const value = parseFloat(raw);
    if (!isNaN(value) && value >= 0) {
      setInputs((prev) => ({ ...prev, [field]: value }));
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Inputs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Numbers</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="loanAmount">Loan Amount ($)</Label>
            <Input
              id="loanAmount"
              type="number"
              min={0}
              value={inputs.loanAmount}
              onChange={(e) => handleChange("loanAmount", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="apr">Interest Rate / APR (%)</Label>
            <Input
              id="apr"
              type="number"
              min={0}
              step={0.1}
              value={inputs.apr}
              onChange={(e) => handleChange("apr", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="btcGrowth">
              Expected Bitcoin Annual Growth (%)
            </Label>
            <Input
              id="btcGrowth"
              type="number"
              min={0}
              step={1}
              value={inputs.btcGrowth}
              onChange={(e) => handleChange("btcGrowth", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cpi">Expected Inflation / CPI (%)</Label>
            <Input
              id="cpi"
              type="number"
              min={0}
              step={0.1}
              value={inputs.cpi}
              onChange={(e) => handleChange("cpi", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="years">Duration (years)</Label>
            <Input
              id="years"
              type="number"
              min={1}
              max={50}
              step={1}
              value={inputs.years}
              onChange={(e) => handleChange("years", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {!showResults && (
        <Button
          size="lg"
          className="w-full py-6 text-base"
          onClick={() => setShowResults(true)}
        >
          Calculate my personal Speculative Attack
        </Button>
      )}

      {showResults && (
        <>
          {/* Summary stats */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Real Cost of Debt
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p
                  className={`text-3xl font-bold ${results.realCostOfDebt <= 0 ? "text-primary" : ""}`}
                >
                  {results.realCostOfDebt > 0 ? "+" : ""}
                  {results.realCostOfDebt.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  APR minus inflation — negative means debt is melting
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Net Annual Spread
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p
                  className={`text-3xl font-bold ${results.netAnnualSpread >= 0 ? "text-primary" : "text-destructive"}`}
                >
                  {results.netAnnualSpread > 0 ? "+" : ""}
                  {results.netAnnualSpread.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  BTC growth minus your APR
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Break-even BTC Growth
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {results.breakEvenBtcGrowth.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Min. annual BTC growth to outrun compounding debt
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Chart toggle */}
          <div className="flex gap-2">
            <Button
              variant={!showTrueNetWorth ? "default" : "outline"}
              size="sm"
              onClick={() => setShowTrueNetWorth(false)}
            >
              BTC vs. Debt
            </Button>
            <Button
              variant={showTrueNetWorth ? "default" : "outline"}
              size="sm"
              onClick={() => setShowTrueNetWorth(true)}
            >
              True Net Worth
            </Button>
          </div>

          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle>
                {showTrueNetWorth
                  ? `True Net Worth by Strategy Over ${inputs.years} Years`
                  : `BTC Value vs. Debt Balance Over ${inputs.years} Years`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-80 w-full">
                <LineChart
                  data={results.chartData}
                  margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" tickFormatter={(v) => `Yr ${v}`} />
                  <YAxis tickFormatter={fmt} width={75} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  {!showTrueNetWorth ? (
                    <>
                      <Line
                        type="monotone"
                        dataKey="btcValue"
                        stroke="var(--color-btcValue)"
                        strokeWidth={2.5}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="deferred"
                        stroke="var(--color-deferred)"
                        strokeWidth={1.5}
                        dot={false}
                        strokeDasharray="6 3"
                      />
                      <Line
                        type="monotone"
                        dataKey="interestOnly"
                        stroke="var(--color-interestOnly)"
                        strokeWidth={1.5}
                        dot={false}
                        strokeDasharray="3 3"
                      />
                      <Line
                        type="monotone"
                        dataKey="amortized"
                        stroke="var(--color-amortized)"
                        strokeWidth={1.5}
                        dot={false}
                        strokeDasharray="2 4"
                      />
                    </>
                  ) : (
                    <>
                      <Line
                        type="monotone"
                        dataKey="trueNetWorthDeferred"
                        stroke="var(--color-trueNetWorthDeferred)"
                        strokeWidth={1.5}
                        dot={false}
                        strokeDasharray="6 3"
                      />
                      <Line
                        type="monotone"
                        dataKey="trueNetWorthInterestOnly"
                        stroke="var(--color-trueNetWorthInterestOnly)"
                        strokeWidth={1.5}
                        dot={false}
                        strokeDasharray="3 3"
                      />
                      <Line
                        type="monotone"
                        dataKey="trueNetWorthAmortized"
                        stroke="var(--color-trueNetWorthAmortized)"
                        strokeWidth={2}
                        dot={false}
                      />
                    </>
                  )}
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Strategy comparison */}
          <div className="grid gap-4 sm:grid-cols-3">
            {STRATEGY_KEYS.map((key) => (
              <StrategyCard
                key={key}
                strategyKey={key}
                s={results.strategies[key]}
                isBest={results.bestTrueNetWorthStrategy === key}
              />
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            Assumes loan amount is fully deployed into Bitcoin at inception and
            never sold. Payments come from external cash flow. True net worth =
            BTC value minus remaining debt minus all cash paid out of pocket.
            Cash efficiency = true net worth per dollar paid out (∞ means zero
            cash spent). Real values adjusted for CPI annually. This is not
            financial advice.
          </p>

          <Button
            variant="outline"
            onClick={() => setShowResults(false)}
            className="self-start"
          >
            Adjust inputs
          </Button>
        </>
      )}
    </div>
  );
}
