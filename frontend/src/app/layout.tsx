import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Scolar Sense — AI-Powered Systematic Literature Review",
  description: "Structured, verifiable, multi-document analysis platform for systematic literature reviews",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar />
        <main style={{ flex: 1, padding: "32px", overflowY: "auto", marginLeft: "260px" }}>
          <div className="page-enter">{children}</div>
        </main>
      </body>
    </html>
  );
}
