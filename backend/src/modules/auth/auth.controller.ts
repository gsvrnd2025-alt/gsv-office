import {
  Controller, Post, Body, UseGuards, Request, Get, Res,
  HttpCode, HttpStatus, Ip, Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LocalAuthGuard, JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/public.decorator';
import { LoginDto, ChangePasswordDto, RefreshTokenDto } from './dto/login.dto';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 900000 } })
  @ApiOperation({ summary: 'Login with credentials' })
  async login(
    @Body() loginDto: LoginDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.validateUser(loginDto.loginId, loginDto.password);
    if (!user) {
      return { success: false, message: 'Invalid credentials' };
    }
    const result = await this.authService.login(user, ip, userAgent);

    // Set refresh token as HttpOnly cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: false, // Set true if using HTTPS
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return {
      success: true,
      data: {
        accessToken: result.accessToken,
        user: result.user,
      },
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Request() req, @Body() body: RefreshTokenDto) {
    const token = body.refreshToken || req.cookies?.refreshToken;
    if (!token) {
      return { success: false, message: 'Refresh token not provided' };
    }
    return this.authService.refreshAccessToken(token);
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Self-register a new employee' })
  async register(@Body() dto: any) {
    const user = await this.authService.register(dto);
    return {
      success: true,
      message: 'Registration successful! Awaiting admin approval.',
      data: user,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and invalidate tokens' })
  @ApiBearerAuth('JWT')
  async logout(
    @Request() req,
    @Ip() ip: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refreshToken;
    await this.authService.logout(req.user.id, refreshToken, ip);
    res.clearCookie('refreshToken');
    return { success: true, message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiBearerAuth('JWT')
  async me(@CurrentUser() user) {
    return { success: true, data: user };
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @ApiOperation({ summary: 'Change current user password' })
  @ApiBearerAuth('JWT')
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(userId, dto.oldPassword, dto.newPassword);
    return { success: true, message: 'Password changed successfully' };
  }
}
