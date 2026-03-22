"use client";

import dynamic from 'next/dynamic';

const Dashboard = dynamic(() => import("@/components/Dashboard").then(mod => ({ default: mod.Dashboard })), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen w-full bg-[var(--background)]">
      <div className="w-8 h-8 border-2 border-[var(--accent-green)] border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export default function Home() {
  return <Dashboard />;
}
