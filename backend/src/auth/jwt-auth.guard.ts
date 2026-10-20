import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Verifies the session only (valid, unexpired token for an existing user). It does not
// check account_status: GET /v1/auth/me must stay reachable for suspended/blocked
// accounts so they can see why they're restricted. Status-based route protection is #42/#66.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
