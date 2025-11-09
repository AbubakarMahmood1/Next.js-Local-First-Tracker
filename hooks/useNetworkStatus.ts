import { useEffect, useState } from "react";
import { useSyncStore } from "@/lib/stores/sync-store";

export function useNetworkStatus() {
  const { isOnline, setOnlineStatus } = useSyncStore();
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setOnlineStatus(true);
      checkRealConnectivity();
    };

    const handleOffline = () => {
      setOnlineStatus(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial connectivity check
    checkRealConnectivity();

    // Periodic connectivity check
    const interval = setInterval(checkRealConnectivity, 30000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [setOnlineStatus]);

  const checkRealConnectivity = async () => {
    if (!navigator.onLine) {
      setOnlineStatus(false);
      return;
    }

    setIsChecking(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      await fetch("/api/health", {
        method: "HEAD",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      setOnlineStatus(true);
    } catch {
      setOnlineStatus(false);
    } finally {
      setIsChecking(false);
    }
  };

  return {
    isOnline,
    isChecking,
    checkConnectivity: checkRealConnectivity,
  };
}
