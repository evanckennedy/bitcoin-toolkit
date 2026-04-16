export default function FiatCalculatorPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Fiat Shorting Calculator</h1>
        <p className="text-muted-foreground mt-2">
          Visualize how debt melts in real terms while Bitcoin grows. Enter your
          loan details and expected growth rates to see your real cost of debt
          over time.
        </p>
      </div>
      {/* Tool inputs go here */}
    </main>
  );
}
