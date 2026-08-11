/** Proiezioni coperti → recensioni (allineato a coldCallScriptService.computeCoverProjections). */

export type CoverProjections = {
  coversPerWeek: number;
  coversMonthly: number;
  potentialMonthly: number;
  yearReviews: number;
  twoWeekPotential: number;
  reviewsNow: number;
};

export function parseCoversInput(raw: string): number | null {
  const cleaned = String(raw || "")
    .replace(/[^\d.,]/g, "")
    .replace(",", ".");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function computeCoverProjections(
  coversPerWeek: number | null,
  currentReviews?: number | null
): CoverProjections | null {
  if (coversPerWeek == null || coversPerWeek <= 0) return null;
  const coversMonthly = Math.round(coversPerWeek * 4);
  const potentialMonthly = Math.max(1, Math.round(coversMonthly * 0.1));
  const reviewsNow = typeof currentReviews === "number" && currentReviews > 0 ? currentReviews : 0;
  return {
    coversPerWeek,
    coversMonthly,
    potentialMonthly,
    yearReviews: reviewsNow + potentialMonthly * 12,
    twoWeekPotential: Math.max(1, Math.round(potentialMonthly / 2)),
    reviewsNow,
  };
}

export function fillScriptTemplate(
  template: string,
  vars: Record<string, string | number | null | undefined>
): string {
  return String(template).replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    vars[key] != null ? String(vars[key]) : `{{${key}}}`
  );
}
