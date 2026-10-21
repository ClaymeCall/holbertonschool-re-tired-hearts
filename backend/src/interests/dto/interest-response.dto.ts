import { ApiProperty } from '@nestjs/swagger';
import { Interest } from '../entities/interest.entity';

export class InterestResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Gardening' })
  name: string;
}

export function toInterestResponse(interest: Interest): InterestResponseDto {
  return { id: interest.id, name: interest.name };
}
