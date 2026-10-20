import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'jane@example.com' })
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({ minLength: 8, maxLength: 72, example: 'a-strong-passphrase' })
  @IsString()
  @MinLength(8)
  @MaxLength(72) // bcrypt ignores bytes past 72, so longer input would silently lose entropy
  password: string;
}
