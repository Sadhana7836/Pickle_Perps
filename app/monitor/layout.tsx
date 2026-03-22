import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Monitor",
  description:
    "Monitor wallets and trades in real-time on PicklePerps. Track whale movements, smart money, and trading activity on Stellar Network.",
  keywords: [
    "wallet monitor",
    "whale tracker",
    "trade monitor",
    "PicklePerps monitor",
    "Stellar tracker",
  ],
  openGraph: {
    title: "Monitor | PicklePerps",
    description:
      "Monitor wallets and track trading activity in real-time on PicklePerps.",
  },
};

export default function MonitorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
