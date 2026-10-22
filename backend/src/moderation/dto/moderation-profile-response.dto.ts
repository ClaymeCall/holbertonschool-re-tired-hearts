import { ApiProperty } from '@nestjs/swagger';
import { ProfileResponseDto, toProfileResponse } from '../../profiles/dto/profile-response.dto';
import { Profile } from '../../profiles/entities/profile.entity';

// Moderator view of a profile: adds the owning account's id, because profile routes take a
// profile id while the suspend/reactivate routes take an account id. Kept out of
// ProfileResponseDto so it never reaches the owner or member-facing profile routes.
export class ModerationProfileResponseDto extends ProfileResponseDto {
  @ApiProperty({ example: 4, description: 'Id of the owning account (for /moderation/users/:id/*)' })
  userId: number;
}

export function toModerationProfileResponse(profile: Profile): ModerationProfileResponseDto {
  return { ...toProfileResponse(profile), userId: profile.userId };
}
