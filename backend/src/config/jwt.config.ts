import { JwtModuleOptions } from '@nestjs/jwt';
import { SESSION_DURATION_SECONDS } from '../auth/session.constants';

export const jwtConfig: JwtModuleOptions = {
  secret: process.env.JWT_SECRET,
  signOptions: { expiresIn: SESSION_DURATION_SECONDS },
};
