import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "me-imagemaxxing",
  description: "Upload one photo and generate exactly five identity-safe editing attempts.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
