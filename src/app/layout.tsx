import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Voice Command ML",
  description: "Voice command intent classification system"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}