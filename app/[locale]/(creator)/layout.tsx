"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/lib/i18n/navigation";
import CreatorMobileNav from "@/components/layout/CreatorMobileNav";

export default function CreatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  const navItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: t("myRecipes"), href: "/dashboard/recipes" },
    { label: t("chat"), href: "/chat" },
    { label: t("profile"), href: "/profile" },
    { label: t("fanMode"), href: "/fan-mode" },
    { label: t("settings"), href: "/settings" },
  ];

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-background text-foreground">
      {/* Mobile Nav */}
      <CreatorMobileNav items={navItems} logoutText={t("logout")} />
      
      {/* Desktop Sidebar */}
      <aside className="w-68 shrink-0 hidden lg:flex flex-col border-r border-border/50 bg-secondary/10 p-6 sticky top-0 h-screen overflow-y-auto">
        {/* Branding */}
        <div className="mb-10 px-2">
          <Link href="/" className="text-2xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60 hover:opacity-80 transition-opacity">
            Akeli <span className="text-foreground/80 font-semibold text-lg">Creator</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="space-y-1.5 flex-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 group relative overflow-hidden ${
                  isActive
                    ? "text-primary bg-primary/10 shadow-sm"
                    : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground hover:translate-x-1"
                }`}
              >
                {/* Active Indicator Line */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1/2 w-1 bg-primary rounded-r-full" />
                )}
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom space (could add user profile snippet later) */}
        <div className="pt-6 mt-6 border-t border-border/50">
           <Link href="/" className="flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground hover:text-primary transition-colors">
              <span className="text-xs">←</span> Retour au site
           </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto bg-background/50">
        <div className="max-w-5xl mx-auto p-4 lg:p-8 lg:pt-10">{children}</div>
      </main>
    </div>
  );
}
