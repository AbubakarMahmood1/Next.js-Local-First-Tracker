import { create } from "zustand";
import { db, dbHelpers, Application, ApplicationStatus } from "@/lib/db/indexed-db";

interface ApplicationStore {
  applications: Application[];
  selectedApplication: Application | null;
  filterStatus: ApplicationStatus | "ALL";
  searchQuery: string;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadApplications: (userId: string) => Promise<void>;
  addApplication: (application: Omit<Application, "id" | "createdAt" | "updatedAt" | "lastSyncedAt" | "version">) => Promise<Application>;
  updateApplication: (id: string, updates: Partial<Application>) => Promise<void>;
  deleteApplication: (id: string) => Promise<void>;
  selectApplication: (application: Application | null) => void;
  setFilterStatus: (status: ApplicationStatus | "ALL") => void;
  setSearchQuery: (query: string) => void;
  getFilteredApplications: () => Application[];
}

export const useApplicationStore = create<ApplicationStore>((set, get) => ({
  applications: [],
  selectedApplication: null,
  filterStatus: "ALL",
  searchQuery: "",
  isLoading: false,
  error: null,

  loadApplications: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const applications = await dbHelpers.getUserApplications(userId);
      set({ applications, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load applications";
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  addApplication: async (applicationData) => {
    set({ isLoading: true, error: null });
    try {
      const now = new Date();
      const application: Application = {
        ...applicationData,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        lastSyncedAt: now,
        version: 1,
      };

      // Add to IndexedDB
      await db.applications.add(application);

      // Queue for sync
      await dbHelpers.addToSyncQueue(
        "CREATE",
        "application",
        application.id,
        application
      );

      // Update state
      set((state) => ({
        applications: [...state.applications, application],
        isLoading: false,
      }));

      return application;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to add application";
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  updateApplication: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const now = new Date();
      const updatedData = {
        ...updates,
        updatedAt: now,
        version: (updates.version || 1) + 1,
      };

      // Update in IndexedDB
      await db.applications.update(id, updatedData);

      // Get the updated application
      const updatedApp = await db.applications.get(id);

      if (!updatedApp) {
        throw new Error("Application not found after update");
      }

      // Queue for sync
      await dbHelpers.addToSyncQueue(
        "UPDATE",
        "application",
        id,
        updatedApp
      );

      // Update state
      set((state) => ({
        applications: state.applications.map((app) =>
          app.id === id ? { ...app, ...updatedData } : app
        ),
        selectedApplication:
          state.selectedApplication?.id === id
            ? { ...state.selectedApplication, ...updatedData }
            : state.selectedApplication,
        isLoading: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update application";
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  deleteApplication: async (id) => {
    set({ isLoading: true, error: null });
    try {
      // Get the application before deletion
      const app = await db.applications.get(id);

      if (!app) {
        throw new Error("Application not found");
      }

      // Delete from IndexedDB
      await db.applications.delete(id);

      // Queue for sync
      await dbHelpers.addToSyncQueue(
        "DELETE",
        "application",
        id,
        { id }
      );

      // Update state
      set((state) => ({
        applications: state.applications.filter((app) => app.id !== id),
        selectedApplication:
          state.selectedApplication?.id === id ? null : state.selectedApplication,
        isLoading: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete application";
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  selectApplication: (application) => {
    set({ selectedApplication: application });
  },

  setFilterStatus: (status) => {
    set({ filterStatus: status });
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  getFilteredApplications: () => {
    const { applications, filterStatus, searchQuery } = get();

    let filtered = applications;

    // Filter by status
    if (filterStatus !== "ALL") {
      filtered = filtered.filter((app) => app.status === filterStatus);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (app) =>
          app.company.toLowerCase().includes(query) ||
          app.position.toLowerCase().includes(query) ||
          app.location?.toLowerCase().includes(query) ||
          app.notes?.toLowerCase().includes(query)
      );
    }

    return filtered;
  },
}));
