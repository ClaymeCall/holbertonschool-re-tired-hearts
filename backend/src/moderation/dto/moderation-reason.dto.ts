import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

// Every moderation action body: an optional reason, never required (docs/data-model.md's
// ModerationAction: "reason — nullable text"). Never passwords or private message content.
export class ModerationReasonDto {
  @ApiPropertyOptional({ example: 'Reported for inappropriate photos', maxLength: 500 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(500)
  reason?: string;
}
