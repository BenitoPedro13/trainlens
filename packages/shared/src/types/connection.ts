import type { ProviderType } from './provider.js';

export type ConnectionStatus = 'active' | 'paused' | 'revoked' | 'error';

export interface Connection {
  id: string;
  userId: string;
  provider: ProviderType;
  externalAthleteId: string;
  status: ConnectionStatus;
  scope: string;
  createdAt: Date;
  updatedAt: Date;
  lastSyncedAt?: Date;
  syncErrorMessage?: string;
}
