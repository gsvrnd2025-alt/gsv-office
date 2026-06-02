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

      // 2. Automatically sweep other users who haven't had any activity in the last 15 seconds
      const fifteenSecondsAgo = new Date(Date.now() - 15 * 1000);
      await this.usersRepo.createQueryBuilder()
        .update(User)
        .set({ isOnline: false })
        .where('is_online = :isOnline AND last_seen < :timeout AND id != :currentUserId', {
          isOnline: true,
          timeout: fifteenSecondsAgo,
          currentUserId: user.id,
        })
        .execute();
    }
    return user;
  }
}
