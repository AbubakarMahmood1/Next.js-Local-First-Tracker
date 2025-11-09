import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const createApplicationSchema = z.object({
  company: z.string().min(1),
  position: z.string().min(1),
  location: z.string().optional(),
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
  status: z.enum([
    "WISHLIST",
    "APPLIED",
    "SCREENING",
    "INTERVIEW",
    "OFFER",
    "REJECTED",
  ]),
  applicationDate: z.string().optional(),
  deadline: z.string().optional(),
  followUpDate: z.string().optional(),
  url: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: any = {
      userId: session.user.id,
    };

    if (status && status !== "ALL") {
      where.status = status;
    }

    const applications = await prisma.application.findMany({
      where,
      orderBy: {
        updatedAt: "desc",
      },
      include: {
        contacts: true,
        documents: true,
      },
    });

    return NextResponse.json(applications);
  } catch (error) {
    console.error("Get applications error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = createApplicationSchema.parse(body);

    const application = await prisma.application.create({
      data: {
        ...data,
        userId: session.user.id,
        applicationDate: data.applicationDate
          ? new Date(data.applicationDate)
          : null,
        deadline: data.deadline ? new Date(data.deadline) : null,
        followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
      },
      include: {
        contacts: true,
        documents: true,
      },
    });

    return NextResponse.json(application, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Create application error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
