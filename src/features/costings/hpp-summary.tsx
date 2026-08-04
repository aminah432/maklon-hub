import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { angka, persen, rupiah } from "@/lib/format";
import type { HppResult, Peringatan } from "@/lib/hpp";
import { cn } from "@/lib/utils";

function Baris({
  label,
  value,
  strong,
  muted,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-3 py-1.5",
        strong && "border-t border-border/70 pt-2",
      )}
    >
      <span className={cn("text-sm", muted ? "text-muted-foreground" : "")}>{label}</span>
      <span className={cn("num text-sm", strong && "text-base font-semibold")}>{value}</span>
    </div>
  );
}

export function HppSummaryCard({
  hasil,
  jumlahUnit,
  layakJual,
  reject,
  penyusutan,
  peringatan,
}: {
  hasil: HppResult;
  jumlahUnit: number;
  layakJual: number;
  reject: number;
  penyusutan: number;
  peringatan: Peringatan[];
}) {
  const kontribusi = (v: number) => (hasil.hppPerUnit > 0 ? (v / hasil.hppPerUnit) * 100 : 0);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border/70 bg-card p-5">
        <h2 className="text-sm font-medium text-muted-foreground">Ringkasan HPP</h2>
        <p className="num mt-1 text-3xl font-semibold tracking-tight">
          {rupiah(hasil.hppPerUnit, true)}
        </p>
        <p className="text-xs text-muted-foreground">HPP per unit</p>

        <div className="mt-4">
          <Baris
            label="Biaya formula"
            value={`${rupiah(hasil.totalFormula, true)} · ${persen(kontribusi(hasil.totalFormula), 1)}`}
          />
          <Baris
            label="Biaya packaging"
            value={`${rupiah(hasil.totalPackaging, true)} · ${persen(kontribusi(hasil.totalPackaging), 1)}`}
          />
          <Baris label="Subtotal" value={rupiah(hasil.subtotal, true)} muted />
          {hasil.combinedBtklOhp > 0 ? (
            <Baris label="BTKL + OHP" value={rupiah(hasil.combinedBtklOhp, true)} />
          ) : (
            <>
              <Baris label="BTKL" value={rupiah(hasil.btkl, true)} />
              <Baris label="OHP" value={rupiah(hasil.ohp, true)} />
            </>
          )}
          <Baris label="Biaya tambahan" value={rupiah(hasil.biayaTambahan, true)} />
          {hasil.lossAdjustment > 0 ? (
            <Baris label="Dampak reject & penyusutan" value={rupiah(hasil.lossAdjustment, true)} />
          ) : null}
          <Baris label="HPP per unit" value={rupiah(hasil.hppPerUnit, true)} strong />
          <Baris label="HPP per batch" value={rupiah(hasil.hppBatch)} />
        </div>
      </section>

      <section className="rounded-2xl border border-border/70 bg-card p-5">
        <h2 className="text-sm font-medium text-muted-foreground">Estimasi hasil produksi</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Direncanakan</dt>
            <dd className="num">{angka(jumlahUnit)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Layak jual</dt>
            <dd className="num font-medium">{angka(hasil.sellableUnits || layakJual)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Reject</dt>
            <dd className="num">{angka(reject, 1)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Penyusutan</dt>
            <dd className="num">{angka(penyusutan, 1)}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-border/70 bg-card p-5">
        <h2 className="text-sm font-medium text-muted-foreground">Validasi</h2>
        {peringatan.length === 0 ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircle2 className="size-4" aria-hidden /> Semua pemeriksaan lolos.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {peringatan.map((p, i) => (
              <li
                key={i}
                className={cn(
                  "flex items-start gap-2 rounded-xl px-3 py-2 text-sm",
                  p.level === "error"
                    ? "bg-destructive/10 text-destructive"
                    : p.level === "warning"
                      ? "bg-amber-500/10 text-amber-700"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {p.level === "info" ? (
                  <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
                ) : (
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                )}
                <span>{p.pesan}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
