import { create } from "zustand";
import { syncEngine, SyncStatus, SyncState } from "@/lib/sync/sync-engine";

interface SyncStore {
  isOnline: boolean;
  syncStatus: SyncStatus;
  syncProgress: number;
  syncTotal: number;
  syncError: string | null;
  lastSyncedAt: Date | null;

  // Actions
  setOnlineStatus: (isOnline: boolean) => void;
  triggerSync: () => Promise<void>;
  pullFromServer: (userId: string) => Promise<void>;
}

export const useSyncStore = create<SyncStore>((set, get) => ({
  isOnline: typeof window !== "undefined" ? navigator.onLine : true,
  syncStatus: "idle",
  syncProgress: 0,
  syncTotal: 0,
  syncError: null,
  lastSyncedAt: null,

  setOnlineStatus: (isOnline) => {
    set({ isOnline });
  },

  triggerSync: async () => {
    try {
      set({ syncStatus: "syncing", syncError: null });
      await syncEngine.sync();
      set({
        syncStatus: "success",
        lastSyncedAt: new Date(),
      });

      // Reset to idle after 2 seconds
      setTimeout(() => {
        set({ syncStatus: "idle" });
      }, 2000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Sync failed";
      set({
        syncStatus: "error",
        syncError: errorMessage,
      });
    }
  },

  pullFromServer: async (userId: string) => {
    try {
      set({ syncStatus: "syncing", syncError: null });
      await syncEngine.pullFromServer(userId);
      set({
        syncStatus: "success",
        lastSyncedAt: new Date(),
      });

      // Reset to idle after 2 seconds
      setTimeout(() => {
        set({ syncStatus: "idle" });
      }, 2000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Pull failed";
      set({
        syncStatus: "error",
        syncError: errorMessage,
      });
    }
  },
}));

// Subscribe to sync engine updates
if (typeof window !== "undefined") {
  syncEngine.subscribe((state: SyncState) => {
    useSyncStore.setState({
      syncStatus: state.status,
      syncProgress: state.progress,
      syncTotal: state.total,
      syncError: state.error,
    });
  });

  // Listen to online/offline events
  window.addEventListener("online", () => {
    useSyncStore.getState().setOnlineStatus(true);
  });

  window.addEventListener("offline", () => {
    useSyncStore.getState().setOnlineStatus(false);
  });
}
