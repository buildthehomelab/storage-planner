import type { Metadata } from "next";
import { Barlow_Condensed, Rubik, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-display",
});
const rubik = Rubik({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Storage Planner",
  description: "Plan and visualize your RAID storage configuration.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${barlowCondensed.variable} ${rubik.variable} ${jetbrainsMono.variable}`}>
        <main>{children}</main>
      </body>
    </html>
  );
}
