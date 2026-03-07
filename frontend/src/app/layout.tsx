import "./globals.css";
import type { Metadata } from "next";
import Header from "./components/Header";

export const metadata: Metadata = {
  title: "Sistema de Pedidos",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <Header />
        <main style={{ padding: 24 }}>{children}</main>
      </body>
    </html>
  );
}