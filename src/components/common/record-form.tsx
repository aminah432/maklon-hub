import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput, PercentageInput } from "@/components/common/inputs";
import { cn } from "@/lib/utils";

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "currency"
  | "percent"
  | "date"
  | "select"
  | "switch";

export type FieldDef = {
  name: string;
  label: string;
  type?: FieldType;
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  full?: boolean;
  disabled?: boolean;
  help?: string;
};

export type FormValues = Record<string, string | number | boolean | null>;

function kosong(v: FormValues[string]): boolean {
  return v === null || v === undefined || v === "";
}

export function RecordFormDialog({
  open,
  onOpenChange,
  title,
  description,
  fields,
  initial,
  onSubmit,
  saving = false,
  submitLabel = "Simpan",
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  fields: FieldDef[];
  initial?: FormValues;
  onSubmit: (values: FormValues) => void | Promise<void>;
  saving?: boolean;
  submitLabel?: string;
  children?: ReactNode;
}) {
  const [values, setValues] = useState<FormValues>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    const base: FormValues = {};
    for (const f of fields) base[f.name] = f.type === "switch" ? false : null;
    setValues({ ...base, ...(initial ?? {}) });
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const set = (name: string, value: FormValues[string]) =>
    setValues((prev) => ({ ...prev, [name]: value }));

  const submit = () => {
    const next: Record<string, string> = {};
    for (const f of fields) {
      if (f.required && kosong(values[f.name] ?? null)) next[f.name] = "Wajib diisi";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    void onSubmit(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-hidden rounded-2xl p-0">
        <DialogHeader className="border-b border-border/70 p-5">
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <ScrollArea className="max-h-[62vh] px-5">
          <div className="grid gap-4 py-4 sm:grid-cols-2">
            {fields.map((f) => {
              const id = `f-${f.name}`;
              const value = values[f.name] ?? null;
              const err = errors[f.name];
              return (
                <div
                  key={f.name}
                  className={cn("space-y-1.5", (f.full || f.type === "textarea") && "sm:col-span-2")}
                >
                  <Label htmlFor={id}>
                    {f.label}
                    {f.required ? <span className="text-destructive"> *</span> : null}
                  </Label>

                  {f.type === "textarea" ? (
                    <Textarea
                      id={id}
                      rows={3}
                      disabled={f.disabled ?? false}
                      value={typeof value === "string" ? value : ""}
                      placeholder={f.placeholder ?? ""}
                      onChange={(e) => set(f.name, e.target.value)}
                    />
                  ) : f.type === "select" ? (
                    <Select
                      value={typeof value === "string" && value !== "" ? value : ""}

                      disabled={f.disabled ?? false}
                      onValueChange={(v) => set(f.name, v)}
                    >
                      <SelectTrigger id={id} aria-label={f.label}>
                        <SelectValue placeholder={f.placeholder ?? "Pilih"} />
                      </SelectTrigger>
                      <SelectContent>
                        {(f.options ?? []).map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : f.type === "currency" ? (
                    <CurrencyInput
                      id={id}
                      value={typeof value === "number" ? value : null}
                      onChange={(v) => set(f.name, v)}
                    />
                  ) : f.type === "percent" ? (
                    <PercentageInput
                      id={id}
                      value={typeof value === "number" ? value : null}
                      onChange={(v) => set(f.name, v)}
                    />
                  ) : f.type === "switch" ? (
                    <div className="flex h-9 items-center">
                      <Switch
                        id={id}
                        checked={value === true}
                        onCheckedChange={(v) => set(f.name, v)}
                      />
                    </div>
                  ) : (
                    <Input
                      id={id}
                      type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                      disabled={f.disabled ?? false}
                      placeholder={f.placeholder ?? ""}
                      value={value === null ? "" : String(value)}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (f.type === "number") {
                          set(f.name, raw === "" ? null : Number(raw));
                        } else {
                          set(f.name, raw);
                        }
                      }}
                    />
                  )}

                  {err ? <p className="text-xs text-destructive">{err}</p> : null}
                  {!err && f.help ? (
                    <p className="text-xs text-muted-foreground">{f.help}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
          {children ? <div className="pb-4">{children}</div> : null}
        </ScrollArea>

        <DialogFooter className="border-t border-border/70 p-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Menyimpan…" : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
