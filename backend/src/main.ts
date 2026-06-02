import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import * as path from 'path';
import * as fs from 'fs';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
    cors: false, // Configured below
  });

  // Trust proxy for rate limiting (ThrottlerGuard) behind Nginx
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  // ── Serve uploads statically (for development) ─────────────
  const uploadPath = configService.get<string>('UPLOAD_PATH') || path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }
  app.useStaticAssets(uploadPath, {
    prefix: '/uploads/',
  });

  // ── Security ──────────────────────────────────────────────────
  app.use(helmet({
    contentSecurityPolicy: nodeEnv === 'production',
    crossOriginEmbedderPolicy: false,
  }));

  // ── CORS ──────────────────────────────────────────────────────
  app.enableCors({
    origin: configService.get<string>('APP_URL', 'http://localhost'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // ── Middleware ────────────────────────────────────────────────
  app.use(compression());
  app.use(cookieParser(configService.get<string>('SESSION_SECRET')));

  // ── Global prefix & versioning ────────────────────────────────
  app.setGlobalPrefix('api');

  // ── Global pipes ──────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Global filters & interceptors ────────────────────────────
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new ResponseInterceptor(),
  );

  // ── WebSocket adapter ────────────────────────────────────────
  app.useWebSocketAdapter(new IoAdapter(app));

  // ── Swagger API Docs ─────────────────────────────────────────
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('GSV Office API')
      .setDescription('Enterprise Self-Hosted Workspace Platform API')
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'JWT',
      )
      .addTag('Auth', 'Authentication endpoints')
      .addTag('Users', 'User management')
      .addTag('Roles', 'Role & permission management')
      .addTag('Departments', 'Department management')
      .addTag('Chat', 'Messaging system')
      .addTag('Files', 'File management')
      .addTag('Tickets', 'Helpdesk & ticketing')
      .addTag('Email', 'Email module')
      .addTag('Billing', 'Billing & invoicing')
      .addTag('Inventory', 'Inventory management')
      .addTag('Purchase', 'Purchase management')
      .addTag('Dashboard', 'Analytics & dashboard')
      .addTag('Notifications', 'Notification system')
      .addTag('Plugins', 'Plugin framework')
      .addTag('Server', 'Server administration')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  await app.listen(port, '0.0.0.0');
  console.log(`\n🚀 GSV Office API running on: http://localhost:${port}`);
  console.log(`📖 Swagger docs: http://localhost:${port}/api/docs\n`);
}

bootstrap();
