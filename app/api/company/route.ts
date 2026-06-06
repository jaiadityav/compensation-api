// @ts-nocheck
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const companies = await prisma.company.findMany({
      include: { salaries: true },
      orderBy: { name: "asc" },
    })

    const result = companies.map((c: { salaries: { total: number; base: number }[]; id: string; name: string }) => {
      const count = c.salaries.length
      const avgTotal = count > 0 ? c.salaries.reduce((s: number, r: { total: number }) => s + r.total, 0) / count : 0
      const avgBase = count > 0 ? c.salaries.reduce((s: number, r: { base: number }) => s + r.base, 0) / count : 0
      return {
        id: c.id,
        name: c.name,
        salaryCount: count,
        avgTotal: Math.round(avgTotal * 100) / 100,
        avgBase: Math.round(avgBase * 100) / 100,
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Get companies error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
