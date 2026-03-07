"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname.startsWith(path);

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 32px",
        background: "white",
        borderBottom: "1px solid #e5e7eb",
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Logo / Título */}
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: 0.5,
        }}
      >
        📋 RecepApp
      </div>

      {/* Navegación */}
      <nav style={{ display: "flex", gap: 18 }}>
        {[
          { href: "/clientes", label: "Clientes" },
          { href: "/items", label: "Items" },
          { href: "/pedidos", label: "Pedidos" },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 500,
              transition: "all 0.2s ease",
              background: isActive(link.href)
                ? "#111827"
                : "transparent",
              color: isActive(link.href)
                ? "white"
                : "#374151",
            }}
            onMouseEnter={(e) => {
              if (!isActive(link.href))
                e.currentTarget.style.background = "#f3f4f6";
            }}
            onMouseLeave={(e) => {
              if (!isActive(link.href))
                e.currentTarget.style.background = "transparent";
            }}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}