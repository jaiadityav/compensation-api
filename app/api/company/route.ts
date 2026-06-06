/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const companies = await prisma.company.findMany({
      include: { salaries: true },
      orderBy: { name: "asc" },
    })

    const result = companies.map((c: any) => {
      const count = c.salaries.length
      const avgTotal = count > 0 ? c.salaries.reduce((s: number, r: any) => s + r.total, 0) / count : 0
      const avgBase = count > 0 ? c.salaries.reduce((s: number, r: any) => s + r.base, 0) / count : 0
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