import { Controller, Get, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { CurrentUser } from './current-user.decorator.js';
import type { RequestUser } from './jwt.strategy.js';

@Controller('me')
export class AuthController {
  @Get()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  getMe(@CurrentUser() user: RequestUser): { userId: string; email?: string } {
    return { userId: user.userId, ...(user.email ? { email: user.email } : {}) };
  }
}
