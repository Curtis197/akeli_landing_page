export default function CreatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 shrink-0 border-r hidden lg:block p-6">
        <div className="text-lg font-bold text-primary mb-6">Akeli Creator</div>
        <nav className="space-y-1">
          {[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Mes recettes", href: "/dashboard/recipes" },
            { label: "Messages", href: "/chat" },
            { label: "Mon profil", href: "/profile" },
            { label: "Mode Fan", href: "/fan-mode" },
            { label: "Paramètres", href: "/settings" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
