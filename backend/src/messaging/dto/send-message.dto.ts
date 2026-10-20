import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, ValidationOptions, registerDecorator } from 'class-validator';

export const MESSAGE_MAX_LENGTH = 1000;

// Counts characters like PostgreSQL's char_length (code points), not UTF-16 units: an emoji is
// one character, so 1,000 emojis are accepted and the database CHECK agrees.
function MaxCharacters(max: number, options?: ValidationOptions) {
  return (target: object, propertyName: string) =>
    registerDecorator({
      name: 'maxCharacters',
      target: target.constructor,
      propertyName,
      options,
      validator: { validate: (value: unknown) => typeof value === 'string' && Array.from(value).length <= max },
    });
}

// There is deliberately no `senderId` / `recipientId` field: the sender is the authenticated
// member and the recipient comes from the URL, so a body that tries to set them is rejected (400).
export class SendMessageDto {
  @ApiProperty({
    example: 'Bonjour ! Contente de vous avoir rencontré à la balade.',
    minLength: 1,
    maxLength: MESSAGE_MAX_LENGTH,
    description: 'Plain text, 1 to 1,000 characters after trimming. HTML is stored as text, never interpreted.',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'The message must be text.' })
  @IsNotEmpty({ message: 'The message cannot be empty.' })
  @MaxCharacters(MESSAGE_MAX_LENGTH, { message: `The message cannot be longer than ${MESSAGE_MAX_LENGTH} characters.` })
  content: string;
}
