import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiConflictResponse,
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
import { ActiveAccountGuard } from '../auth/active-account.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { EventListResponseDto, EventResponseDto, MyEventsResponseDto } from './dto/event-response.dto';
import { ListEventsQuery } from './dto/list-events.query';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventsService } from './events.service';

// The caller is always `@CurrentUser()` (taken from the session), never an id sent by the client.
// Genuinely member-only, like ProfilesController: every route here needs ActiveAccountGuard (#66).
@ApiTags('events')
@ApiCookieAuth()
@ApiUnauthorizedResponse({ description: 'Not authenticated or session expired' })
@UseGuards(JwtAuthGuard, ActiveAccountGuard)
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @ApiOperation({ summary: 'List published events, paginated, filterable by interest and location (member)' })
  @ApiOkResponse({ type: EventListResponseDto })
  list(@CurrentUser() user: User, @Query() query: ListEventsQuery): Promise<EventListResponseDto> {
    return this.eventsService.list(user, query);
  }

  // Declared before ':id' so that "mine" is not read as an event id.
  @Get('mine')
  @ApiOperation({ summary: 'Events I am registered for and events I organize (member)' })
  @ApiOkResponse({ type: MyEventsResponseDto })
  listMine(@CurrentUser() user: User): Promise<MyEventsResponseDto> {
    return this.eventsService.listMine(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Read one event (a draft: organizer or moderator; cancelled/completed: organizer, moderator, registered members)' })
  @ApiOkResponse({ type: EventResponseDto })
  @ApiNotFoundResponse({ description: 'Unknown event, or an event the caller may not see' })
  getById(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number): Promise<EventResponseDto> {
    return this.eventsService.getById(user, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create an event as a draft (approved member)' })
  @ApiCreatedResponse({ type: EventResponseDto })
  @ApiForbiddenResponse({ description: 'Account not active or profile not approved' })
  create(@CurrentUser() user: User, @Body() dto: CreateEventDto): Promise<EventResponseDto> {
    return this.eventsService.create(user, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit a draft or published event (organizer)' })
  @ApiOkResponse({ type: EventResponseDto })
  @ApiForbiddenResponse({ description: 'Not the organizer' })
  @ApiConflictResponse({ description: 'Cancelled/completed event, or capacity below the registered count' })
  update(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEventDto,
  ): Promise<EventResponseDto> {
    return this.eventsService.update(user, id, dto);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish a draft (organizer)' })
  @ApiOkResponse({ type: EventResponseDto })
  @ApiForbiddenResponse({ description: 'Not the organizer' })
  @ApiConflictResponse({ description: 'Not a draft, or start date already passed' })
  publish(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number): Promise<EventResponseDto> {
    return this.eventsService.publish(user, id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a published event (organizer); a moderator uses the moderation route' })
  @ApiOkResponse({ type: EventResponseDto })
  @ApiForbiddenResponse({ description: 'Not the organizer' })
  @ApiConflictResponse({ description: 'Not a published event' })
  cancel(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number): Promise<EventResponseDto> {
    return this.eventsService.cancel(user, id);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a past published event as completed (organizer)' })
  @ApiOkResponse({ type: EventResponseDto })
  @ApiForbiddenResponse({ description: 'Not the organizer' })
  @ApiConflictResponse({ description: 'Not published, or start date not passed yet' })
  complete(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number): Promise<EventResponseDto> {
    return this.eventsService.complete(user, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a draft without registration (organizer)' })
  @ApiNoContentResponse({ description: 'Deleted' })
  @ApiForbiddenResponse({ description: 'Not the organizer' })
  @ApiConflictResponse({ description: 'Not a draft, or it has registrations' })
  remove(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.eventsService.remove(user, id);
  }

  @Post(':id/registrations')
  @ApiOperation({ summary: 'Register for an event, or register again after a withdrawal (approved member)' })
  @ApiCreatedResponse({ type: EventResponseDto })
  @ApiForbiddenResponse({ description: 'Own event, account not active or profile not approved' })
  @ApiConflictResponse({ description: 'Event full, not open, already started or already registered' })
  register(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number): Promise<EventResponseDto> {
    return this.eventsService.register(user, id);
  }

  @Delete(':id/registrations/me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Withdraw my registration, which frees a place (member)' })
  @ApiOkResponse({ type: EventResponseDto })
  @ApiConflictResponse({ description: 'Not registered, or the event is no longer published' })
  withdraw(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number): Promise<EventResponseDto> {
    return this.eventsService.withdraw(user, id);
  }
}
