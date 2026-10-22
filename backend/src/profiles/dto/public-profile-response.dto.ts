import { ApiProperty } from '@nestjs/swagger';
import { InterestResponseDto, toInterestResponse } from '../../interests/dto/interest-response.dto';
import { Profile } from '../entities/profile.entity';

// Discovery view: what one authenticated member sees of another's approved profile.
// Includes `messagingEnabled` so the client can grey out message sending; deliberately omits
// `moderationStatus` — see docs/profile-visibility-rules.md ("Field visibility").
export class PublicProfileResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Jane D.' })
  displayName: string;

  @ApiProperty({ nullable: true })
  bio: string | null;

  @ApiProperty({ example: 'Lyon' })
  approximateLocation: string;

  @ApiProperty({
    example: true,
    description:
      'Whether this member accepts private messages. A UI hint only: sending is still checked server-side against the full eligibility rule.',
  })
  messagingEnabled: boolean;

  @ApiProperty({ type: [InterestResponseDto] })
  interests: InterestResponseDto[];
}

export function toPublicProfileResponse(profile: Profile): PublicProfileResponseDto {
  return {
    id: profile.id,
    displayName: profile.displayName,
    bio: profile.bio,
    approximateLocation: profile.approximateLocation,
    messagingEnabled: profile.messagingEnabled,
    interests: (profile.interests ?? []).map(toInterestResponse),
  };
}
