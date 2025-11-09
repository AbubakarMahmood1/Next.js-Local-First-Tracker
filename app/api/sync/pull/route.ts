import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const lastSyncedAt = searchParams.get("lastSyncedAt");

    const where: any = {
      userId: session.user.id,
    };

    // If lastSyncedAt is provided, only get updated items
    if (lastSyncedAt) {
      where.updatedAt = {
        gt: new Date(lastSyncedAt),
      };
    }

    const [applications, contacts, documents] = await Promise.all([
      prisma.application.findMany({
        where,
        orderBy: {
          updatedAt: "desc",
        },
      }),
      prisma.contact.findMany({
        where: {
          application: {
            userId: session.user.id,
          },
        },
      }),
      prisma.document.findMany({
        where: {
          application: {
            userId: session.user.id,
          },
        },
      }),
    ]);

    return NextResponse.json({
      applications,
      contacts,
      documents,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Pull error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
