import { StrcArbitrageTool } from "@/components/features/strc-arbitrage/StrcArbitrageTool";

export default function StrcArbitragePage() {
  return (
    <main className="w-full min-w-0 mx-auto max-w-3xl px-4 sm:px-6 py-16 flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">STRC Arbitrage Tool</h1>
        <p className="text-muted-foreground mt-2">
          Borrow fiat, earn STRC dividends, deploy the spread. Compare stacking
          Bitcoin directly against compounding your STRC position over time.
        </p>
      </div>
      <StrcArbitrageTool />
    </main>
  );
}
