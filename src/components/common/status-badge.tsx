import { Badge } from "@/components/ui/badge";
import { STATUS_TONE, type Tone } from "@/lib/constants";
import { labelStatus } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, CircleDashed, CircleDot, Clock, XCircle } from "lucide-react";

const TONE_CLASS: Record<Tone, string> = {
  netral: "bg-muted text-muted-foreground border-border",
  sukses: "bg-success/10 text-success border-success/25",
  peringatan: "bg-warning/15 text-warning-foreground border-warning/35",
  bahaya: "bg-destructive/10 text-destructive border-destructive/25",
  info: "bg-info/10 text-info border-info/25",
  utama: "bg-primary/10 text-primary border-primary/25",
};

const TONE_ICON: Record<Tone, typeof CheckCircle2> = {
  netral: CircleDashed,
  sukses: CheckCircle2,
  peringatan: Clock,
  bahaya: XCircle,
  info: CircleDot,
  utama: AlertTriangle,
};

export function StatusBadge({
  status,
  tone,
  className,
}: {
  status: string | null | undefined;
  tone?: Tone;
  className?: string;
}) {
  const key = (status ?? "").toLowerCase();
  const resolved: Tone = tone ?? STATUS_TONE[key] ?? "netral";
  const Icon = TONE_ICON[resolved];
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 rounded-full border px-2.5 py-0.5 font-medium",
        TONE_CLASS[resolved],
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      <span className="truncate">{labelStatus(status)}</span>
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: string | null | undefined }) {
  const tone: Tone = priority === "tinggi" ? "bahaya" : priority === "rendah" ? "netral" : "info";
  return <StatusBadge status={priority ?? "normal"} tone={tone} />;
}

export function CompanyBadge({ code, name }: { code?: string | null; name?: string | null }) {
  if (!code) return null;
  return (
    <Badge
      variant="outline"
      className="rounded-full border-primary/25 bg-primary/10 px-2.5 py-0.5 font-medium text-primary"
      title={name ?? code}
    >
      {code}
    </Badge>
  );
}
