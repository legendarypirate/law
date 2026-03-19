import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { AppSidebar } from "@/components/AppSidebar";

const nunito = Nunito({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Хууль зүйн портал",
  description: "Хэрэг, харилцагч, хэрэглэгчийн удирдлага",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="mn" className={nunito.variable}>
      <body className="min-h-screen antialiased font-sans">
        <div className="flex min-h-screen bg-muted/30">
          <AppSidebar />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
