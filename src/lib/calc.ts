/** Kalkulasi HPP, markup, margin, dan laba. Semua nilai dalam angka mentah (Rupiah). */

export type CostingItemInput = {
  quantity: number;
  unit_cost: number;
  waste_percentage: number;
};

/** total sebelum waste */
export function subtotalItem(item: CostingItemInput): number {
  return (Number(item.quantity) || 0) * (Number(item.unit_cost) || 0);
}

/** total setelah waste */
export function totalItem(item: CostingItemInput): number {
  return subtotalItem(item) * (1 + (Number(item.waste_percentage) || 0) / 100);
}

export function totalBatchCost(items: CostingItemInput[]): number {
  return items.reduce((sum, item) => sum + totalItem(item), 0);
}

export function goodUnits(planned: number, rejected: number, shrinkage: number): number {
  return Math.max((Number(planned) || 0) - (Number(rejected) || 0) - (Number(shrinkage) || 0), 0);
}

/** HPP per unit; mengembalikan 0 bila jumlah layak jual nol (hindari pembagian nol) */
export function unitHpp(totalCost: number, units: number): number {
  const u = Number(units) || 0;
  if (u <= 0) return 0;
  return (Number(totalCost) || 0) / u;
}

export function hargaMarkup(hpp: number, markupPersen: number): number {
  return (Number(hpp) || 0) * (1 + (Number(markupPersen) || 0) / 100);
}

export function hargaTargetMargin(hpp: number, marginPersen: number): number {
  const m = Number(marginPersen) || 0;
  if (m >= 100 || m < 0) return 0;
  return (Number(hpp) || 0) / (1 - m / 100);
}

export type ProfitInput = {
  finalUnitPrice: number;
  quantity: number;
  unitHpp: number;
  brokerFee?: number;
  discount?: number;
  shippingSubsidy?: number;
  otherVariableCosts?: number;
};

export type ProfitResult = {
  revenue: number;
  totalCogs: number;
  grossProfit: number;
  netContribution: number;
  actualMargin: number;
  profitPerUnit: number;
};

export function hitungLaba(input: ProfitInput): ProfitResult {
  const revenue = (Number(input.finalUnitPrice) || 0) * (Number(input.quantity) || 0);
  const totalCogs = (Number(input.unitHpp) || 0) * (Number(input.quantity) || 0);
  const grossProfit = revenue - totalCogs;
  const netContribution =
    grossProfit -
    (Number(input.brokerFee) || 0) -
    (Number(input.discount) || 0) -
    (Number(input.shippingSubsidy) || 0) -
    (Number(input.otherVariableCosts) || 0);
  const actualMargin = revenue > 0 ? (netContribution / revenue) * 100 : 0;
  const qty = Number(input.quantity) || 0;
  return {
    revenue,
    totalCogs,
    grossProfit,
    netContribution,
    actualMargin,
    profitPerUnit: qty > 0 ? netContribution / qty : 0,
  };
}

export function feeMakelar(opts: {
  type: string;
  base?: number;
  percentage?: number;
  amount?: number;
  quantity?: number;
}): number {
  const base = Number(opts.base) || 0;
  const amount = Number(opts.amount) || 0;
  const qty = Number(opts.quantity) || 0;
  switch (opts.type) {
    case "persentase":
      return (base * (Number(opts.percentage) || 0)) / 100;
    case "per_unit":
      return amount * qty;
    case "per_batch":
    case "nominal":
    case "klien_baru":
    default:
      return amount;
  }
}
