import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@trainlens/database';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(@InjectPinoLogger(DatabaseService.name) private readonly logger: PinoLogger) {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.info('Database connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.info('Database disconnected');
  }
}
