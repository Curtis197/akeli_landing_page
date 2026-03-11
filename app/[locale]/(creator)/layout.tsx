import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import CreatorMobileNav from "@/components/layout/CreatorMobileNav";

export default async function CreatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("nav");

  const navItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: t("myRecipes"), href: "/dashboard/recipes" },
    { label: t("chat"), href: "/chat" },
    { label: t("profile"), href: "/profile" },
    { label: t("fanMode"), href: "/fan-mode" },
    { label: t("settings"), href: "/settings" },
  ];

  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      <CreatorMobileNav items={navItems} logoutText={t("logout")} />
      <aside className="w-64 shrink-0 border-r hidden lg:block p-6">
        <div className="text-lg font-bold text-primary mb-6">Akeli Creator</div>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
