import { ApiProperty } from '@nestjs/swagger';
import { ProfileResponseDto, toProfileResponse } from '../../profiles/dto/profile-response.dto';
import { Profile } from '../../profiles/entities/profile.entity';
import { AccountStatus } from '../../users/entities/user.entity';

// A profile together with the status of its owning account, as read by the moderation service.
export type ModeratedProfile = Profile & { accountStatus: AccountStatus };

// Moderator view of a profile: adds the owning account's id and status, because profile routes
// take a profile id while the suspend/reactivate routes take an account id, and the screen must
// know which of the two applies. Kept out of ProfileResponseDto so it never reaches the owner
// or member-facing profile routes.
export class ModerationProfileResponseDto extends ProfileResponseDto {
  @ApiProperty({ example: 4, description: 'Id of the owning account (for /moderation/users/:id/*)' })
  userId: number;

  @ApiProperty({ enum: AccountStatus, example: AccountStatus.ACTIVE })
  accountStatus: AccountStatus;
}

export function toModerationProfileResponse(profile: ModeratedProfile): ModerationProfileResponseDto {
  return { ...toProfileResponse(profile), userId: profile.userId, accountStatus: profile.accountStatus };
}
