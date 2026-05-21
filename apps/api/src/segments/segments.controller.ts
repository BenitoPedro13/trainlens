import { Controller, Get, Param, UseGuards } from '@nestjs/common';
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
}
