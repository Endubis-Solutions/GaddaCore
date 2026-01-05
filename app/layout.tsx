import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { MeshProviderWrapper } from "@/contexts/MeshProviderWrapper";

// import "@meshsdk/react/styles.css";
import "./globals.css";
import { WalletProvider } from "@/contexts/WalletContext";
import ReactQueryClientProvider from "@/contexts/QueryClientProvider";
import AppHeader from "@/components/custom/AppHeader";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GaddaCore | Secure Cardano Escrow Platform",
  description:
    "Decentralized escrow service on Cardano. Create trustless agreements, secure ADA payments with smart contracts, and ensure fair transactions without intermediaries.",
  // openGraph: {
  //   title: "GaddaCore | Secure Cardano Escrow Platform",
  //   description: "Decentralized escrow service on Cardano blockchain",
  //   type: "website",
  //   url: "https://gadda-core.vercel.app",
  //   siteName: "GaddaCore",
  //   images: [
  //     {
  //       url: "/og-image.svg",
  //       width: 1200,
  //       height: 630,
  //       alt: "GaddaCore Cardano Escrow Platform",
  //     },
  //   ],
  // },
  // twitter: {
  //   card: "summary_large_image",
  //   title: "GaddaCore | Secure Cardano Escrow Platform",
  //   description: "Decentralized escrow service on Cardano blockchain",
  //   images: ["/twitter-image.png"],
  //   creator: "@gaddacore",
  // },
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

        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
