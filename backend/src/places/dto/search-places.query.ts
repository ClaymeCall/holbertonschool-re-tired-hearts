import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class SearchPlacesQuery {
  @ApiProperty({ description: 'Start of a municipality name (2 to 60 characters)', example: 'lyo' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  q: string;
}
