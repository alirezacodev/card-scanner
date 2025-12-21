import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Car Card Extractor",
  description: "Capture or upload a car card and extract structured data"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

