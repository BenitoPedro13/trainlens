import { Module } from '@nestjs/common';
import { StravaAdapter } from './strava.adapter';

@Module({
  providers: [StravaAdapter],
  exports: [StravaAdapter],
})
export class StravaModule {}
