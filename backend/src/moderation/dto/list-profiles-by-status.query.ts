import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ProfileModerationStatus } from '../../profiles/entities/profile.entity';

export class ListProfilesByStatusQuery {
  @ApiProperty({ enum: ProfileModerationStatus, example: ProfileModerationStatus.PENDING })
  @IsEnum(ProfileModerationStatus)
  status: ProfileModerationStatus;
}
