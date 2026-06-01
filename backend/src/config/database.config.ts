import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  name: process.env.DB_NAME || 'gsv_office',
  user: process.env.DB_USER || 'gsv_admin',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.DB_SSL === 'true',
  sync: process.env.DB_SYNC === 'true',
  logging: process.env.DB_LOGGING === 'true',
}));
