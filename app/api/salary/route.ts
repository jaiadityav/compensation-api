import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUser, unauthorizedResponse } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request)
    if (!user) return unauthorizedResponse()

    const body = await request.json()
    let { company, role, level, location, base, bonus, stock } = body

    if (!company || !role || !level || !location || base === undefined || base === null) {
      return NextResponse.json({ error: "Missing required fields: company, role, level, location, base" }, { status: 400 })
    }

    if (typeof company !== "string" || typeof role !== "string" || typeof level !== "string" || typeof location !== "string") {
      return NextResponse.json({ error: "company, role, level, location must be strings" }, { status: 400 })
    }

    base = Number(base)
    if (isNaN(base) || base <= 0) {
      return NextResponse.json({ error: "base must be a positive number" }, { status: 400 })
    }

    bonus = bonus !== undefined && bonus !== null ? Number(bonus) : 0
    stock = stock !== undefined && stock !== null ? Number(stock) : 0

    if (isNaN(bonus) || isNaN(stock)) {
      return NextResponse.json({ error: "bonus and stock must be valid numbers" }, { status: 400 })
    }

    if (bonus < 0 || stock < 0) {
      return NextResponse.json({ error: "bonus and stock cannot be negative" }, { status: 400 })
    }

    const total = base + bonus + stock

    const normalizedName = company.toLowerCase().trim()

    const companyRecord = await prisma.company.upsert({
      where: { name: normalizedName },
      update: {},
      create: { name: normalizedName },
    })

    const existing = await prisma.salary.findFirst({
      where: {
        userId: user.userId,
        companyId: companyRecord.id,
        role,
        level,
        location,
      },
    })

    if (existing) {
      return NextResponse.json({ error: "Duplicate salary entry exists" }, { status: 409 })
    }

    const salary = await prisma.salary.create({
      data: {
        userId: user.userId,
        companyId: companyRecord.id,
        role,
        level,
        location,
        base,
        bonus,
        stock,
        total,
      },
      include: { company: true },
    })

    return NextResponse.json(salary, { status: 201 })
  } catch (error) {
    console.error("Create salary error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const role = searchParams.get("role")
    const level = searchParams.get("level")
    const location = searchParams.get("location")
    const company = searchParams.get("company")
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10")))

    const where: Record<string, unknown> = {}

    if (role) where.role = role
    if (level) where.level = level
    if (location) where.location = location
    if (company) {
      where.company = { name: { contains: company.toLowerCase().trim() } }
    }

    const [salaries, total] = await Promise.all([
      prisma.salary.findMany({
        where,
        include: { company: true, user: { select: { id: true, email: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.salary.count({ where }),
    ])

    return NextResponse.json({
      data: salaries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Get salaries error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
