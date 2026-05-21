import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { SegmentsController } from './segments.controller';
import { SegmentsService } from './segments.service';
import { SegmentPersistenceService } from './segment-persistence.service';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [SegmentsController],
  providers: [SegmentsService, SegmentPersistenceService],
  exports: [SegmentPersistenceService],
})
export class SegmentsModule {}
