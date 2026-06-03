import {
  Injectable, UnauthorizedException, BadRequestException, NotFoundException, Logger,
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
    // Try login by loginId, email, or phone (mobile number)
    const user = await this.usersRepo.findOne({
      where: [{ loginId }, { email: loginId }, { phone: loginId }],
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

  async register(dto: any) {
    const loginId = dto.loginId || dto.email.split('@')[0];
    const existing = await this.usersRepo.findOne({
      where: [{ email: dto.email }, { loginId }],
    });
    if (existing) {
      throw new BadRequestException(
        existing.email === dto.email ? 'Email already in use' : 'Login ID already in use',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    
    // Generate employee ID
    const count = await this.usersRepo.count({ withDeleted: true });
    const employeeId = `EMP-${String(count + 1).padStart(4, '0')}`;

    const user = this.usersRepo.create({
      ...dto,
      loginId,
      passwordHash,
      employeeId,
      status: 'pending', // Self-registrations are pending admin approval
    } as any) as any as User;

    const saved = await this.usersRepo.save(user);

    await this.auditService.log({
      userId: saved.id,
      action: 'create',
      resourceType: 'user',
      resourceId: saved.id,
      description: `User self-registered: ${saved.loginId}`,
    });

    return this.sanitizeUser(saved);
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

  async forgotPasswordRequest(identifier: string): Promise<void> {
    const user = await this.usersRepo.findOne({
      where: [
        { email: identifier },
        { phone: identifier },
        { employeeId: identifier },
        { loginId: identifier },
      ],
    });
    if (!user) {
      throw new NotFoundException('No employee found with this ID, email, or mobile number.');
    }

    user.metadata = {
      ...(user.metadata || {}),
      passwordResetStatus: 'pending',
      passwordResetRequestedAt: new Date().toISOString(),
    };
    await this.usersRepo.save(user);

    await this.auditService.log({
      userId: user.id,
      action: 'update',
      resourceType: 'user',
      resourceId: user.id,
      description: `User requested password reset: ${user.loginId}`,
    });
  }

  async getForgotPasswordRequests(): Promise<User[]> {
    return this.usersRepo.createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .leftJoinAndSelect('user.department', 'department')
      .where("user.metadata->>'passwordResetStatus' = :status", { status: 'pending' })
      .getMany();
  }

  async approveForgotPassword(userId: string): Promise<void> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    user.metadata = {
      ...(user.metadata || {}),
      passwordResetStatus: 'approved',
      passwordResetApprovedAt: new Date().toISOString(),
    };
    await this.usersRepo.save(user);

    await this.auditService.log({
      userId,
      action: 'update',
      resourceType: 'user',
      resourceId: userId,
      description: 'Password reset request approved by admin',
    });
  }

  async rejectForgotPassword(userId: string): Promise<void> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const metadata = { ...(user.metadata || {}) };
    delete metadata.passwordResetStatus;
    delete metadata.passwordResetRequestedAt;
    delete metadata.passwordResetApprovedAt;
    user.metadata = metadata;
    await this.usersRepo.save(user);

    await this.auditService.log({
      userId,
      action: 'update',
      resourceType: 'user',
      resourceId: userId,
      description: 'Password reset request rejected by admin',
    });
  }

  async resetForgotPassword(identifier: string, newPassword: string): Promise<User> {
    const user = await this.usersRepo.findOne({
      where: [
        { email: identifier },
        { phone: identifier },
        { employeeId: identifier },
        { loginId: identifier },
      ],
      relations: ['role', 'department'],
    });
    if (!user) {
      throw new NotFoundException('No employee found with this ID, email, or mobile number.');
    }

    const metadata = { ...(user.metadata || {}) };
    if (metadata.passwordResetStatus !== 'approved') {
      throw new BadRequestException('Password reset request has not been approved by the administrator yet.');
    }

    const hash = await bcrypt.hash(newPassword, this.configService.get<number>('BCRYPT_ROUNDS', 12));
    delete metadata.passwordResetStatus;
    delete metadata.passwordResetRequestedAt;
    delete metadata.passwordResetApprovedAt;
    
    user.passwordHash = hash;
    user.metadata = metadata;
    user.forcePasswordChange = false;

    await this.usersRepo.save(user);

    await this.auditService.log({
      userId: user.id,
      action: 'update',
      resourceType: 'user',
      resourceId: user.id,
      description: 'User reset password successfully via admin approval',
    });

    return user;
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
