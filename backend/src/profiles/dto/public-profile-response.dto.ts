import { ApiProperty } from '@nestjs/swagger';
import { InterestResponseDto, toInterestResponse } from '../../interests/dto/interest-response.dto';
import { Profile } from '../entities/profile.entity';

// Discovery view: what one authenticated member sees of another's approved profile.
// Deliberately omits `messagingEnabled` and `moderationStatus` — see
// docs/profile-visibility-rules.md ("Field visibility").
export class PublicProfileResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Jane D.' })
  displayName: string;

  @ApiProperty({ nullable: true })
  bio: string | null;

  @ApiProperty({ example: 'Lyon' })
  approximateLocation: string;

  @ApiProperty({ type: [InterestResponseDto] })
  interests: InterestResponseDto[];
}

export function toPublicProfileResponse(profile: Profile): PublicProfileResponseDto {
  return {
    id: profile.id,
    displayName: profile.displayName,
    bio: profile.bio,
    approximateLocation: profile.approximateLocation,
    interests: (profile.interests ?? []).map(toInterestResponse),
  };
}
