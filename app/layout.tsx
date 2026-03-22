import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Provider";
import { AppShell } from "@/components/AppShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  icons: {
    icon: "/logo.svg",
  },
  title: {
    default: "PicklePerps - Decentralized Perpetual Trading on Stellar Network",
    template: "%s | PicklePerps",
  },
  description:
    "PicklePerps is the leading decentralized perpetual trading platform (DEX) on Stellar Network. Trade crypto with up to 100x leverage, create tokens, copy trade top traders, and earn rewards. The best perps DEX on Stellar.",
  keywords: [
    "PicklePerps",
    "Pickle Perps",
    "pickle",
    "perps",
    "perpetual trading",
    "decentralized exchange",
    "DEX",
    "Stellar",
    "Stellar Network",
    "Stellar DEX",
    "Soroban",
    "crypto trading",
    "leverage trading",
    "100x leverage",
    "copy trading",
    "DeFi",
    "decentralized finance",
    "token trading",
    "perpetuals",
    "futures trading",
    "crypto derivatives",
    "XLM",
  ],
  authors: [{ name: "PicklePerps Team" }],
  creator: "PicklePerps",
  publisher: "PicklePerps",
  metadataBase: new URL("https://pickle-perps-lilac.vercel.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://pickle-perps-lilac.vercel.app",
    siteName: "PicklePerps",
    title: "PicklePerps - Decentralized Perpetual Trading on Stellar Network",
    description:
      "Trade crypto perpetuals with up to 100x leverage on Stellar Network. Create tokens, copy trade, and earn rewards on the leading Stellar DEX.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "PicklePerps - Decentralized Perpetual Trading Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PicklePerps - Decentralized Perpetual Trading on Stellar",
    description:
      "Trade crypto perpetuals with up to 100x leverage on Stellar Network. The leading perps DEX on Stellar.",
    images: ["/og-image.png"],
    creator: "@PicklePerps",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-verification-code",
  },
  category: "DeFi",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "PicklePerps",
  alternateName: ["Pickle Perps", "Pickle", "Perps"],
  description:
    "PicklePerps is the leading decentralized perpetual trading platform (DEX) on Stellar Network. Trade crypto with up to 100x leverage.",
  url: "https://pickle-perps-lilac.vercel.app",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    ratingCount: "1000",
  },
  provider: {
    "@type": "Organization",
    name: "PicklePerps",
    url: "https://pickle-perps-lilac.vercel.app",
    logo: "https://pickle-perps-lilac.vercel.app/pickle-perps-logo.png",
    sameAs: [
      "https://twitter.com/PicklePerps",
      "https://discord.gg/pickleperps",
      "https://t.me/pickleperps",
    ],
  },
  keywords:
    "stella, perps, pickleperps, perpetual trading, DEX, Stellar, Stellar Network, Stellar DEX, Soroban, crypto trading, leverage trading, DeFi, XLM",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <AppShell>
            {children}
          </AppShell>
        </Providers>
      </body>
    </html>
  );
}
