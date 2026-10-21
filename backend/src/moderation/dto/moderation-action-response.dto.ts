import { ApiProperty } from '@nestjs/swagger';
import {
  ModerationAction,
  ModerationActionType,
  ModerationTargetType,
} from '../entities/moderation-action.entity';

export class ModerationActionResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 3 })
  moderatorId: number;

  @ApiProperty({ enum: ModerationTargetType })
  targetType: ModerationTargetType;

  @ApiProperty({ example: 12 })
  targetId: number;

  @ApiProperty({ enum: ModerationActionType })
  action: ModerationActionType;

  @ApiProperty({ nullable: true })
  reason: string | null;

  @ApiProperty()
  createdAt: Date;
}

export function toModerationActionResponse(action: ModerationAction): ModerationActionResponseDto {
  return {
    id: action.id,
    moderatorId: action.moderatorId,
    targetType: action.targetType,
    targetId: action.targetId,
    action: action.action,
    reason: action.reason,
    createdAt: action.createdAt,
  };
}
