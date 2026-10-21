import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { ConversationSummaryDto, MessageResponseDto, UnreadCountDto } from './dto/messaging-response.dto';
import { MessagesQuery } from './dto/messages.query';
import { SendMessageDto } from './dto/send-message.dto';
import { MessagingService } from './messaging.service';

// Every route is "my conversation with person :personId" (profile id). The caller is always
// `@CurrentUser()`, so nobody can address, read or write a conversation they are not part of.
@ApiTags('conversations')
@ApiCookieAuth()
@ApiUnauthorizedResponse({ description: 'Not authenticated or session expired' })
@ApiForbiddenResponse({ description: 'Account not active or profile not approved' })
@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class MessagingController {
  constructor(private readonly messaging: MessagingService) {}

  @Get()
  @ApiOperation({ summary: 'My conversations, most recent first, with the last message and my unread count (member)' })
  @ApiOkResponse({ type: [ConversationSummaryDto] })
  list(@CurrentUser() user: User): Promise<ConversationSummaryDto[]> {
    return this.messaging.listConversations(user);
  }

  // Declared before "with/..." routes; a light endpoint meant to be polled.
  @Get('unread-count')
  @ApiOperation({ summary: 'Total of messages I have not opened yet (member)' })
  @ApiOkResponse({ type: UnreadCountDto })
  unreadCount(@CurrentUser() user: User): Promise<UnreadCountDto> {
    return this.messaging.unreadCount(user);
  }

  @Get('with/:personId/messages')
  @ApiOperation({ summary: 'My messages with a person, oldest first (member). Empty when we have not written yet.' })
  @ApiOkResponse({ type: [MessageResponseDto] })
  @ApiNotFoundResponse({ description: 'Unknown or unreachable person' })
  getMessages(
    @CurrentUser() user: User,
    @Param('personId', ParseIntPipe) personId: number,
    @Query() query: MessagesQuery,
  ): Promise<MessageResponseDto[]> {
    return this.messaging.getMessages(user, personId, query.limit);
  }

  @Post('with/:personId/messages')
  @ApiOperation({ summary: 'Send a message to a person; the conversation is created by the first message (approved member)' })
  @ApiCreatedResponse({ type: MessageResponseDto })
  @ApiBadRequestResponse({ description: 'Empty message, more than 1,000 characters, unknown field, or writing to yourself' })
  @ApiNotFoundResponse({ description: 'Unknown or unreachable person' })
  @ApiForbiddenResponse({ description: 'No contact link, messaging turned off on either side, or account/profile not allowed' })
  send(
    @CurrentUser() user: User,
    @Param('personId', ParseIntPipe) personId: number,
    @Body() dto: SendMessageDto,
  ): Promise<MessageResponseDto> {
    return this.messaging.send(user, personId, dto);
  }

  @Post('with/:personId/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark the messages I received from a person as read (member)' })
  @ApiNoContentResponse({ description: 'Marked as read' })
  markRead(@CurrentUser() user: User, @Param('personId', ParseIntPipe) personId: number): Promise<void> {
    return this.messaging.markRead(user, personId);
  }
}
