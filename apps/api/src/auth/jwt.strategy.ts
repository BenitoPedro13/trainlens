import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt, type StrategyOptionsWithoutRequest } from 'passport-jwt';
import { DatabaseService } from '../database/database.service';

export interface JwtPayload {
  /** Auth.js sets the userId as the JWT `sub` claim */
  sub: string;
  email?: string;
  name?: string | null;
  iat?: number;
  exp?: number;
  jti?: string;
}

export interface RequestUser {
  userId: string;
  email?: string | undefined;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly db: DatabaseService) {
    const opts: StrategyOptionsWithoutRequest = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env['AUTH_SECRET'] ?? '',
      algorithms: ['HS256'],
      ignoreExpiration: false,
    };
    super(opts);
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    const user = await this.db.client.user.findUnique({
      where: { id: payload.sub },
      select: { deletedAt: true },
    });
    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Account unavailable');
    }
    return {
      userId: payload.sub,
      ...(payload.email !== undefined ? { email: payload.email } : {}),
    };
  }
}
