import { ApiProperty } from '@nestjs/swagger';
import { InterestResponseDto, toInterestResponse } from '../../interests/dto/interest-response.dto';
import { Profile, ProfileModerationStatus } from '../entities/profile.entity';

// Full view: the profile owner, or a moderator. Never sent to any other member — see
// docs/profile-visibility-rules.md ("Field visibility").
export class ProfileResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Jane D.' })
  displayName: string;

  @ApiProperty({ nullable: true })
  bio: string | null;

  @ApiProperty({ example: 'Lyon' })
  approximateLocation: string;

  @ApiProperty({ example: true })
  messagingEnabled: boolean;

  @ApiProperty({ enum: ProfileModerationStatus, example: ProfileModerationStatus.PENDING })
  moderationStatus: ProfileModerationStatus;

  @ApiProperty({ type: [InterestResponseDto] })
  interests: InterestResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export function toProfileResponse(profile: Profile): ProfileResponseDto {
  return {
    id: profile.id,
    displayName: profile.displayName,
    bio: profile.bio,
    approximateLocation: profile.approximateLocation,
    messagingEnabled: profile.messagingEnabled,
    moderationStatus: profile.moderationStatus,
    interests: (profile.interests ?? []).map(toInterestResponse),
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}
