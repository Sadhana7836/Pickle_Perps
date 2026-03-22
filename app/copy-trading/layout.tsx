import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Copy Trading",
  description:
    "Copy trade top performers on PicklePerps. Automatically mirror the trades of successful traders on Stellar Network and earn profits.",
  keywords: [
    "copy trading",
    "copy trade",
    "social trading",
    "mirror trading",
    "PicklePerps copy",
    "Stellar copy trading",
  ],
  openGraph: {
    title: "Copy Trading | PicklePerps",
    description:
      "Automatically copy the trades of top performers on PicklePerps Stellar DEX.",
  },
};

export default function CopyTradingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
