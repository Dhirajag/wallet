import { WalletSummary } from './api';
export function parseAmountToCents(input: string): number | null {
  if (!input || typeof input !== 'string') {
    return null;
  }
  let cleaned = input.trim();
  if (cleaned.startsWith('$')) {
    cleaned = cleaned.substring(1);
  }
  cleaned = cleaned.trim();
  if (cleaned.length === 0) {
    return null;
  }
  const isValidFormat = /^-?\d*\.?\d{0,2}$/.test(cleaned);
  if (!isValidFormat) {
    return null;
  }
  const numberValue = parseFloat(cleaned);
  if (isNaN(numberValue) || !isFinite(numberValue)) {
    return null;
  }
  const cents = Math.round(numberValue * 100);
  return cents;
}
export function validateTopUpAmount(
  input: string,
  summary?: WalletSummary
): string | null {
  if (!input || input.trim().length === 0) {
    return "Please enter a valid amount";
  }
  const cents = parseAmountToCents(input);
  if (cents === null) {
    return "Please enter a valid amount";
  }
  if (cents <= 0) {
    return "Amount must be greater than $0.00";
  }
  const MIN_TOP_UP_CENTS = 100;
  if (cents < MIN_TOP_UP_CENTS) {
    return "Minimum top-up is $1.00";
  }
  const MAX_TOP_UP_CENTS = 50000;
  if (cents > MAX_TOP_UP_CENTS) {
    return "Maximum single top-up is $500.00";
  }
  if (summary) {
    if (cents > summary.remainingDailyTopUpCents) {
      return "Amount exceeds your remaining daily limit";
    }
  }
  return null;
}