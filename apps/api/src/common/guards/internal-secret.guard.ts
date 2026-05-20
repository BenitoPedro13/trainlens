import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class InternalSecretGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined> }>();
    const secret = process.env['INTERNAL_SYNC_SECRET'];
    const raw = req.headers['x-internal-secret'];
    const header = Array.isArray(raw) ? raw[0] : raw;

    if (!secret || header !== secret) {
      throw new UnauthorizedException();
    }
    return true;
  }
}
