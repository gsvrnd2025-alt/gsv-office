import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectRepository(User) private usersRepo: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.accessSecret'),
    });
  }

  async validate(payload: any) {
    const user = await this.usersRepo.findOne({
      where: { id: payload.sub },
      relations: ['role', 'department'],
    });
    if (user) {
      // 1. Mark this user as online with the current timestamp
      await this.usersRepo.update(user.id, {
        isOnline: true,
        lastSeen: new Date(),
      });
      user.isOnline = true;
      user.lastSeen = new Date();

      // 2. Automatically sweep other users who haven't had any activity in the last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      await this.usersRepo.createQueryBuilder()
        .update(User)
        .set({ isOnline: false })
        .where('is_online = :isOnline AND last_seen < :timeout AND id != :currentUserId', {
          isOnline: true,
          timeout: fiveMinutesAgo,
          currentUserId: user.id,
        })
        .execute();

      // 3. Fetch role permissions
      if (user.role && (user.roleId || user.role.id)) {
        const roleId = user.roleId || user.role.id;
        const rolePerms = await this.usersRepo.query(
          `SELECT rp.granted, p.module, p.action
           FROM role_permissions rp
           JOIN permissions p ON p.id = rp.permission_id
           WHERE rp.role_id = $1`,
          [roleId]
        );
        (user.role as any).permissions = rolePerms.map((rp: any) => ({
          granted: rp.granted,
          permission: {
            module: rp.module,
            action: rp.action
          }
        }));
      } else if (user.role) {
        (user.role as any).permissions = [];
      }

      // 4. Fetch user-level permission overrides
      const userPerms = await this.usersRepo.query(
        `SELECT up.granted, p.module, p.action
         FROM user_permissions up
         JOIN permissions p ON p.id = up.permission_id
         WHERE up.user_id = $1`,
        [user.id]
      );
      (user as any).userPermissions = userPerms.map((up: any) => ({
        granted: up.granted,
        permission: {
          module: up.module,
          action: up.action
        }
      }));
    }
    return user;
  }
}
