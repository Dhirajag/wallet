export interface WalletSummary {
  balanceCents: number;
  remainingDailyTopUpCents: number;
}
export interface TopUpQuote {
  amountCents: number;
  feeCents: number;
  resultingBalanceCents: number;
}
export interface WalletApi {
  fetchWalletSummary(userId: string): Promise<WalletSummary>;
  createTopUpQuote(userId: string, amountCents: number): Promise<TopUpQuote>;
}
export const defaultWalletApi: WalletApi = {
  async fetchWalletSummary(userId: string): Promise<WalletSummary> {
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid userId');
    }
    const delay = 500 + Math.random() * 500;
    await new Promise(resolve => setTimeout(resolve, delay));
    return {
      balanceCents: 2000,
      remainingDailyTopUpCents: 45000,
    };
  },
  async createTopUpQuote(userId: string, amountCents: number): Promise<TopUpQuote> {
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid userId');
    }
    if (!amountCents || typeof amountCents !== 'number' || amountCents <= 0) {
      throw new Error('Invalid amount');
    }
    const delay = 400 + Math.random() * 400;
    await new Promise(resolve => setTimeout(resolve, delay));
    const feeCents = Math.max(30, Math.round(amountCents * 0.03));
    return {
      amountCents,
      feeCents,
      resultingBalanceCents: 2000 + amountCents,
    };
  },
};