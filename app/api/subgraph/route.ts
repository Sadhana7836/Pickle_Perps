import { NextResponse } from "next/server"

// Subgraph is no longer used - Stellar data is fetched directly from Soroban contracts
// This route is kept as a stub to prevent 404 errors from any remaining references

export async function POST() {
  return NextResponse.json({
    data: { tokens: [], trades: [], positions: [] },
  })
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Subgraph not used - data is fetched directly from Soroban contracts on Stellar",
  })
}
