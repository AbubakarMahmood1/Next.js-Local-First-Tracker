"use client";

import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useSyncStore } from "@/lib/stores/sync-store";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, Cloud, CloudOff, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export function NetworkIndicator() {
  const { isOnline, isChecking } = useNetworkStatus();
  const { syncStatus, syncError } = useSyncStore();

  if (isChecking) {
    return (
      <Badge variant="outline" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Checking...</span>
      </Badge>
    );
  }

  if (!isOnline) {
    return (
      <Badge variant="outline" className="gap-1 border-orange-300 text-orange-700 dark:border-orange-600 dark:text-orange-400">
        <WifiOff className="h-3 w-3" />
        <span>Offline</span>
      </Badge>
    );
  }

  if (syncStatus === "syncing") {
    return (
      <Badge variant="outline" className="gap-1 border-blue-300 text-blue-700 dark:border-blue-600 dark:text-blue-400">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Syncing...</span>
      </Badge>
    );
  }

  if (syncStatus === "error") {
    return (
      <Badge variant="outline" className="gap-1 border-red-300 text-red-700 dark:border-red-600 dark:text-red-400">
        <AlertCircle className="h-3 w-3" />
        <span>Sync Error</span>
      </Badge>
    );
  }

  if (syncStatus === "success") {
    return (
      <Badge variant="outline" className="gap-1 border-green-300 text-green-700 dark:border-green-600 dark:text-green-400">
        <CheckCircle2 className="h-3 w-3" />
        <span>Synced</span>
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1 border-green-300 text-green-700 dark:border-green-600 dark:text-green-400">
      <Wifi className="h-3 w-3" />
      <span>Online</span>
    </Badge>
  );
}
