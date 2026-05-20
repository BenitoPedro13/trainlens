import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import type { ActivityType } from '@trainlens/database';
import type { ActivityDetailResponse, PaginatedActivitiesResponse } from '@trainlens/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { RequestUser } from '../auth/jwt.strategy';
import { ActivitiesService } from './activities.service';

@Controller('activities')
@UseGuards(JwtAuthGuard)
export class ActivitiesController {
  constructor(private readonly activities: ActivitiesService) {}

  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('activityType') activityType?: ActivityType,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<PaginatedActivitiesResponse> {
    return this.activities.list(user.userId, {
      page: Math.max(1, parseInt(page, 10) || 1),
      limit: Math.min(100, Math.max(1, parseInt(limit, 10) || 20)),
      ...(activityType && { activityType }),
      ...(from && { from }),
      ...(to && { to }),
    });
  }

  @Get(':id')
  getOne(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Query('includeRaw') includeRaw?: string,
  ): Promise<ActivityDetailResponse> {
    return this.activities.getById(user.userId, id, includeRaw === 'true');
  }
}
