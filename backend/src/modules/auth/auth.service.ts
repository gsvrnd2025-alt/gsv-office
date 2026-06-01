import {
  Injectable, UnauthorizedException, BadRequestException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../users/user.entity';
import { RefreshToken } from './refresh-token.entity';
import { AuditService } from '../audit/audit.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(RefreshToken) private refreshTokenRepo: Repository<RefreshToken>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private auditService: AuditService,
  ) {}

  async validateUser(loginId: string, password: string): Promise<User | null> {
    // Try login by loginId or email
    const user = await this.usersRepo.findOne({
      where: [{ loginId }, { email: loginId }],
      relations: ['role', 'department'],
    });

    if (!user) return null;
    if (user.status === 'blocked') {
      throw new UnauthorizedException('Your account has been blocked. Contact your administrator.');
    }
    if (user.status === 'inactive') {
      throw new UnauthorizedException('Your account is inactive. Contact your administrator.');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return null;

    return user;
  }

  async login(user: User, ip?: string, userAgent?: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(user),
      this.generateRefreshToken(user, ip, userAgent),
    ]);

    // Update last login
    await this.usersRepo.update(user.id, {
      lastLogin: new Date(),
      loginCount: user.loginCount + 1,
      isOnline: true,
    });

    await this.auditService.log({
      userId: user.id,
      action: 'login',
      description: `User ${user.loginId} logged in`,
      ipAddress: ip,
      userAgent,
    });

    return {
      accessToken,
      refreshToken,
      user: this.sanitizeUser(user),
    };
  }

  async refreshAccessToken(refreshTokenStr: string) {
    const tokenHash = this.hashToken(refreshTokenStr);
    const stored = await this.refreshTokenRepo.findOne({
      where: { tokenHash },
      relations: ['user', 'user.role', 'user.department'],
    });

    if (!stored || stored.isRevoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const newAccessToken = await this.generateAccessToken(stored.user);
    return { accessToken: newAccessToken };
  }

  async logout(userId: string, refreshTokenStr?: string, ip?: string) {
    if (refreshTokenStr) {
      const tokenHash = this.hashToken(refreshTokenStr);
      await this.refreshTokenRepo.update({ tokenHash }, { isRevoked: true });
    }

    await this.usersRepo.update(userId, { isOnline: false, lastSeen: new Date() });
    await this.auditService.log({ userId, action: 'logout', description: 'User logged out', ipAddress: ip });
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isMatch) throw new BadRequestException('Current password is incorrect');

    const hash = await bcrypt.hash(newPassword, this.configService.get<number>('BCRYPT_ROUNDS', 12));
    await this.usersRepo.update(userId, {
      passwordHash: hash,
      forcePasswordChange: false,
    });
  }

  private async generateAccessToken(user: User): Promise<string> {
    const payload = {
      sub: user.id,
      loginId: user.loginId,
      email: user.email,
      roleId: user.roleId,
      roleName: user.role?.name,
    };
    return this.jwtService.signAsync(payload);
  }

  private async generateRefreshToken(user: User, ip?: string, userAgent?: string): Promise<string> {
    const token = crypto.randomBytes(64).toString('hex');
    const tokenHash = this.hashToken(token);
    const expiryDays = parseInt(
      this.configService.get<string>('JWT_REFRESH_EXPIRY', '7d').replace('d', ''),
    );

    const refreshToken = this.refreshTokenRepo.create({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000),
      ipAddress: ip,
      userAgent,
    });

    await this.refreshTokenRepo.save(refreshToken);
    return token;
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private sanitizeUser(user: User) {
    const { passwordHash, twoFactorSecret, ...safe } = user as any;
    return safe;
  }
}
