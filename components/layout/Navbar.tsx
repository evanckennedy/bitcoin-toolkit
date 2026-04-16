"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const navLinks = [
  { label: "Fiat Calculator", href: "/tools/fiat-calculator" },
  { label: "LTV Monitor", href: "/tools/ltv-monitor" },
  { label: "STRC Arbitrage", href: "/tools/strc-arbitrage" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <Link href="/" className="font-bold text-lg tracking-tight">
          ₿ Bitcoin Toolkit
        </Link>

        {/* Desktop links */}
        <ul className="hidden md:flex gap-6 text-sm text-muted-foreground">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Mobile hamburger */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="px-6 pt-3 pb-6">
            <div className="flex items-center justify-between pr-8">
              <SheetTitle className="font-bold text-lg">
                ₿ Bitcoin Toolkit
              </SheetTitle>
            </div>
            <ul className="mt-8 flex flex-col gap-4 text-base">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  );
}
