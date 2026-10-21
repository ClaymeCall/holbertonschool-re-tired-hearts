import { SetMetadata } from '@nestjs/common';

// Only `admin` is a stored role (docs/data-model.md's "Roles"): organizer is never a
// role, just ownership of a given event (event.organizer_id === caller), checked per
// resource rather than through this decorator.
export enum Role {
  ADMIN = 'admin',
}

export const ROLES_KEY = 'roles';

// Marks a route as restricted to one or more roles; read by RolesGuard. No route uses
// this yet — it's scaffolding for the moderation routes in #65, so they can write
// `@Roles(Role.ADMIN)` instead of re-implementing the check inline.
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
