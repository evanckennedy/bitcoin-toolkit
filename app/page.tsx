import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const tools = [
  {
    title: "Fiat Shorting Calculator",
    description:
      "Visualize how debt melts in real terms while Bitcoin grows. See why borrowing at 10% to hold Bitcoin at 40% growth makes the real cost of your debt negative.",
    href: "/tools/fiat-calculator",
    cta: "Calculate my Speculative Attack",
  },
  {
    title: "LTV Safety Monitor",
    description:
      "Know your liquidation price before the market does. Input your collateral and loan details to monitor how close you are to a margin call in real time.",
    href: "/tools/ltv-monitor",
    cta: "Monitor my LTV",
  },
  {
    title: "STRC Arbitrage Tool",
    description:
      "Borrow at 8%, earn 11.5% from STRC dividends, and use the spread to auto-stack Bitcoin to cold storage. See the numbers behind Saylor's playbook.",
    href: "/tools/strc-arbitrage",
    cta: "Run the Arbitrage",
  },
];

export default function Home() {
  return (
    <main className="flex flex-col items-center px-6 py-20">
      <div className="max-w-3xl w-full flex flex-col gap-10">
        <div className="flex flex-col gap-3">
          <h1 className="text-4xl font-bold tracking-tight">Bitcoin Toolkit</h1>
          <p className="text-muted-foreground text-lg">
            Tools to help you stack more sats, manage risk, and outpace
            inflation.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <Card key={tool.href} className="flex flex-col justify-between">
              <CardHeader>
                <CardTitle>{tool.title}</CardTitle>
                <CardDescription>{tool.description}</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link href={tool.href}>{tool.cta}</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
