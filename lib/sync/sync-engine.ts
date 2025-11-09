import { db, dbHelpers, SyncOperation } from "@/lib/db/indexed-db";

const MAX_BATCH_SIZE = 50;
const MAX_RETRY_COUNT = 5;
const RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000]; // Exponential backoff in ms

export type SyncStatus = "idle" | "syncing" | "error" | "success";

export interface SyncState {
  status: SyncStatus;
  progress: number;
  total: number;
  error?: string;
}

export class SyncEngine {
  private isOnline: boolean = true;
  private isSyncing: boolean = false;
  private syncListeners: Set<(state: SyncState) => void> = new Set();

  constructor() {
    if (typeof window !== "undefined") {
      this.isOnline = navigator.onLine;
      this.setupEventListeners();
    }
  }

  private setupEventListeners() {
    window.addEventListener("online", () => {
      this.isOnline = true;
      this.sync(); // Auto-sync when coming online
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
    });

    // Periodic ping to verify real connectivity
    setInterval(() => {
      this.checkRealConnectivity();
    }, 30000); // Check every 30 seconds
  }

  private async checkRealConnectivity() {
    if (!navigator.onLine) {
      this.isOnline = false;
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      await fetch("/api/health", {
        method: "HEAD",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      this.isOnline = true;
    } catch {
      this.isOnline = false;
    }
  }

  public subscribe(listener: (state: SyncState) => void) {
    this.syncListeners.add(listener);
    return () => {
      this.syncListeners.delete(listener);
    };
  }

  private notifyListeners(state: SyncState) {
    this.syncListeners.forEach((listener) => listener(state));
  }

  public async sync(): Promise<void> {
    if (!this.isOnline || this.isSyncing) {
      return;
    }

    this.isSyncing = true;
    this.notifyListeners({ status: "syncing", progress: 0, total: 0 });

    try {
      // Get all unsynced operations
      const operations = await dbHelpers.getUnsyncedOperations();

      // Filter out operations that have exceeded retry limit
      const validOperations = operations.filter(
        (op) => op.retryCount < MAX_RETRY_COUNT
      );

      if (validOperations.length === 0) {
        this.notifyListeners({
          status: "success",
          progress: 0,
          total: 0,
        });
        this.isSyncing = false;
        return;
      }

      // Process in batches
      const batches = this.createBatches(validOperations, MAX_BATCH_SIZE);
      let completed = 0;

      for (const batch of batches) {
        await this.processBatch(batch);
        completed += batch.length;
        this.notifyListeners({
          status: "syncing",
          progress: completed,
          total: validOperations.length,
        });
      }

      this.notifyListeners({
        status: "success",
        progress: validOperations.length,
        total: validOperations.length,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Sync failed";
      this.notifyListeners({
        status: "error",
        progress: 0,
        total: 0,
        error: errorMessage,
      });
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private async processBatch(operations: SyncOperation[]): Promise<void> {
    const promises = operations.map((op) => this.processOperation(op));
    await Promise.allSettled(promises);
  }

  private async processOperation(operation: SyncOperation): Promise<void> {
    try {
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          operation: operation.type,
          entity: operation.entity,
          entityId: operation.entityId,
          data: operation.data,
          timestamp: operation.timestamp,
        }),
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`);
      }

      const result = await response.json();

      // Handle conflicts
      if (result.conflict) {
        await this.resolveConflict(operation, result.serverData);
      }

      // Mark as synced
      await dbHelpers.markOperationSynced(operation.id);
    } catch (error) {
      // Increment retry count with exponential backoff
      const delay = RETRY_DELAYS[Math.min(operation.retryCount, RETRY_DELAYS.length - 1)];
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      await dbHelpers.incrementRetryCount(operation.id, errorMessage);

      // Schedule retry if under limit
      if (operation.retryCount + 1 < MAX_RETRY_COUNT) {
        setTimeout(() => {
          if (this.isOnline && !this.isSyncing) {
            this.sync();
          }
        }, delay);
      }

      throw error;
    }
  }

  private async resolveConflict(
    localOperation: SyncOperation,
    serverData: any
  ): Promise<void> {
    // Last-write-wins strategy based on timestamps
    const serverTimestamp = new Date(serverData.updatedAt).getTime();
    const localTimestamp = localOperation.timestamp;

    if (serverTimestamp > localTimestamp) {
      // Server wins - update local data
      switch (localOperation.entity) {
        case "application":
          await db.applications.put({
            ...serverData,
            lastSyncedAt: new Date(),
          });
          break;
        case "contact":
          await db.contacts.put(serverData);
          break;
        case "document":
          await db.documents.put(serverData);
          break;
      }
    }
    // If local is newer, the server will be updated by the sync operation
  }

  public getOnlineStatus(): boolean {
    return this.isOnline;
  }

  public async pullFromServer(userId: string): Promise<void> {
    if (!this.isOnline) {
      throw new Error("Cannot pull from server while offline");
    }

    try {
      const response = await fetch(`/api/sync/pull?userId=${userId}`);

      if (!response.ok) {
        throw new Error(`Pull failed: ${response.statusText}`);
      }

      const data = await response.json();

      // Update local database
      await db.transaction("rw", [db.applications, db.contacts, db.documents], async () => {
        if (data.applications) {
          for (const app of data.applications) {
            await db.applications.put({
              ...app,
              lastSyncedAt: new Date(),
            });
          }
        }

        if (data.contacts) {
          for (const contact of data.contacts) {
            await db.contacts.put(contact);
          }
        }

        if (data.documents) {
          for (const doc of data.documents) {
            await db.documents.put(doc);
          }
        }
      });
    } catch (error) {
      console.error("Pull from server failed:", error);
      throw error;
    }
  }
}

// Singleton instance
export const syncEngine = new SyncEngine();
