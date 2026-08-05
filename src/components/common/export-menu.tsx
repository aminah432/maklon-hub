import { useState } from "react";
import { Download, FileSpreadsheet, FileText, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  downloadCsv,
  downloadCsvSections,
  downloadPdf,
  downloadPdfSections,
  printDoc,
  printSections,
  type ExportDoc,
  type SectionDoc,
} from "@/lib/export";

/**
 * Tombol ekspor universal (CSV, PDF, cetak langsung).
 * `doc` dibentuk lewat callback agar data selalu diambil saat aksi ditekan.
 */
export function ExportMenu<T>({
  doc,
  label = "Ekspor",
  variant = "outline",
  size = "default",
  disabled,
}: {
  doc: () => ExportDoc<T>;
  label?: string;
  variant?: "outline" | "secondary" | "ghost" | "default";
  size?: "default" | "sm" | "icon";
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);

  const jalankan = async (mode: "csv" | "pdf" | "print") => {
    try {
      const data = doc();
      if (data.rows.length === 0) {
        toast.warning("Tidak ada data untuk diekspor");
        return;
      }
      setBusy(true);
      if (mode === "csv") {
        downloadCsv(data);
        toast.success("CSV diunduh");
      } else if (mode === "pdf") {
        await downloadPdf(data);
        toast.success("PDF diunduh");
      } else {
        printDoc(data);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ekspor gagal");
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={disabled || busy} aria-label="Ekspor data">
          {busy ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Download className="size-4" aria-hidden />
          )}
          {size === "icon" ? null : label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 rounded-2xl">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Unduh & cetak
        </DropdownMenuLabel>
        <DropdownMenuItem className="rounded-xl" onSelect={() => void jalankan("csv")}>
          <FileSpreadsheet className="size-4" aria-hidden /> Unduh CSV
        </DropdownMenuItem>
        <DropdownMenuItem className="rounded-xl" onSelect={() => void jalankan("pdf")}>
          <FileText className="size-4" aria-hidden /> Unduh PDF
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="rounded-xl" onSelect={() => void jalankan("print")}>
          <Printer className="size-4" aria-hidden /> Cetak langsung
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Varian untuk dokumen detail multi-tabel (mis. lembar HPP, laporan). */
export function ExportMenuSections({
  doc,
  label = "Ekspor",
  variant = "outline",
}: {
  doc: () => SectionDoc;
  label?: string;
  variant?: "outline" | "secondary" | "ghost" | "default";
}) {
  const [busy, setBusy] = useState(false);

  const jalankan = async (mode: "csv" | "pdf" | "print") => {
    try {
      const data = doc();
      setBusy(true);
      if (mode === "csv") {
        downloadCsvSections(data);
        toast.success("CSV diunduh");
      } else if (mode === "pdf") {
        await downloadPdfSections(data);
        toast.success("PDF diunduh");
      } else {
        printSections(data);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ekspor gagal");
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} disabled={busy} aria-label="Ekspor dokumen">
          {busy ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Download className="size-4" aria-hidden />
          )}
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 rounded-2xl">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Unduh & cetak
        </DropdownMenuLabel>
        <DropdownMenuItem className="rounded-xl" onSelect={() => void jalankan("csv")}>
          <FileSpreadsheet className="size-4" aria-hidden /> Unduh CSV
        </DropdownMenuItem>
        <DropdownMenuItem className="rounded-xl" onSelect={() => void jalankan("pdf")}>
          <FileText className="size-4" aria-hidden /> Unduh PDF
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="rounded-xl" onSelect={() => void jalankan("print")}>
          <Printer className="size-4" aria-hidden /> Cetak langsung
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
