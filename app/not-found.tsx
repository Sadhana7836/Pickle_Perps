import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">404</h1>
        <p className="text-[var(--text-muted)] mb-6">Page not found</p>
        <Link
          href="/"
          className="px-4 py-2 bg-[var(--accent-primary)] text-black font-medium rounded-lg hover:bg-[var(--accent-primary)]/80 transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
