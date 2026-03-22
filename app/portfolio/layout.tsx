import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portfolio",
  description:
    "Track your crypto portfolio on PicklePerps. View your positions, PnL, trading history, and manage your assets on Stellar Network.",
  keywords: [
    "crypto portfolio",
    "portfolio tracker",
    "PicklePerps portfolio",
    "trading portfolio",
    "Stellar portfolio",
  ],
  openGraph: {
    title: "Portfolio | PicklePerps",
    description:
      "Track and manage your crypto portfolio on PicklePerps Stellar DEX.",
  },
};

export default function PortfolioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
