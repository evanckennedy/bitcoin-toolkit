"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { calculateLtv } from "@/lib/ltv-monitor";

const DEFAULT_INPUTS = {
  btcCollateral: 1,
  loanBalance: 50000,
  liquidationThreshold: 80,
};

function fmt(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(2)}K`;
  return `${sign}$${abs.toFixed(2)}`;
}

function LtvGauge({ ltv, threshold }: { ltv: number; threshold: number }) {
  const clamped = Math.min(ltv, 100);
  const pct = `${clamped.toFixed(1)}%`;

  let barColor = "bg-primary";
  if (ltv >= threshold) barColor = "bg-destructive";
  else if (ltv >= threshold * 0.85) barColor = "bg-yellow-500";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0%</span>
        <span className="font-medium text-foreground">{pct} LTV</span>
        <span
          className={ltv >= threshold ? "text-destructive font-semibold" : ""}
        >
          {threshold}% limit
        </span>
      </div>
      <div className="relative h-4 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${Math.min(clamped, 100)}%` }}
        />
        {/* threshold marker */}
        <div
          className="absolute top-0 h-full w-0.5 bg-foreground/40"
          style={{ left: `${Math.min(threshold, 100)}%` }}
        />
      </div>
    </div>
  );
}

export function LtvMonitorTool() {
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  const [btcPrice, setBtcPrice] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState(false);
  const [manualPrice, setManualPrice] = useState("");

  const fetchPrice = useCallback(async () => {
    setPriceLoading(true);
    setPriceError(false);
    try {
      const res = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
        { next: { revalidate: 0 } },
      );
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      setBtcPrice(data.bitcoin.usd);
      setManualPrice(String(data.bitcoin.usd));
    } catch {
      setPriceError(true);
    } finally {
      setPriceLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrice();
  }, [fetchPrice]);

  function handleManualPrice(raw: string) {
    setManualPrice(raw);
    const parsed = parseFloat(raw);
    if (!isNaN(parsed) && parsed > 0) setBtcPrice(parsed);
  }

  function handleChange(field: keyof typeof inputs, raw: string) {
    const value = parseFloat(raw);
    if (!isNaN(value) && value >= 0) {
      setInputs((prev) => ({ ...prev, [field]: value }));
    }
  }

  const results = useMemo(() => {
    if (btcPrice === null || btcPrice <= 0) return null;
    return calculateLtv({ ...inputs, btcPrice });
  }, [inputs, btcPrice]);

  const isLiquidated =
    results && results.currentLtv >= inputs.liquidationThreshold;
  const isWarning =
    results &&
    !isLiquidated &&
    results.currentLtv >= inputs.liquidationThreshold * 0.85;

  return (
    <div className="flex flex-col gap-8 min-w-0">
      {/* BTC Price */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Live BTC Price</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex gap-3 items-end">
            <div className="flex flex-col gap-2 flex-1">
              <Label htmlFor="btcPrice">BTC / USD</Label>
              <Input
                id="btcPrice"
                type="number"
                min={0}
                value={manualPrice}
                onChange={(e) => handleManualPrice(e.target.value)}
                placeholder="Loading..."
              />
            </div>
            <Button
              variant="outline"
              onClick={fetchPrice}
              disabled={priceLoading}
              className="shrink-0"
            >
              {priceLoading ? "Fetching..." : "Refresh"}
            </Button>
          </div>
          {priceError && (
            <p className="text-xs text-destructive">
              Could not fetch live price. Enter it manually above.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Loan inputs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Position</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="btcCollateral">BTC Collateral</Label>
            <Input
              id="btcCollateral"
              type="number"
              min={0}
              step={0.001}
              value={inputs.btcCollateral}
              onChange={(e) => handleChange("btcCollateral", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="loanBalance">Loan Balance ($)</Label>
            <Input
              id="loanBalance"
              type="number"
              min={0}
              value={inputs.loanBalance}
              onChange={(e) => handleChange("loanBalance", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="liquidationThreshold">
              Liquidation Threshold (%)
            </Label>
            <Input
              id="liquidationThreshold"
              type="number"
              min={1}
              max={100}
              step={1}
              value={inputs.liquidationThreshold}
              onChange={(e) =>
                handleChange("liquidationThreshold", e.target.value)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <>
          {/* Status banner */}
          {isLiquidated && (
            <div className="rounded-lg border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive font-medium">
              Position is at or above the liquidation threshold. Margin call
              risk is active.
            </div>
          )}
          {isWarning && (
            <div className="rounded-lg border border-yellow-500 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-500 font-medium">
              Approaching liquidation threshold — within 15% of your limit.
            </div>
          )}

          {/* LTV gauge */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">LTV Health</CardTitle>
            </CardHeader>
            <CardContent>
              <LtvGauge
                ltv={results.currentLtv}
                threshold={inputs.liquidationThreshold}
              />
            </CardContent>
          </Card>

          {/* Key metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Current LTV
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p
                  className={`text-3xl font-bold ${
                    isLiquidated
                      ? "text-destructive"
                      : isWarning
                        ? "text-yellow-500"
                        : "text-primary"
                  }`}
                >
                  {results.currentLtv.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Loan ÷ collateral value
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Liquidation Price
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-destructive">
                  {fmt(results.liquidationPrice)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  BTC price that triggers margin call
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Drop to Liquidation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p
                  className={`text-3xl font-bold ${isLiquidated ? "text-destructive" : "text-foreground"}`}
                >
                  {isLiquidated
                    ? "—"
                    : `${results.percentDropToLiquidation.toFixed(1)}%`}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isLiquidated
                    ? "Already liquidated"
                    : `${fmt(results.dollarDropToLiquidation)} price decline`}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Collateral Value
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {fmt(results.collateralValue)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {inputs.btcCollateral} BTC @ {fmt(btcPrice!)}
                </p>
              </CardContent>
            </Card>
          </div>

          <p className="text-xs text-muted-foreground">
            Liquidation price assumes your lender calls the loan exactly at the
            threshold LTV. Actual liquidation terms vary by lender. This is not
            financial advice.
          </p>
        </>
      )}
    </div>
  );
}
