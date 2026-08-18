import {
  CheckCircle2,
  ClipboardList,
  FileText,
  History,
  Ship,
  Truck,
  Upload,
  AlertTriangle,
  Download,
  GitBranch,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  revision: GitBranch,
  history: History,
  upload: Upload,
  download: Download,
  truck: Truck,
  ship: Ship,
  clipboard: ClipboardList,
  document: FileText,
  warning: AlertTriangle,
  success: CheckCircle2,
};

export function TimelineEventIcon({
  name,
  className = "h-4 w-4",
}: {
  name?: string | null;
  className?: string;
}) {
  const Icon = (name && ICONS[name]) || History;
  return <Icon className={className} aria-hidden />;
}
