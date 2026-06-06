import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Invalid salary ID" }, { status: 400 })
    }

    const salary = await prisma.salary.findUnique({
      where: { id },
      include: { company: true, user: { select: { id: true, email: true } } },
    })

    if (!salary) {
      return NextResponse.json({ error: "Salary not found" }, { status: 404 })
    }

    return NextResponse.json(salary)
  } catch (error) {
    console.error("Get salary error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
