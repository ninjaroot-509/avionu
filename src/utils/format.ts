export const formatMoney = (
  value: number | string,
  currency = "HTG",
) =>
  `${new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)} ${currency}`;

export const formatGourdes = (value: number | string) =>
  formatMoney(value, "HTG");

export const formatMultiplier = (value: number) =>
  `${value.toFixed(2)}x`;

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const uid = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
