import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ImageMaxxing App - Professional Photo Enhancement",
  description: "Turn average photos into dating profile & social media ready images",
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
