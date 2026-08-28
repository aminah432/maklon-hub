/**
 * Daftar akun yang diizinkan masuk ke aplikasi.
 * Email di luar daftar ini akan ditolak, walaupun kata sandinya benar.
 */
export const ALLOWED_EMAILS = ["shenjuusembilan@gmail.com"] as const;

export function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

export function isAllowedEmail(email: string | null | undefined): boolean {
  return ALLOWED_EMAILS.includes(normalizeEmail(email) as (typeof ALLOWED_EMAILS)[number]);
}

export const NOT_ALLOWED_MESSAGE =
  "Akun ini tidak memiliki akses ke aplikasi. Hubungi administrator.";
