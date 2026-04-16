import { SpeculativeAttackTool } from "@/components/features/speculative-attack/SpeculativeAttackTool";

export default function SpeculativeAttackPage() {
  return (
    <main className="w-full min-w-0 mx-auto max-w-3xl px-4 sm:px-6 py-16 flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Speculative Attack Calculator</h1>
        <p className="text-muted-foreground mt-2">
          Compare deferred, interest-only, and amortized loan strategies against
          Bitcoin's growth rate. See your real cost of debt, true net worth, and
          cash efficiency over your chosen time horizon.
        </p>
      </div>
      <SpeculativeAttackTool />
    </main>
  );
}
