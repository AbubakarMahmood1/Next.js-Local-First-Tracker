"use client";

import { useEffect, useState } from "react";
import { useApplications } from "@/hooks/useApplications";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { ApplicationCard } from "@/components/applications/application-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { ApplicationStatus } from "@/lib/db/indexed-db";

const STATUS_TABS: (ApplicationStatus | "ALL")[] = [
  "ALL",
  "WISHLIST",
  "APPLIED",
  "SCREENING",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
];

export default function ApplicationsPage() {
  useOfflineSync(); // Enable automatic syncing

  const {
    filteredApplications,
    filterStatus,
    searchQuery,
    setFilterStatus,
    setSearchQuery,
  } = useApplications();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Applications</h1>
          <p className="text-muted-foreground">
            Track and manage your job applications
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Application
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by company, position, or location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {STATUS_TABS.map((status) => (
          <Button
            key={status}
            variant={filterStatus === status ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus(status)}
            className="whitespace-nowrap"
          >
            {status === "ALL"
              ? "All"
              : status.charAt(0) + status.slice(1).toLowerCase()}
          </Button>
        ))}
      </div>

      {/* Applications Grid */}
      {filteredApplications.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {searchQuery
              ? "No applications found matching your search."
              : "No applications yet. Add your first one to get started!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredApplications.map((application) => (
            <ApplicationCard
              key={application.id}
              application={application}
              onClick={() => {
                // TODO: Open application details
                console.log("Open application:", application.id);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
