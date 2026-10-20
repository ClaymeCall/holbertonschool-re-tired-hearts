import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { jwtConfig } from '../config/jwt.config';
import { User } from '../users/entities/user.entity';
import { ACCESS_TOKEN_COOKIE } from './cookie';

interface JwtPayload {
  sub: number;
}

function fromCookie(req: Request): string | null {
  return req?.cookies?.[ACCESS_TOKEN_COOKIE] ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([fromCookie]),
      ignoreExpiration: false,
      secretOrKey: jwtConfig.secret,
    });
  }

  // Runs on every authenticated request: re-reads the account from the database rather
  // than trusting the JWT payload, so a status change (suspension, self-deletion) takes
  // effect immediately instead of waiting for the token to expire.
  async validate(payload: JwtPayload): Promise<User> {
    const user = await this.users.findOneBy({ id: payload.sub });
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
