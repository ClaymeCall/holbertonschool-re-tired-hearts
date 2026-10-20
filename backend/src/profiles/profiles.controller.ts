import { Body, Controller, Get, Param, ParseIntPipe, Patch, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { ProfileResponseDto, toProfileResponse } from './dto/profile-response.dto';
import { PublicProfileResponseDto, toPublicProfileResponse } from './dto/public-profile-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfilesService } from './profiles.service';

@ApiTags('profiles')
@Controller('profiles')
@UseGuards(JwtAuthGuard)
@ApiCookieAuth()
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  // Declared before `:id` so it's never matched as an id.
  @Get('me')
  @ApiOperation({ summary: "Read the caller's own profile, in full (member)" })
  async me(@CurrentUser() user: User): Promise<ProfileResponseDto> {
    const profile = await this.profiles.findOwn(user.id);
    return toProfileResponse(profile);
  }

  @Patch('me')
  @ApiOperation({ summary: "Create or update the caller's own profile (member)" })
  async updateMe(@CurrentUser() user: User, @Body() dto: UpdateProfileDto): Promise<ProfileResponseDto> {
    const profile = await this.profiles.upsertOwn(user.id, dto);
    return toProfileResponse(profile);
  }

  @Get()
  @ApiOperation({ summary: 'Discover approved profiles, allowed fields only (member)' })
  async discover(): Promise<PublicProfileResponseDto[]> {
    const profiles = await this.profiles.findApproved();
    return profiles.map(toPublicProfileResponse);
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Read one profile by id — full fields for its owner or a moderator, public fields otherwise (member)',
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ): Promise<ProfileResponseDto | PublicProfileResponseDto> {
    const { profile, isFullView } = await this.profiles.findByIdForViewer(id, user);
    return isFullView ? toProfileResponse(profile) : toPublicProfileResponse(profile);
  }
}
