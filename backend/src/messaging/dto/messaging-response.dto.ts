import { ApiProperty } from '@nestjs/swagger';

export class MessageResponseDto {
  @ApiProperty({ example: 12 })
  id: number;

  @ApiProperty({ description: 'Plain text, to be displayed as text only (never as HTML)' })
  content: string;

  @ApiProperty({ example: '2026-11-02T14:00:00.000Z' })
  sentAt: string;

  @ApiProperty({ description: 'True when the authenticated member wrote this message' })
  fromMe: boolean;
}

class PersonSummaryDto {
  @ApiProperty({ example: 3, description: 'Profile id of the other person (same id as GET /v1/profiles/:id)' })
  id: number;

  @ApiProperty({ nullable: true, description: 'Null when the other person is no longer available' })
  displayName: string | null;

  @ApiProperty({ nullable: true, description: 'Null when the other person is no longer available' })
  approximateLocation: string | null;

  @ApiProperty({ description: 'False when the other account is not active or the profile is not approved' })
  available: boolean;
}

export class ConversationSummaryDto {
  @ApiProperty({ type: PersonSummaryDto })
  person: PersonSummaryDto;

  @ApiProperty({ type: MessageResponseDto })
  lastMessage: MessageResponseDto;

  @ApiProperty({ example: 2, description: 'Messages from the other person that I have not opened yet' })
  unreadCount: number;
}

export class UnreadCountDto {
  @ApiProperty({ example: 5 })
  unreadCount: number;
}
