import { cn } from "@/lib/utils";
import type { HTMLAttributes, MouseEvent, ReactNode } from "react";

type Props = HTMLAttributes<HTMLDivElement> & { children: ReactNode; interactive?: boolean };

/** Kartu dengan efek mengambang halus dan cahaya mengikuti cursor (nonaktif di perangkat sentuh). */
export function FloatingCard({ children, className, interactive = true, ...rest }: Props) {
  const onMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  };

  return (
    <div
      {...rest}
      onMouseMove={onMouseMove}
      className={cn("surface p-5", interactive && "float-card", className)}
    >
      {children}
    </div>
  );
}
