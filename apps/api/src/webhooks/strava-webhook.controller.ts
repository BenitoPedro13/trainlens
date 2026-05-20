import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { StravaWebhookService } from './strava-webhook.service';
import type { StravaWebhookEvent, StravaWebhookVerifyQuery } from './strava-webhook.types';

@Controller('webhooks/strava')
export class StravaWebhookController {
  constructor(private readonly webhooks: StravaWebhookService) {}

  /** Strava subscription validation (GET). */
  @Get()
  verify(@Query() query: StravaWebhookVerifyQuery): { 'hub.challenge': string } {
    const result = this.webhooks.verifySubscription(query);
    if (!result) {
      throw new ForbiddenException('Invalid verify token');
    }
    return result;
  }

  /** Strava push events (POST). */
  @Post()
  @HttpCode(HttpStatus.OK)
  async receive(@Body() body: StravaWebhookEvent): Promise<{ received: true }> {
    await this.webhooks.ingestEvent(body);
    return { received: true };
  }
}
