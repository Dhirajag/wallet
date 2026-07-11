export function formatCents(cents: number): string {
  if (typeof cents !== 'number' || isNaN(cents)) {
    return '$0.00';
  }
  
  const dollars = Math.abs(cents) / 100;
  const formatted = dollars.toFixed(2);
  const sign = cents < 0 ? '-' : '';
  return `${sign}$${formatted}`;
}

/**
 * Preserve the existing discountLabel behavior
 */
export function discountLabel(originalPrice: number, discountPercent: number): string {
  if (discountPercent <= 0 || discountPercent >= 100 || originalPrice <= 0) {
    return '';
  }
  const discountAmount = originalPrice * (discountPercent / 100);
  return `-$${discountAmount.toFixed(2)}`;
}