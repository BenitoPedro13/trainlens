import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt, type StrategyOptionsWithoutRequest } from 'passport-jwt';

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
  constructor() {
    const opts: StrategyOptionsWithoutRequest = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env['AUTH_SECRET'] ?? '',
      algorithms: ['HS256'],
      ignoreExpiration: false,
    };
    super(opts);
  }

  validate(payload: JwtPayload): RequestUser {
    return {
      userId: payload.sub,
      ...(payload.email !== undefined ? { email: payload.email } : {}),
    };
  }
}
