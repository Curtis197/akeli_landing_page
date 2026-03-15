"use client";

import { useState } from "react";
import { Link, usePathname, useRouter } from "@/lib/i18n/navigation";
import { useAuthStore } from "@/lib/stores/authStore";
import { createClient } from "@/lib/supabase/client";

interface NavItem {
  label: string;
  href: string;
}

export default function CreatorMobileNav({ items, logoutText }: { items: NavItem[], logoutText: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { reset } = useAuthStore();

  async function handleLogout() {
    await supabase.auth.signOut();
    reset();
    router.push("/auth/login");
  }

  return (
    <div className="lg:hidden border-b border-border bg-background sticky top-0 z-40">
      <div className="flex items-center justify-between px-4 h-14">
        <Link href="/" className="text-lg font-bold text-primary hover:opacity-80 transition-opacity">Akeli Creator</Link>
        <button
          className="p-2 -mr-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          {open ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {open && (
        <div className="px-4 py-3 border-t border-border bg-background space-y-1">
          {items.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <div className="pt-2 border-t border-border mt-2">
            <button
              onClick={() => { handleLogout(); setOpen(false); }}
              className="block w-full text-left px-3 py-2 rounded-md text-sm font-medium text-destructive hover:text-destructive-foreground hover:bg-destructive/10 transition-colors"
            >
              {logoutText}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
