
"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/admin/email", label: "Campaigns" },
  { href: "/admin/email/templates", label: "Templates" },
];

export default function EmailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold font-headline">Email Campaigns</h1>
      </div>

      <div className="border-b">
        <nav className="-mb-px flex space-x-4" aria-label="Tabs">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm",
                pathname === item.href
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-6">{children}</div>
    </div>
  );
}
