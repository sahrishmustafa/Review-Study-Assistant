"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/papers", label: "Papers", icon: "📄" },
  { href: "/extraction", label: "Extraction", icon: "🔍" },
  { href: "/matrix", label: "Matrix", icon: "📋" },
  { href: "/analytics", label: "Analytics", icon: "📈" },
  { href: "/clusters", label: "Clusters", icon: "🧬" },
  { href: "/conflicts", label: "Conflicts", icon: "⚠️" },
  { href: "/zotero", label: "Zotero", icon: "📚" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: 260,
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        background: "var(--bg-secondary)",
        borderRight: "1px solid var(--border-color)",
        display: "flex",
        flexDirection: "column",
        padding: "24px 0",
        zIndex: 50,
      }}
    >
      {/* Logo */}
      <div style={{ padding: "0 24px", marginBottom: 40 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>
          <span className="gradient-text">SLR</span>{" "}
          <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>Platform</span>
        </h1>
        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, letterSpacing: "0.05em" }}>
          SYSTEMATIC LITERATURE REVIEW
        </p>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1 }}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 24px",
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "var(--accent-blue)" : "var(--text-secondary)",
                background: isActive ? "rgba(79, 142, 255, 0.08)" : "transparent",
                borderRight: isActive ? "3px solid var(--accent-blue)" : "3px solid transparent",
                textDecoration: "none",
                transition: "all 0.2s",
              }}
            >
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border-color)" }}>
        <p style={{ fontSize: 11, color: "var(--text-muted)" }}>v1.0.0 • AI-Powered</p>
      </div>
    </aside>
  );
}
