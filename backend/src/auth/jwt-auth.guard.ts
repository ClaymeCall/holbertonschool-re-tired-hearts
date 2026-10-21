import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Verifies the session only (valid, unexpired token for an existing user). It does not
// check account_status: GET /v1/auth/me must stay reachable for suspended/blocked
// accounts so they can see why they're restricted. Pair with ActiveAccountGuard (#42) on
// any route that must reject a suspended/self-deleted account; profile-moderation-status
// restrictions (pending/blocked) beyond what ProfilesService already branches on are #66.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
