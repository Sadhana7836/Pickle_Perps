"use client";

export function TokenCardSkeleton() {
  return (
    <div className="bg-[var(--sidebar-bg)] border border-[var(--card-bg)] rounded-lg p-3 animate-pulse">
      <div className="flex items-start gap-2.5">
        <div className="w-24 h-24 rounded-lg bg-[var(--card-bg)]" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-[var(--card-bg)] rounded w-3/4" />
          <div className="h-3 bg-[var(--card-bg)] rounded w-1/2" />
          <div className="h-3 bg-[var(--card-bg)] rounded w-2/3" />
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-[var(--card-bg)] rounded w-16" />
          <div className="h-4 bg-[var(--card-bg)] rounded w-16" />
        </div>
      </div>
    </div>
  );
}

export function PortfolioCardSkeleton() {
  return (
    <div className="bg-gradient-to-br from-[var(--card-bg)] to-[var(--background)] rounded-xl p-5 border border-[var(--card-border)] animate-pulse">
      <div className="h-4 bg-[var(--card-border)] rounded w-24 mb-2" />
      <div className="h-8 bg-[var(--card-border)] rounded w-32 mb-1" />
      <div className="h-3 bg-[var(--card-border)] rounded w-20" />
    </div>
  );
}

export function GraphSkeleton() {
  return (
    <div className="bg-[var(--card-bg)] rounded-xl p-5 border border-[var(--card-border)] animate-pulse">
      <div className="h-5 bg-[var(--card-border)] rounded w-32 mb-4" />
      <div className="h-[400px] bg-[var(--background)] rounded" />
    </div>
  );
}

