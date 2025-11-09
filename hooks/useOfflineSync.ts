import { useEffect } from "react";
import { useSyncStore } from "@/lib/stores/sync-store";
import { useSession } from "next-auth/react";

export function useOfflineSync() {
  const { data: session } = useSession();
  const { isOnline, syncStatus, triggerSync, pullFromServer } = useSyncStore();

  useEffect(() => {
    // Trigger sync when coming online
    if (isOnline && session?.user) {
      triggerSync();
    }
  }, [isOnline, session, triggerSync]);

  useEffect(() => {
    // Periodic sync every 5 minutes when online
    if (!isOnline || !session?.user) return;

    const interval = setInterval(() => {
      triggerSync();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [isOnline, session, triggerSync]);

  const manualSync = async () => {
    if (!isOnline) {
      throw new Error("Cannot sync while offline");
    }
    await triggerSync();
  };

  const pullData = async () => {
    if (!isOnline || !session?.user?.id) {
      throw new Error("Cannot pull data while offline or not authenticated");
    }
    await pullFromServer(session.user.id);
  };

  return {
    isOnline,
    syncStatus,
    manualSync,
    pullData,
  };
}
