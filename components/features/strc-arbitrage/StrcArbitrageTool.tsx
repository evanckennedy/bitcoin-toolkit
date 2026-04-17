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
  calculateStrcArbitrage,
  type StrcStrategyResult,
} from "@/lib/strc-arbitrage";

const DEFAULT_INPUTS = {
  loanAmount: 100000,
  loanApr: 8,
  strcYield: 11.5,
  btcGrowth: 40,
  years: 10,
};

const STRATEGY_KEYS = ["spreadToBtc", "compoundStrc"] as const;
type StrategyKey = (typeof STRATEGY_KEYS)[number];

const chartConfig = {
  spreadToBtc: { label: "Direct BTC Stack", color: "#22c55e" },
  compoundStrc: { label: "STRC Compound", color: "var(--primary)" },
} satisfies ChartConfig;

const STRATEGY_LABELS: Record<StrategyKey, string> = {
  spreadToBtc: "Direct BTC Stack",
  compoundStrc: "STRC Compound",
};

const STRATEGY_DESCRIPTIONS: Record<StrategyKey, string> = {
  spreadToBtc: "Buy BTC with the fixed annual spread each year",
  compoundStrc:
    "Reinvest spread into more STRC — growing income, convert at end",
};

function fmt(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

function StrategyCard({
  strategyKey,
  s,
  isBest,
}: {
  strategyKey: StrategyKey;
  s: StrcStrategyResult;
  isBest: boolean;
}) {
  return (
    <Card className={isBest ? "border-primary" : ""}>
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
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
            className={`text-xl font-bold ${s.finalValue >= 0 ? "text-primary" : "text-destructive"}`}
          >
            {fmt(s.finalValue)}
          </p>
          <p className="text-xs text-muted-foreground">
            {strategyKey === "compoundStrc"
              ? "Excess STRC value at termination"
              : "BTC portfolio value"}
          </p>
        </div>
        <p className="text-xs text-muted-foreground italic">
          {STRATEGY_DESCRIPTIONS[strategyKey]}
        </p>
        <div className="border-t border-border pt-2 flex flex-col gap-1 text-xs text-muted-foreground">
          <p>
            Dividends received:{" "}
            <span className="text-foreground font-medium">
              {fmt(s.totalDividendsReceived)}
            </span>
          </p>
          <p>
            Interest paid:{" "}
            <span className="text-foreground font-medium">
              {fmt(s.totalInterestPaid)}
            </span>
          </p>
          <p>
            Net cash from spread:{" "}
            <span
              className={`font-semibold ${s.netCashGenerated >= 0 ? "text-primary" : "text-destructive"}`}
            >
              {fmt(s.netCashGenerated)}
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function StrcArbitrageTool() {
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  const [showResults, setShowResults] = useState(false);
  const results = useMemo(() => calculateStrcArbitrage(inputs), [inputs]);

  function handleChange(field: keyof typeof inputs, raw: string) {
    const value = parseFloat(raw);
    if (!isNaN(value) && value >= 0) {
      setInputs((prev) => ({ ...prev, [field]: value }));
    }
  }

  return (
    <div className="flex flex-col gap-8 min-w-0">
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
            <Label htmlFor="loanApr">Loan APR (%)</Label>
            <Input
              id="loanApr"
              type="number"
              min={0}
              step={0.1}
              value={inputs.loanApr}
              onChange={(e) => handleChange("loanApr", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="strcYield">STRC Dividend Yield (%)</Label>
            <Input
              id="strcYield"
              type="number"
              min={0}
              step={0.1}
              value={inputs.strcYield}
              onChange={(e) => handleChange("strcYield", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="btcGrowth">Expected BTC Annual Growth (%)</Label>
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
          Run the Arbitrage
        </Button>
      )}

      {showResults && (
        <>
          {results.annualSpread <= 0 && (
            <div className="rounded-lg border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive font-medium">
              STRC yield is at or below the loan APR — there is no spread to
              capture.
            </div>
          )}

          {/* Summary stats */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Annual Spread (Year 1)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p
                  className={`text-3xl font-bold ${results.annualSpread >= 0 ? "text-primary" : "text-destructive"}`}
                >
                  {fmt(results.annualSpread)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Dividends minus loan interest
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Net Spread Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p
                  className={`text-3xl font-bold ${results.netSpreadPct >= 0 ? "text-primary" : "text-destructive"}`}
                >
                  {results.netSpreadPct > 0 ? "+" : ""}
                  {results.netSpreadPct.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  STRC yield minus loan APR
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Break-even Yield
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {results.breakEvenYield.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Min. STRC yield to cover the loan
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">
                Arbitrage Value Over {inputs.years} Years by Strategy
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <ChartContainer
                config={chartConfig}
                className="h-64 sm:h-80 w-full overflow-hidden"
              >
                <LineChart
                  data={results.chartData}
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="year"
                    tickFormatter={(v) => `Yr ${v}`}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    tickFormatter={fmt}
                    width={60}
                    tick={{ fontSize: 11 }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line
                    type="monotone"
                    dataKey="spreadToBtc"
                    stroke="var(--color-spreadToBtc)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="compoundStrc"
                    stroke="var(--color-compoundStrc)"
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="6 3"
                  />
                </LineChart>
              </ChartContainer>
              <p className="text-xs text-muted-foreground">
                Direct BTC Stack value includes Bitcoin price appreciation at
                your growth rate. STRC Compound shows excess STRC position at
                face value — no Bitcoin appreciation until converted at
                termination.
              </p>
            </CardContent>
          </Card>

          {/* Strategy cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            {STRATEGY_KEYS.map((key) => (
              <StrategyCard
                key={key}
                strategyKey={key}
                s={results.strategies[key]}
                isBest={results.bestStrategy === key}
              />
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            Assumes loan proceeds are fully deployed into STRC at inception on
            an interest-only basis. STRC dividends are variable and not
            guaranteed — actual yields may change. STRC Compound final value is
            excess STRC at face value and does not include Bitcoin price
            appreciation. This is not financial advice.
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
