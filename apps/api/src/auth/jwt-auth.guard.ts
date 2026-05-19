import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Apply to any controller or route to require a valid Auth.js JWT.
 *
 * Usage:
 *   @UseGuards(JwtAuthGuard)
 *   @Get('protected')
 *   getProtected(@CurrentUser() user: RequestUser) { ... }
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
