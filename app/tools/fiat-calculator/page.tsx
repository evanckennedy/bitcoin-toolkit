import { FiatCalculatorTool } from "@/components/features/fiat-calculator/FiatCalculatorTool";

export default function FiatCalculatorPage() {
  return (
    <main className="w-full min-w-0 mx-auto max-w-3xl px-4 sm:px-6 py-16 flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Fiat Shorting Calculator</h1>
        <p className="text-muted-foreground mt-2">
          Visualize how debt melts in real terms while Bitcoin grows. Enter your
          loan details and expected growth rates to see your real cost of debt
          over time.
        </p>
      </div>
      <FiatCalculatorTool />
    </main>
  );
}
