import Dexie, { Table } from "dexie";

export type ApplicationStatus =
  | "WISHLIST"
  | "APPLIED"
  | "SCREENING"
  | "INTERVIEW"
  | "OFFER"
  | "REJECTED";

export interface Application {
  id: string;
  userId: string;
  company: string;
  position: string;
  location?: string;
  salaryMin?: number;
  salaryMax?: number;
  status: ApplicationStatus;
  applicationDate?: Date;
  deadline?: Date;
  followUpDate?: Date;
  url?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  lastSyncedAt: Date;
  version: number;
}

export interface Contact {
  id: string;
  applicationId: string;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Document {
  id: string;
  applicationId: string;
  name: string;
  type: string;
  url: string;
  createdAt: Date;
  updatedAt: Date;
}

export type SyncOperationType = "CREATE" | "UPDATE" | "DELETE";
export type SyncEntityType = "application" | "contact" | "document";

export interface SyncOperation {
  id: string;
  type: SyncOperationType;
  entity: SyncEntityType;
  entityId: string;
  data: any;
  timestamp: number;
  synced: boolean;
  retryCount: number;
  error?: string;
}

export class JobTrackerDB extends Dexie {
  applications!: Table<Application, string>;
  contacts!: Table<Contact, string>;
  documents!: Table<Document, string>;
  syncQueue!: Table<SyncOperation, string>;

  constructor() {
    super("JobTrackerDB");

    this.version(1).stores({
      applications:
        "id, userId, status, company, position, [userId+status], [userId+updatedAt], updatedAt",
      contacts: "id, applicationId, name",
      documents: "id, applicationId, name",
      syncQueue: "id, synced, timestamp, [synced+timestamp]",
    });
  }

  async clearAll() {
    await this.applications.clear();
    await this.contacts.clear();
    await this.documents.clear();
    await this.syncQueue.clear();
  }
}

// Create singleton instance
export const db = new JobTrackerDB();

// Helper functions for common operations
export const dbHelpers = {
  // Get all applications for a user
  async getUserApplications(userId: string): Promise<Application[]> {
    return await db.applications.where("userId").equals(userId).toArray();
  },

  // Get applications by status
  async getApplicationsByStatus(
    userId: string,
    status: ApplicationStatus
  ): Promise<Application[]> {
    return await db.applications
      .where("[userId+status]")
      .equals([userId, status])
      .toArray();
  },

  // Get unsynced operations
  async getUnsyncedOperations(): Promise<SyncOperation[]> {
    return await db.syncQueue.where("synced").equals(0).toArray();
  },

  // Mark operation as synced
  async markOperationSynced(operationId: string): Promise<void> {
    await db.syncQueue.update(operationId, { synced: true });
  },

  // Add operation to sync queue
  async addToSyncQueue(
    type: SyncOperationType,
    entity: SyncEntityType,
    entityId: string,
    data: any
  ): Promise<string> {
    const id = crypto.randomUUID();
    await db.syncQueue.add({
      id,
      type,
      entity,
      entityId,
      data,
      timestamp: Date.now(),
      synced: false,
      retryCount: 0,
    });
    return id;
  },

  // Increment retry count for failed operation
  async incrementRetryCount(
    operationId: string,
    error: string
  ): Promise<void> {
    const operation = await db.syncQueue.get(operationId);
    if (operation) {
      await db.syncQueue.update(operationId, {
        retryCount: operation.retryCount + 1,
        error,
      });
    }
  },

  // Get contacts for an application
  async getApplicationContacts(applicationId: string): Promise<Contact[]> {
    return await db.contacts
      .where("applicationId")
      .equals(applicationId)
      .toArray();
  },

  // Get documents for an application
  async getApplicationDocuments(applicationId: string): Promise<Document[]> {
    return await db.documents
      .where("applicationId")
      .equals(applicationId)
      .toArray();
  },
};
