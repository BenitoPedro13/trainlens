import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { RequestUser } from '../auth/jwt.strategy';
import { SegmentsService } from './segments.service';

@Controller('segments')
@UseGuards(JwtAuthGuard)
export class SegmentsController {
  constructor(private readonly segments: SegmentsService) {}

  @Get()
  listSegments(@CurrentUser() user: RequestUser) {
    return this.segments.listUserSegments(user.userId);
  }

  @Get(':id')
  getSegment(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.segments.getSegmentDetail(user.userId, id);
  }

  @Get(':id/leaderboard')
  getLeaderboard(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Query('gender') gender?: string,
    @Query('ageGroup') ageGroup?: string,
    @Query('weightClass') weightClass?: string,
  ) {
    const filter: { gender?: string; ageGroup?: string; weightClass?: string } = {};
    if (gender) filter.gender = gender;
    if (ageGroup) filter.ageGroup = ageGroup;
    if (weightClass) filter.weightClass = weightClass;
    return this.segments.getSegmentLeaderboard(user.userId, id, filter);
  }

  @Get(':id/compare')
  compareEfforts(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Query('e1') e1: string,
    @Query('e2') e2: string,
  ) {
    return this.segments.compareEfforts(user.userId, id, e1, e2);
  }
}
