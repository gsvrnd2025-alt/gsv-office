import { registerAs } from '@nestjs/config';

export default registerAs('mail', () => ({
  domain: process.env.MAIL_DOMAIN || 'gsv.local',
  host: process.env.MAIL_HOST || 'localhost',
  port: parseInt(process.env.MAIL_PORT || '587', 10),
  user: process.env.MAIL_USER || '',
  password: process.env.MAIL_PASSWORD || '',
  from: process.env.MAIL_FROM || 'GSV Office <noreply@gsv.local>',
  secure: process.env.MAIL_SECURE === 'true',
  imap: {
    host: process.env.IMAP_HOST || 'localhost',
    port: parseInt(process.env.IMAP_PORT || '143', 10),
    secure: process.env.IMAP_SECURE === 'true',
  },
}));
