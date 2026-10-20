import { Body, Controller, Get, HttpCode, HttpStatus, Post, Res, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { User } from '../users/entities/user.entity';
import { toUserResponse, UserResponseDto } from '../users/dto/user-response.dto';
import { AuthService } from './auth.service';
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_COOKIE_OPTIONS,
  CLEAR_ACCESS_TOKEN_COOKIE_OPTIONS,
} from './cookie';
import { CurrentUser } from './current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a member account and start a session (public)' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserResponseDto> {
    const user = await this.authService.register(dto);
    this.startSession(res, user);
    return toUserResponse(user);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start a session for an existing account (public)' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserResponseDto> {
    const user = await this.authService.validateCredentials(dto);
    this.startSession(res, user);
    return toUserResponse(user);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'End the current session (member)' })
  logout(@Res({ passthrough: true }) res: Response): void {
    res.clearCookie(ACCESS_TOKEN_COOKIE, CLEAR_ACCESS_TOKEN_COOKIE_OPTIONS);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Read the authenticated account, including its restrictions (any authenticated account)' })
  me(@CurrentUser() user: User): UserResponseDto {
    return toUserResponse(user);
  }

  private startSession(res: Response, user: User): void {
    const token = this.authService.signToken(user);
    res.cookie(ACCESS_TOKEN_COOKIE, token, ACCESS_TOKEN_COOKIE_OPTIONS);
  }
}
