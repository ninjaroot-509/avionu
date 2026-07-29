export const formatMoney = (
  value: number | string,
  currency = "HTG",
  fractionDigits = 2,
) =>
  `${new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(Number(value) || 0)} ${currency}`;

export const formatGourdes = (value: number | string) =>
  formatMoney(value, "HTG");

const moneyToMinorUnits = (value: number | string) => {
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(String(value).trim());
  if (!match) return 0n;

  const [, sign, whole, fraction = ""] = match;
  const minorUnits =
    BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  return sign === "-" ? -minorUnits : minorUnits;
};

export const sumMoney = (values: readonly (number | string)[]) => {
  const total = values.reduce(
    (sum, value) => sum + moneyToMinorUnits(value),
    0n,
  );
  const sign = total < 0n ? "-" : "";
  const absolute = total < 0n ? -total : total;

  return `${sign}${absolute / 100n}.${String(absolute % 100n).padStart(2, "0")}`;
};

export const formatMultiplier = (value: number) =>
  `${value.toFixed(2)}x`;

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const uid = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
