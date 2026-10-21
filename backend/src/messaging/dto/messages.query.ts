import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export const MAX_MESSAGES_LIMIT = 200;

export class MessagesQuery {
  @ApiPropertyOptional({
    default: MAX_MESSAGES_LIMIT,
    minimum: 1,
    maximum: MAX_MESSAGES_LIMIT,
    description: 'Number of most recent messages returned (always in chronological order)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_MESSAGES_LIMIT)
  limit: number = MAX_MESSAGES_LIMIT;
}
