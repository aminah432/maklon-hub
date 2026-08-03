import shenjuu from "@/assets/shenjuu-logo.png.asset.json";
import dna from "@/assets/dna-logo.jpg.asset.json";
import bmmf from "@/assets/bmmf-logo.png.asset.json";

/** Logo resmi per kode perusahaan. */
const LOGO: Record<string, string> = {
  SHJ: shenjuu.url,
  DNA: dna.url,
  BMMF: bmmf.url,
};

/**
 * Rasio tampilan tiap logo berbeda; nilai ini dipakai untuk menyesuaikan
 * ukuran optis agar terlihat seimbang saat berpindah perusahaan.
 */
const SKALA: Record<string, string> = {
  SHJ: "scale-[1.18]",
  DNA: "scale-[1.02]",
  BMMF: "scale-[1.1]",
};

export function logoPerusahaan(code?: string | null): string | undefined {
  return code ? LOGO[code.toUpperCase()] : undefined;
}

export function skalaLogo(code?: string | null): string {
  return (code ? SKALA[code.toUpperCase()] : undefined) ?? "scale-100";
}
