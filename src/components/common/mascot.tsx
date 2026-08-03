import maskot from "@/assets/maskot.png";
import maskotHead from "@/assets/maskot-head.png";
import { cn } from "@/lib/utils";

/**
 * Logo utama aplikasi: kepala maskot dengan animasi berkedip.
 * `size` dalam piksel agar mudah diseragamkan di sidebar, header, dan login.
 */
export function MascotLogo({
  size = 40,
  className,
  blink = true,
}: {
  size?: number;
  className?: string;
  blink?: boolean;
}) {
  return (
    <span
      className={cn("relative inline-block shrink-0 select-none", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <img
        src={maskotHead}
        alt=""
        className="size-full object-contain"
        draggable={false}
      />
      {blink ? (
        <span
          className="animate-mascot-blink pointer-events-none absolute rounded-[40%] bg-[#f4f6fb]"
          style={{ left: "24%", top: "53%", width: "13%", height: "13%" }}
        />
      ) : null}
    </span>
  );
}

/** Maskot utuh untuk ilustrasi (login, empty state, sambutan dasbor). */
export function Mascot({
  className,
  float = true,
}: {
  className?: string;
  float?: boolean;
}) {
  return (
    <img
      src={maskot}
      alt="Maskot Maklon Control Center"
      draggable={false}
      className={cn(
        "pointer-events-none select-none object-contain drop-shadow-xl",
        float && "animate-soft-float",
        className,
      )}
    />
  );
}
