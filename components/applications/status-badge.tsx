import { Badge } from "@/components/ui/badge";
import { ApplicationStatus } from "@/lib/db/indexed-db";

interface StatusBadgeProps {
  status: ApplicationStatus;
}

const STATUS_CONFIG = {
  WISHLIST: {
    label: "Wishlist",
    variant: "outline" as const,
    className: "border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-300",
  },
  APPLIED: {
    label: "Applied",
    variant: "default" as const,
    className: "bg-blue-500 hover:bg-blue-600",
  },
  SCREENING: {
    label: "Screening",
    variant: "secondary" as const,
    className: "bg-yellow-500 text-yellow-950 hover:bg-yellow-600",
  },
  INTERVIEW: {
    label: "Interview",
    variant: "default" as const,
    className: "bg-purple-500 hover:bg-purple-600",
  },
  OFFER: {
    label: "Offer",
    variant: "default" as const,
    className: "bg-green-500 hover:bg-green-600",
  },
  REJECTED: {
    label: "Rejected",
    variant: "destructive" as const,
    className: "",
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}
