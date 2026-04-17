import { LtvMonitorTool } from "@/components/features/ltv-monitor/LtvMonitorTool";

export default function LtvMonitorPage() {
  return (
    <main className="w-full min-w-0 mx-auto max-w-3xl px-4 sm:px-6 py-16 flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">LTV Safety Monitor</h1>
        <p className="text-muted-foreground mt-2">
          Know your liquidation price before the market does. Input your
          collateral and loan details to track how close you are to a margin
          call.
        </p>
      </div>
      <LtvMonitorTool />
    </main>
  );
}
