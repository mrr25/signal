import { MarketTick, ProviderStatus } from '../../../../shared/types/index.ts';

export interface MarketDataProvider {
  id: string;
  name: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  subscribe(symbols: string[]): Promise<void>;
  unsubscribe(symbols: string[]): Promise<void>;
  onMarketUpdate(callback: (tick: MarketTick) => void): void;
  getStatus(): ProviderStatus;
}
