import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clause — contract clause intelligence",
  description:
    "Segment a contract, match each clause against your playbook, get a calibrated STANDARD / REVIEW / BLOCK verdict with evidence.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
