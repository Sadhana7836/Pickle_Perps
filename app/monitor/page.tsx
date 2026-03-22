"use client"

import { PageLayout } from "@/components/PageLayout"

interface ServiceStatus {
  name: string
  status: "Operational" | "Degraded" | "Down"
  uptime: number // percentage
  contractAddress?: string
}

// Real contract addresses on Stellar Testnet
const services: ServiceStatus[] = [
  {
    name: "Stellar Testnet - Network",
    status: "Operational",
    uptime: 100,
  },
  {
    name: "Perpetual Trading Contract",
    status: "Operational",
    uptime: 100,
    contractAddress: "CBRWI2CCKLT225CTB3GKC7QIOGVRSLXFYW4FDBK7SWY744HSLWQ35QJM",
  },
  {
    name: "Token Factory",
    status: "Operational",
    uptime: 100,
    contractAddress: "CBAHPW7BGC63QFIN4ZRUGEQDVAZQOXVP67AVZPDQNRHN7EZXAOZAJB4O",
  },
  {
    name: "Bonding Curve Market",
    status: "Operational",
    uptime: 100,
    contractAddress: "CDEMRBGQK55F5HHLXF67IOUWFUSLIOE5YULDMLYXH3A4QXOPT73AAP5T",
  },
  {
    name: "Pike Token (Template)",
    status: "Operational",
    uptime: 100,
    contractAddress: "CD7Q7ISZECAJDAZMHSH5CMLDEWHZ6HZ6F3YGYHM3K6552UKFQE2CWOMW",
  },
  {
    name: "PicklePerps WebApp",
    status: "Operational",
    uptime: 100,
  },
]

// Static uptime bars data (90 days)
const UPTIME_DAYS = 90

function UptimeBar({ status }: { status: ServiceStatus["status"] }) {
  const getBarColor = () => {
    if (status === "Operational") return "bg-[var(--accent-green)]"
    if (status === "Degraded") return "bg-[var(--accent-yellow)]"
    return "bg-[var(--accent-red)]"
  }

  return (
    <div className="flex gap-[2px]">
      {Array.from({ length: UPTIME_DAYS }).map((_, i) => (
        <div
          key={i}
          className={`w-[3px] h-8 rounded-sm ${getBarColor()}`}
        />
      ))}
    </div>
  )
}

function ServiceRow({ service }: { service: ServiceStatus }) {
  const statusColor =
    service.status === "Operational"
      ? "text-[var(--accent-green)]"
      : service.status === "Degraded"
      ? "text-[var(--accent-yellow)]"
      : "text-[var(--accent-red)]"

  return (
    <div className="bg-[var(--sidebar-bg)] border-b border-[var(--card-bg)] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-white font-medium">{service.name}</span>
          {service.contractAddress && (
            <a
              href={`https://stellar.expert/explorer/testnet/contract/${service.contractAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[var(--text-muted)] hover:text-[var(--accent-primary)] font-mono"
            >
              {service.contractAddress.slice(0, 8)}…
            </a>
          )}
        </div>
        <span className={`text-sm font-medium ${statusColor}`}>{service.status}</span>
      </div>

      {/* Uptime Bar */}
      <UptimeBar status={service.status} />

      {/* Footer */}
      <div className="flex items-center justify-between mt-2 text-xs text-[var(--text-muted)]">
        <span>90 days ago</span>
        <span>{service.uptime.toFixed(1)} % uptime</span>
        <span>Today</span>
      </div>
    </div>
  )
}

export default function MonitorPage() {
  const allOperational = services.every((s) => s.status === "Operational")

  return (
    <PageLayout title="Monitor">
      <div className="max-w-4xl mx-auto">
        {/* Status Banner */}
        <div
          className={`rounded-lg p-4 mb-6 text-center font-medium text-lg ${
            allOperational
              ? "bg-[var(--accent-primary)] text-white"
              : "bg-[var(--accent-red)] text-white"
          }`}
        >
          {allOperational ? "All Systems Operational" : "Some Systems Experiencing Issues"}
        </div>

        {/* Uptime Info */}
        <div className="text-right mb-4">
          <span className="text-[var(--text-muted)] text-sm">
            Uptime over the past 90 days.
          </span>
        </div>

        {/* Service List */}
        <div className="bg-[var(--sidebar-bg)] rounded-lg border border-[var(--card-bg)] overflow-hidden">
          {services.map((service, index) => (
            <ServiceRow key={index} service={service} />
          ))}
        </div>

        {/* Network Info */}
        <div className="text-center mt-6">
          <span className="text-[var(--text-muted)] text-sm">
            Network: Stellar Testnet
          </span>
        </div>
      </div>
    </PageLayout>
  )
}
