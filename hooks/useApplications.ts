import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useApplicationStore } from "@/lib/stores/application-store";
import { Application, ApplicationStatus } from "@/lib/db/indexed-db";

export function useApplications() {
  const { data: session } = useSession();
  const {
    applications,
    selectedApplication,
    filterStatus,
    searchQuery,
    isLoading,
    error,
    loadApplications,
    addApplication,
    updateApplication,
    deleteApplication,
    selectApplication,
    setFilterStatus,
    setSearchQuery,
    getFilteredApplications,
  } = useApplicationStore();

  useEffect(() => {
    if (session?.user?.id) {
      loadApplications(session.user.id);
    }
  }, [session, loadApplications]);

  const createApplication = async (
    data: Omit<
      Application,
      "id" | "createdAt" | "updatedAt" | "lastSyncedAt" | "version"
    >
  ) => {
    if (!session?.user?.id) {
      throw new Error("User not authenticated");
    }

    return await addApplication({
      ...data,
      userId: session.user.id,
    });
  };

  const changeStatus = async (id: string, status: ApplicationStatus) => {
    await updateApplication(id, { status });
  };

  return {
    applications,
    filteredApplications: getFilteredApplications(),
    selectedApplication,
    filterStatus,
    searchQuery,
    isLoading,
    error,
    createApplication,
    updateApplication,
    deleteApplication,
    changeStatus,
    selectApplication,
    setFilterStatus,
    setSearchQuery,
  };
}
