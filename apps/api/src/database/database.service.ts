import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@trainlens/database';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  readonly client: PrismaClient;

  constructor(@InjectPinoLogger(DatabaseService.name) private readonly logger: PinoLogger) {
    this.client = new PrismaClient({
      log: [
        { emit: 'stdout', level: 'error' },
        { emit: 'stdout', level: 'warn' },
      ],
    });
  }

  async onModuleInit() {
    await this.client.$connect();
    this.logger.info('Database connected');
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
    this.logger.info('Database disconnected');
  }
}
