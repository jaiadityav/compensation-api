import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const company = searchParams.get("company")
    const role = searchParams.get("role")
    const level = searchParams.get("level")

    const where: Record<string, unknown> = {}

    if (company) where.company = { name: { contains: company.toLowerCase().trim() } }
    if (role) where.role = role
    if (level) where.level = level

    const salaries = await prisma.salary.findMany({
      where,
      include: { company: true },
      orderBy: { total: "desc" },
    })

    if (salaries.length === 0) {
      return NextResponse.json({ message: "No matching salaries found", data: [] })
    }

    const totals = salaries.map((s: any) => s.total)
    const avgTotal = totals.reduce((a: number, b: number) => a + b, 0) / totals.length
    const sorted = [...totals].sort((a: number, b: number) => a - b)
    const mid = Math.floor(sorted.length / 2)
    const medianTotal = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]

    const byCompany: Record<string, { salaries: typeof salaries; avgTotal: number; count: number }> = {}

    for (const s of salaries) {
      const key = s.company.name
      if (!byCompany[key]) byCompany[key] = { salaries: [], avgTotal: 0, count: 0 }
      byCompany[key].salaries.push(s)
      byCompany[key].count++
    }

    for (const key of Object.keys(byCompany)) {
      const group = byCompany[key]
      group.avgTotal = Math.round((group.salaries.reduce((s: number, r: any) => s + r.total, 0) / group.count) * 100) / 100
    }

    const percentiles = {
      p25: sorted[Math.floor(sorted.length * 0.25)],
      p50: medianTotal,
      p75: sorted[Math.floor(sorted.length * 0.75)],
    }

    return NextResponse.json({
      count: salaries.length,
      avgTotal: Math.round(avgTotal * 100) / 100,
      medianTotal: Math.round(medianTotal * 100) / 100,
      minTotal: sorted[0],
      maxTotal: sorted[sorted.length - 1],
      percentiles,
      byCompany,
      data: salaries,
    })
  } catch (error) {
    console.error("Compare error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}