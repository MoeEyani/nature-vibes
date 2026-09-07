import { BRAND } from "@/constants/brand";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

/** `21,700 SAR`. Currency code trails the number, matching the references. */
export function formatCurrency(amount: number): string {
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? "−" : "";
  return `${sign}${currencyFormatter.format(Math.abs(rounded))} ${BRAND.currency}`;
}

/** `3.0 m` — millimetres are the internal unit, metres are the display unit. */
export function formatMetres(mmValue: number | undefined, digits = 1): string {
  if (mmValue === undefined) return "—";
  return `${(mmValue / 1000).toFixed(digits)} m`;
}

/** `3.0 × 4.2 m` */
export function formatFootprint(
  widthMm: number | undefined,
  lengthMm: number | undefined,
): string {
  if (widthMm === undefined || lengthMm === undefined) return "—";
  return `${(widthMm / 1000).toFixed(1)} × ${(lengthMm / 1000).toFixed(1)} m`;
}

export function formatLitres(litres: number): string {
  return `${currencyFormatter.format(Math.round(litres))} L`;
}

export function formatKilograms(kg: number): string {
  return `${currencyFormatter.format(Math.round(kg))} kg`;
}

export function formatArea(squareMetres: number): string {
  return `${squareMetres.toFixed(1)} m²`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
