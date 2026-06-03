import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { TerminusModule } from '@nestjs/terminus';

// Feature Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { ChatModule } from './modules/chat/chat.module';
import { FilesModule } from './modules/files/files.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { EmailModule } from './modules/email/email.module';
import { BillingModule } from './modules/billing/billing.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { PurchaseModule } from './modules/purchase/purchase.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PluginsModule } from './modules/plugins/plugins.module';
import { ServerModule } from './modules/server/server.module';
import { AuditModule } from './modules/audit/audit.module';
import { WebrtcModule } from './modules/webrtc/webrtc.module';
import { StorageModule } from './modules/storage/storage.module';
import { HealthController } from './health.controller';

// Config
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import redisConfig from './config/redis.config';
import storageConfig from './config/storage.config';
import mailConfig from './config/mail.config';

@Module({
  imports: [
    // ── Configuration ──────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
      load: [databaseConfig, jwtConfig, redisConfig, storageConfig, mailConfig],
    }),

    // ── Database ───────────────────────────────────────────────
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        database: config.get<string>('database.name'),
        username: config.get<string>('database.user'),
        password: config.get<string>('database.password'),
        ssl: config.get<boolean>('database.ssl') ? { rejectUnauthorized: false } : false,
        synchronize: false, // Use schema.sql migrations
        logging: config.get<boolean>('database.logging'),
        autoLoadEntities: true,
        extra: {
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        },
      }),
      inject: [ConfigService],
    }),

    // ── Rate Limiting ──────────────────────────────────────────
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('RATE_LIMIT_TTL', 900) * 1000,
            limit: config.get<number>('RATE_LIMIT_MAX', 100),
          },
        ],
      }),
      inject: [ConfigService],
    }),

    // ── Events ─────────────────────────────────────────────────
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 50,
    }),

    // ── Scheduler ──────────────────────────────────────────────
    ScheduleModule.forRoot(),

    // ── Health ─────────────────────────────────────────────────
    TerminusModule,

    // ── Feature Modules ────────────────────────────────────────
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    DepartmentsModule,
    ChatModule,
    FilesModule,
    TicketsModule,
    EmailModule,
    BillingModule,
    InventoryModule,
    PurchaseModule,
    DashboardModule,
    NotificationsModule,
    PluginsModule,
    ServerModule,
    AuditModule,
    WebrtcModule,
    StorageModule,
  ],
  controllers: [HealthController],
  providers: [
    // Global rate limit guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
