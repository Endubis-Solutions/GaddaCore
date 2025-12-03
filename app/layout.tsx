import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { MeshProviderWrapper } from "@/contexts/MeshProviderWrapper"

// import "@meshsdk/react/styles.css";
import "./globals.css";
import { WalletProvider } from "@/contexts/WalletContext";
import ReactQueryClientProvider from "@/contexts/QueryClientProvider";
import AppHeader from "@/components/custom/AppHeader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bun + Next.js + shadcn/ui Template",
  description: "A modern template with Bun runtime, Next.js framework, and beautiful shadcn/ui components",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <MeshProviderWrapper>
          <ReactQueryClientProvider>
            <WalletProvider>
              <AppHeader />
              {children}
            </WalletProvider>
          </ReactQueryClientProvider>
        </MeshProviderWrapper>
      </body>
    </html>
  );
}
