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
    const inputClean = loginId.trim();
    const inputUpper = inputClean.toUpperCase();
    const inputLower = inputClean.toLowerCase();
    const passClean = password.trim();
    const passUpper = passClean.toUpperCase();
    const passLower = passClean.toLowerCase();

    // 1. Try to find a matching student in the local copy of Google Sheets
    let studentObj: any = null;
    try {
      const studentRows = await this.usersRepo.query(
        `SELECT data FROM internship_tables WHERE table_name = 'Internship Registrations'`
      );
      
      studentObj = studentRows.find((r: any) => {
        const s = r.data || {};
        const sRegId = s.RegistrationID ? String(s.RegistrationID).trim().toUpperCase() : '';
        const sRegNum = s.RegisterNumber ? String(s.RegisterNumber).trim().toUpperCase() : '';
        const sPhone = s.MobileNumber ? String(s.MobileNumber).trim() : '';
        const sEmail = s.GmailID ? String(s.GmailID).trim().toLowerCase() : '';
        return sRegId === inputUpper || sRegNum === inputUpper || sPhone === inputClean || sEmail === inputLower;
      });
    } catch (dbErr) {
      this.logger.error('Failed to read student registrations from DB:', dbErr);
    }

    if (studentObj) {
      const s = studentObj.data || {};
      const regId = s.RegistrationID ? String(s.RegistrationID).trim().toUpperCase() : '';
      const regNum = s.RegisterNumber ? String(s.RegisterNumber).trim().toUpperCase() : '';
      const phone = s.MobileNumber ? String(s.MobileNumber).trim() : '';
      const email = s.GmailID ? String(s.GmailID).trim().toLowerCase() : '';
      const status = String(s.ApplicationStatus || s.Status || '').toLowerCase();

      // Check student status
      const allowedStatuses = ['approved', 'completed', 'active', 'assigned'];
      if (['pending', 'optout', 'deleted', 'rejected', 'on-hold'].includes(status)) {
        let msg = `Your account status is '${status}'. Login is not permitted.`;
        if (status === 'pending') msg = "Your application is still 'Pending' approval. Please wait for the admin to approve your request.";
        if (status === 'rejected') msg = "Your application has been 'Rejected'. Please contact the administrator.";
        throw new UnauthorizedException(msg);
      }
      if (status && !allowedStatuses.includes(status)) {
        throw new UnauthorizedException(`Access denied. Your current status is '${status}'. Please contact the administrator.`);
      }

      // Check password matching
      const isPasswordMatch = passClean === phone || passLower === email || passUpper === regId || passUpper === regNum;
      
      if (isPasswordMatch) {
        // Find if they exist in core users
        let user = await this.usersRepo.findOne({
          where: { loginId: regId },
          relations: ['role', 'department'],
        });

        // Ensure "Student" role exists
        let [studentRole] = await this.usersRepo.query(`SELECT id FROM roles WHERE name = 'Student' LIMIT 1`);
        if (!studentRole) {
          const roleId = crypto.randomUUID();
          await this.usersRepo.query(
            `INSERT INTO roles (id, name, description, color, level, is_system, created_at, updated_at)
             VALUES ($1, 'Student', 'Student Internship Portal Access', '#10b981', 0, false, NOW(), NOW())`,
            [roleId]
          );
          studentRole = { id: roleId };
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const fullName = (s.FirstName || '') + (s.MiddleName ? ' ' + s.MiddleName : '') + (s.LastName ? ' ' + s.LastName : '');

        if (!user) {
          // Create student user dynamically in core users
          const userId = crypto.randomUUID();
          await this.usersRepo.query(
            `INSERT INTO users (id, employee_id, login_id, email, password_hash, full_name, phone, role_id, status, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', NOW(), NOW())`,
            [userId, s.RegisterNumber || null, regId, email || `${regId.replace(/[^a-zA-Z0-9]/g, '')}@gsv.local`, passwordHash, fullName, phone || null, studentRole.id]
          );

          user = await this.usersRepo.findOne({
            where: { id: userId },
            relations: ['role', 'department'],
          });
        } else {
          // Update details & password hash to keep them in sync
          await this.usersRepo.update(user.id, {
            passwordHash,
            fullName,
            phone: phone || undefined,
            status: 'active',
            roleId: studentRole.id,
          });
          // Refresh user object
          user = await this.usersRepo.findOne({
            where: { id: user.id },
            relations: ['role', 'department'],
          });
        }

        return user;
      }
    }

    // 2. If not a student or password didn't match student details, fall back to standard core user login
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

    // Fetch and attach permissions for complete user context on the client
    const { rolePermissions, userPermissions } = await this.getPermissionsForUser(user);
    if (user.role) {
      (user.role as any).permissions = rolePermissions;
    }
    (user as any).userPermissions = userPermissions;

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

    const rounds = Number(this.configService.get('BCRYPT_ROUNDS', 12)) || 12;
    const hash = await bcrypt.hash(newPassword, rounds);
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
    return this.usersRepo.createQueryBuilder('u')
      .leftJoinAndSelect('u.role', 'role')
      .leftJoinAndSelect('u.department', 'department')
      .where("u.metadata->>'passwordResetStatus' = :status", { status: 'pending' })
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

    const rounds = Number(this.configService.get('BCRYPT_ROUNDS', 12)) || 12;
    const hash = await bcrypt.hash(newPassword, rounds);
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

  private async getPermissionsForUser(user: User) {
    let rolePermissions = [];
    if (user.roleId || user.role?.id) {
      const roleId = user.roleId || user.role.id;
      const rolePerms = await this.usersRepo.query(
        `SELECT rp.granted, p.module, p.action
         FROM role_permissions rp
         JOIN permissions p ON p.id = rp.permission_id
         WHERE rp.role_id = $1`,
        [roleId]
      );
      rolePermissions = rolePerms.map((rp: any) => ({
        granted: rp.granted,
        permission: {
          module: rp.module,
          action: rp.action
        }
      }));
    }

    const userPerms = await this.usersRepo.query(
      `SELECT up.granted, p.module, p.action
       FROM user_permissions up
       JOIN permissions p ON p.id = up.permission_id
       WHERE up.user_id = $1`,
      [user.id]
    );
    const userPermissions = userPerms.map((up: any) => ({
      granted: up.granted,
      permission: {
        module: up.module,
        action: up.action
      }
    }));

    return { rolePermissions, userPermissions };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private sanitizeUser(user: User) {
    const { passwordHash, twoFactorSecret, ...safe } = user as any;
    return safe;
  }
}
