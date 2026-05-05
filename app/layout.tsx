import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "SehatDost AI | AI-powered claims workflow system for hospitals",
  description:
    "SehatDost AI helps hospitals streamline insurance workflows, reduce errors, and improve discharge experiences."
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="bg-white text-ink antialiased">{children}</body>
    </html>
  );
}
