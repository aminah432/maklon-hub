import { Input } from "@/components/ui/input";
import { formatNumberInput, parseNumberInput } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

type BaseProps = {
  value: number | null;
  onChange: (value: number | null) => void;
  id?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  "aria-invalid"?: boolean;
};

/** Input Rupiah: menampilkan pemisah ribuan, menyimpan angka mentah. */
export function CurrencyInput({ value, onChange, className, ...rest }: BaseProps) {
  const [text, setText] = useState(() => formatNumberInput(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(formatNumberInput(value));
  }, [value, focused]);

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        Rp
      </span>
      <Input
        {...rest}
        inputMode="numeric"
        value={text}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          setText(formatNumberInput(value));
        }}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw.trim() === "") {
            setText("");
            onChange(null);
            return;
          }
          const parsed = parseNumberInput(raw);
          setText(parsed === null ? "" : formatNumberInput(parsed));
          onChange(parsed);
        }}
        className={cn("num pl-9 text-right", className)}
      />
    </div>
  );
}

/** Input persentase dengan batas minimum dan maksimum. */
export function PercentageInput({
  value,
  onChange,
  max = 1000,
  min = 0,
  className,
  ...rest
}: BaseProps & { max?: number; min?: number }) {
  return (
    <div className="relative">
      <Input
        {...rest}
        inputMode="decimal"
        value={value === null || value === undefined ? "" : String(value)}
        onChange={(e) => {
          const raw = e.target.value.replace(",", ".");
          if (raw.trim() === "") return onChange(null);
          const n = Number(raw);
          if (!Number.isFinite(n)) return;
          onChange(Math.min(Math.max(n, min), max));
        }}
        className={cn("num pr-8 text-right", className)}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        %
      </span>
    </div>
  );
}

/** Input desimal presisi tinggi (koma atau titik), menyimpan angka mentah. */
export function DecimalInput({
  value,
  onChange,
  digits = 6,
  className,
  ...rest
}: BaseProps & { digits?: number }) {
  const [text, setText] = useState(() =>
    value === null || value === undefined ? "" : String(value).replace(".", ","),
  );
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (focused) return;
    if (value === null || value === undefined) return setText("");
    const dibulatkan = Number(value.toFixed(digits));
    setText(String(dibulatkan).replace(".", ","));
  }, [value, focused, digits]);

  return (
    <Input
      {...rest}
      inputMode="decimal"
      value={text}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^\d.,-]/g, "");
        setText(raw);
        if (raw.trim() === "") return onChange(null);
        const n = raw.includes(",")
          ? Number(raw.replace(/\./g, "").replace(",", "."))
          : Number(raw);
        if (Number.isFinite(n)) onChange(n);
      }}
      className={cn("num text-right", className)}
    />
  );
}

/** Input jumlah bilangan bulat non-negatif. */
export function QuantityInput({ value, onChange, className, ...rest }: BaseProps) {
  return (
    <Input
      {...rest}
      inputMode="numeric"
      value={value === null || value === undefined ? "" : String(value)}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^\d.]/g, "");
        if (raw === "") return onChange(null);
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0) return;
        onChange(n);
      }}
      className={cn("num text-right", className)}
    />
  );
}
