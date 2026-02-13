import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "d/acc Map - Place Yourself",
  description: "Interactive map of d/acc sectors. Click to place yourself on the map.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-900">{children}</body>
    </html>
  );
}
