import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class UpdateProfileDto {
  @ApiProperty({ minLength: 1, maxLength: 60, example: 'Jane D.' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  displayName: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @ApiProperty({ minLength: 1, maxLength: 100, example: 'Lyon' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  approximateLocation: string;

  // A privacy choice, not a role/status field: the owner is allowed to set this directly.
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  messagingEnabled?: boolean;

  @ApiPropertyOptional({ type: [Number], example: [1, 4] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  interestIds?: number[];
}
