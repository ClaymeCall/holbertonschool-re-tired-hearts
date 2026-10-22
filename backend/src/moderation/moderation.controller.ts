import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ActiveAccountGuard } from '../auth/active-account.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Role, Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { EventResponseDto } from '../events/dto/event-response.dto';
import { User } from '../users/entities/user.entity';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { ListProfilesByStatusQuery } from './dto/list-profiles-by-status.query';
import { ModerationActionResponseDto } from './dto/moderation-action-response.dto';
import { ModerationProfileResponseDto, toModerationProfileResponse } from './dto/moderation-profile-response.dto';
import { ModerationReasonDto } from './dto/moderation-reason.dto';
import { ModerationService } from './moderation.service';

// Admin-only throughout: moderator permissions, never a general edit power over events
// (docs/role-assignment-rules.md). The caller is always `@CurrentUser()`.
@ApiTags('moderation')
@ApiCookieAuth()
@ApiUnauthorizedResponse({ description: 'Not authenticated or session expired' })
@ApiForbiddenResponse({
  description: "Not a moderator, account not active, or acting on your own or another moderator's account/profile",
})
@UseGuards(JwtAuthGuard, ActiveAccountGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('moderation')
export class ModerationController {
  constructor(private readonly moderation: ModerationService) {}

  @Get('profiles')
  @ApiOperation({ summary: 'List profiles by moderation status (admin)' })
  @ApiOkResponse({ type: [ModerationProfileResponseDto] })
  async listProfiles(@Query() query: ListProfilesByStatusQuery): Promise<ModerationProfileResponseDto[]> {
    const profiles = await this.moderation.listProfilesByStatus(query.status);
    return profiles.map(toModerationProfileResponse);
  }

  @Get('actions')
  @ApiOperation({ summary: 'List the moderation audit log, most recent first (admin)' })
  @ApiOkResponse({ type: [ModerationActionResponseDto] })
  listActions(): Promise<ModerationActionResponseDto[]> {
    return this.moderation.listActions();
  }

  @Post('profiles/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a pending profile (admin)' })
  @ApiOkResponse({ type: ModerationProfileResponseDto })
  @ApiNotFoundResponse({ description: 'Unknown profile' })
  @ApiConflictResponse({ description: 'Not a pending profile' })
  async approveProfile(
    @CurrentUser() moderator: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ModerationReasonDto,
  ): Promise<ModerationProfileResponseDto> {
    const profile = await this.moderation.approveProfile(moderator, id, dto.reason);
    return toModerationProfileResponse(profile);
  }

  @Post('profiles/:id/block')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Block a pending or approved profile (admin)' })
  @ApiOkResponse({ type: ModerationProfileResponseDto })
  @ApiNotFoundResponse({ description: 'Unknown profile' })
  @ApiConflictResponse({ description: 'Already blocked' })
  async blockProfile(
    @CurrentUser() moderator: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ModerationReasonDto,
  ): Promise<ModerationProfileResponseDto> {
    const profile = await this.moderation.blockProfile(moderator, id, dto.reason);
    return toModerationProfileResponse(profile);
  }

  @Post('profiles/:id/unblock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unblock a blocked profile, restoring approved (admin)' })
  @ApiOkResponse({ type: ModerationProfileResponseDto })
  @ApiNotFoundResponse({ description: 'Unknown profile' })
  @ApiConflictResponse({ description: 'Not a blocked profile' })
  async unblockProfile(
    @CurrentUser() moderator: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ModerationReasonDto,
  ): Promise<ModerationProfileResponseDto> {
    const profile = await this.moderation.unblockProfile(moderator, id, dto.reason);
    return toModerationProfileResponse(profile);
  }

  @Post('users/:id/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend an active account (admin)' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'Unknown account' })
  @ApiConflictResponse({ description: 'Not an active account' })
  suspendUser(
    @CurrentUser() moderator: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ModerationReasonDto,
  ): Promise<UserResponseDto> {
    return this.moderation.suspendUser(moderator, id, dto.reason);
  }

  @Post('users/:id/reactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reactivate a suspended account (admin)' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'Unknown account' })
  @ApiConflictResponse({ description: 'Not a suspended account' })
  reactivateUser(
    @CurrentUser() moderator: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ModerationReasonDto,
  ): Promise<UserResponseDto> {
    return this.moderation.reactivateUser(moderator, id, dto.reason);
  }

  @Post('events/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Cancel any published event, through the audited moderation route (admin)" })
  @ApiOkResponse({ type: EventResponseDto })
  @ApiNotFoundResponse({ description: 'Unknown event' })
  @ApiConflictResponse({ description: 'Not a published event' })
  cancelEvent(
    @CurrentUser() moderator: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ModerationReasonDto,
  ): Promise<EventResponseDto> {
    return this.moderation.cancelEvent(moderator, id, dto.reason);
  }
}
