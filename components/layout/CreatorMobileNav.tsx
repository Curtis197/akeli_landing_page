"use client";

import { useState } from "react";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { useAuthStore } from "@/lib/stores/authStore";
import { createClient } from "@/lib/supabase/client";

interface NavItem {
  label: string;
  href: string;
}

export default function CreatorMobileNav({ items, logoutText }: { items: NavItem[], logoutText: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const supabase = createClient();
  const { reset } = useAuthStore();

  async function handleLogout() {
    await supabase.auth.signOut();
    reset();
  }

  return (
    <div className="lg:hidden sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="flex items-center justify-between px-4 h-16">
        <Link href="/" className="text-xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
          Akeli <span className="text-foreground/80 font-semibold text-lg">Creator</span>
        </Link>
        <button
          className="p-2 -mr-2 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          {open ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {open && (
        <div className="absolute top-16 left-0 right-0 px-4 pb-4 bg-background/95 backdrop-blur-xl border-b border-border/50 shadow-2xl rounded-b-2xl overflow-hidden flex flex-col gap-1 origin-top animate-in slide-in-from-top-4 duration-200">
          {items.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-primary/10 text-primary shrink-0"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                }`}
              >
                {/* Active Indicator Line for Mobile */}
                {isActive && (
                  <div className="w-1 h-4 bg-primary rounded-full mr-1" />
                )}
                {item.label}
              </Link>
            );
          })}
          <div className="pt-3 mt-1 border-t border-border/50">
            <button
              onClick={() => { handleLogout(); setOpen(false); }}
              className="flex items-center w-full px-4 py-3 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              {logoutText}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
