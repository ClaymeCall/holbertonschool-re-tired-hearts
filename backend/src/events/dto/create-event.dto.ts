import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsInt, IsNotEmpty, IsString, Max, MaxLength, Min } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

// There is deliberately no `status`, `organizerId` or `registeredCount` field: the status is
// changed only through the lifecycle routes, and the organizer is always the authenticated user.
export class CreateEventDto {
  @ApiProperty({ example: 'Balade au parc', maxLength: 120 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title: string;

  @ApiProperty({ example: 'Une sortie conviviale pour faire connaissance.', maxLength: 2000 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description: string;

  @ApiProperty({ example: 'Lyon', description: 'City only, never an exact address', maxLength: 100 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  approximateLocation: string;

  @ApiProperty({ example: '2026-11-02T14:00:00.000Z', description: 'ISO 8601 date, must be in the future' })
  @IsDateString()
  startsAt: string;

  @ApiProperty({ example: 20, minimum: 1, maximum: 1000 })
  @IsInt()
  @Min(1)
  @Max(1000)
  capacity: number;

  @ApiProperty({ example: 3, description: 'Id of the main interest (see GET /v1/interests)' })
  @IsInt()
  @Min(1)
  mainInterestId: number;
}
