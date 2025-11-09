"use client";

import { Application } from "@/lib/db/indexed-db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "./status-badge";
import { MapPin, DollarSign, Calendar, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

interface ApplicationCardProps {
  application: Application;
  onClick?: () => void;
}

export function ApplicationCard({ application, onClick }: ApplicationCardProps) {
  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return null;
    if (min && max) return `$${(min / 1000).toFixed(0)}k - $${(max / 1000).toFixed(0)}k`;
    if (min) return `$${(min / 1000).toFixed(0)}k+`;
    if (max) return `Up to $${(max / 1000).toFixed(0)}k`;
  };

  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-lg font-semibold">
            {application.company}
          </CardTitle>
          <StatusBadge status={application.status} />
        </div>
        <p className="text-sm text-muted-foreground font-medium">
          {application.position}
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {application.location && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{application.location}</span>
          </div>
        )}

        {(application.salaryMin || application.salaryMax) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            <span>{formatSalary(application.salaryMin, application.salaryMax)}</span>
          </div>
        )}

        {application.applicationDate && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Applied {format(new Date(application.applicationDate), "MMM d, yyyy")}</span>
          </div>
        )}

        {application.url && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 mt-2"
            onClick={(e) => {
              e.stopPropagation();
              window.open(application.url, "_blank");
            }}
          >
            <ExternalLink className="h-4 w-4" />
            <span className="truncate">View Posting</span>
          </Button>
        )}

        {application.notes && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-2 pt-2 border-t">
            {application.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
