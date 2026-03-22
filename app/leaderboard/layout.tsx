import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Leaderboard",
  description:
    "View top traders on PicklePerps leaderboard. See rankings, PnL, win rates, and trading volumes of the best performers on Stellar Network.",
  keywords: [
    "trading leaderboard",
    "top traders",
    "PicklePerps leaderboard",
    "crypto rankings",
    "Stellar traders",
  ],
  openGraph: {
    title: "Leaderboard | PicklePerps",
    description:
      "See the top performing traders on PicklePerps Stellar DEX leaderboard.",
  },
};

export default function LeaderboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
