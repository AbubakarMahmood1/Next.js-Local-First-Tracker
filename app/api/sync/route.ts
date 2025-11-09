import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const syncOperationSchema = z.object({
  operation: z.enum(["CREATE", "UPDATE", "DELETE"]),
  entity: z.enum(["application", "contact", "document"]),
  entityId: z.string(),
  data: z.any(),
  timestamp: z.number(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { operation, entity, entityId, data, timestamp } =
      syncOperationSchema.parse(body);

    let result: any = null;
    let conflict = false;

    if (entity === "application") {
      if (operation === "CREATE") {
        // Check if application already exists (might have been synced from another device)
        const existing = await prisma.application.findUnique({
          where: { id: entityId },
        });

        if (existing) {
          // Check for conflict
          const serverTimestamp = new Date(existing.updatedAt).getTime();
          if (serverTimestamp > timestamp) {
            conflict = true;
            result = existing;
          } else {
            // Update with client data
            result = await prisma.application.update({
              where: { id: entityId },
              data: {
                ...data,
                userId: session.user.id,
                lastSyncedAt: new Date(),
              },
            });
          }
        } else {
          // Create new
          result = await prisma.application.create({
            data: {
              ...data,
              id: entityId,
              userId: session.user.id,
              lastSyncedAt: new Date(),
            },
          });
        }
      } else if (operation === "UPDATE") {
        const existing = await prisma.application.findUnique({
          where: { id: entityId },
        });

        if (!existing) {
          return NextResponse.json(
            { error: "Application not found" },
            { status: 404 }
          );
        }

        // Check if user owns this application
        if (existing.userId !== session.user.id) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Check for conflict
        const serverTimestamp = new Date(existing.updatedAt).getTime();
        if (serverTimestamp > timestamp) {
          conflict = true;
          result = existing;
        } else {
          result = await prisma.application.update({
            where: { id: entityId },
            data: {
              ...data,
              lastSyncedAt: new Date(),
              version: existing.version + 1,
            },
          });
        }
      } else if (operation === "DELETE") {
        const existing = await prisma.application.findUnique({
          where: { id: entityId },
        });

        if (existing && existing.userId === session.user.id) {
          await prisma.application.delete({
            where: { id: entityId },
          });
          result = { id: entityId, deleted: true };
        }
      }
    }

    // Log the sync operation to sync queue table
    await prisma.syncQueue.create({
      data: {
        userId: session.user.id,
        operation: operation,
        entity: entity,
        entityId: entityId,
        data: data,
        synced: true,
      },
    });

    return NextResponse.json({
      success: true,
      conflict,
      serverData: conflict ? result : undefined,
      result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Sync error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
