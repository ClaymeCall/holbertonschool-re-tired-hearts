import { ApiProperty } from '@nestjs/swagger';
import { AccountStatus, User } from '../entities/user.entity';

export class UserResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'jane@example.com' })
  email: string;

  @ApiProperty({ example: false })
  isAdmin: boolean;

  @ApiProperty({ enum: AccountStatus, example: AccountStatus.ACTIVE })
  accountStatus: AccountStatus;

  @ApiProperty()
  createdAt: Date;
}

// Never return `passwordHash`: this is the only shape a User is allowed to leave the API in.
export function toUserResponse(user: User): UserResponseDto {
  return {
    id: user.id,
    email: user.email,
    isAdmin: user.isAdmin,
    accountStatus: user.accountStatus,
    createdAt: user.createdAt,
  };
}
