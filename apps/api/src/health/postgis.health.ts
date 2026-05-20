import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class PostgisHealthIndicator extends HealthIndicator {
  constructor(private readonly db: DatabaseService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const rows = await this.db.client.$queryRaw<Array<{ dist: number }>>`
        SELECT ST_Distance(
          ST_MakePoint(0, 0)::geography,
          ST_MakePoint(0, 0.001)::geography
        ) AS dist
      `;
      const dist = rows[0]?.dist;
      if (dist == null || dist <= 0) {
        throw new Error('ST_Distance returned unexpected result');
      }
      return this.getStatus(key, true, { sampleMeters: Math.round(dist) });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new HealthCheckError('PostGIS check failed', this.getStatus(key, false, { message }));
    }
  }
}
