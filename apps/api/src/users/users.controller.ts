import { Body, Controller, Delete, Get, HttpCode, Patch, Post, UseGuards } from '@nestjs/common';
import type { TrainingSettings } from '@trainlens/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { RequestUser } from '../auth/jwt.strategy';
import { UsersService } from './users.service';

class DisconnectStravaDto {
  deleteActivities!: boolean;
}

@Controller('users/me')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('sync-status')
  getSyncStatus(@CurrentUser() user: RequestUser) {
    return this.users.getSyncStatus(user.userId);
  }

  @Get('training-settings')
  getTrainingSettings(@CurrentUser() user: RequestUser) {
    return this.users.getTrainingSettings(user.userId);
  }

  @Patch('training-settings')
  updateTrainingSettings(
    @CurrentUser() user: RequestUser,
    @Body() body: Partial<TrainingSettings>,
  ) {
    return this.users.updateTrainingSettings(user.userId, body);
  }

  @Post('connections/strava/disconnect')
  @HttpCode(204)
  disconnectStrava(
    @CurrentUser() user: RequestUser,
    @Body() body: DisconnectStravaDto,
  ) {
    return this.users.disconnectStrava(user.userId, Boolean(body.deleteActivities));
  }

  @Post('export')
  exportData(@CurrentUser() user: RequestUser) {
    return this.users.exportUserData(user.userId);
  }

  @Delete()
  @HttpCode(204)
  deleteAccount(@CurrentUser() user: RequestUser) {
    return this.users.softDeleteAccount(user.userId);
  }
}
