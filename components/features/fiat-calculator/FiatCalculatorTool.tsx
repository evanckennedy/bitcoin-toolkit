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
import { calculateFiatShorting } from "@/lib/fiat-calculator";

const DEFAULT_INPUTS = {
  loanAmount: 100000,
  apr: 10,
  btcGrowth: 30,
  cpi: 3,
};

const chartConfig = {
  btcValue: { label: "BTC Value", color: "var(--primary)" },
  deferred: { label: "Deferred (no payments)", color: "#ef4444" },
  interestOnly: { label: "Interest-only", color: "#94a3b8" },
  amortized: { label: "Fully amortized", color: "#22c55e" },
} satisfies ChartConfig;

function fmt(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function Pct({ value }: { value: number }) {
  const color =
    value <= 0 ? "text-primary" : value > 50 ? "text-destructive" : "";
  return (
    <span className={`text-3xl font-bold ${color}`}>
      {value > 0 ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  );
}

export function FiatCalculatorTool() {
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  const [showResults, setShowResults] = useState(false);
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
        </CardContent>
      </Card>

      {/* CTA */}
      {!showResults && (
        <Button
          size="lg"
          className="w-full py-6 text-base"
          onClick={() => setShowResults(true)}
        >
          Calculate my personal Speculative Attack
        </Button>
      )}

      {/* Results */}
      {showResults && (
        <>
          {/* Top stats */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Real Cost of Debt
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Pct value={results.realCostOfDebt} />
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
                <Pct value={results.netAnnualSpread} />
                <p className="text-xs text-muted-foreground mt-1">
                  BTC growth minus your APR
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle>BTC Value vs. Debt Balance Over 10 Years</CardTitle>
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
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Strategy comparison */}
          <div className="grid gap-4 sm:grid-cols-3">
            {(["deferred", "interestOnly", "amortized"] as const).map((key) => {
              const s = results.strategies[key];
              return (
                <Card key={key}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {s.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-1">
                    <p className="text-lg font-bold">
                      {fmt(s.balanceAtEnd)} remaining
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {fmt(s.totalCashPaid)} total paid out
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Debt-to-BTC ratio:{" "}
                      <span
                        className={
                          s.debtToBtcRatio < 1
                            ? "text-primary font-semibold"
                            : "text-destructive font-semibold"
                        }
                      >
                        {(s.debtToBtcRatio * 100).toFixed(0)}%
                      </span>
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground">
            Assumes loan amount is fully deployed into Bitcoin at inception.
            Deferred strategy accrues compound interest with no payments.
            Interest-only services annual interest but holds principal flat.
            Fully amortized uses standard monthly payments. This is not
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
