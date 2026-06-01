import { registerAs } from '@nestjs/config';

export default registerAs('storage', () => ({
  minio: {
    endpoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000', 10),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    rootUser: process.env.MINIO_ROOT_USER || 'gsv_minio_admin',
    rootPassword: process.env.MINIO_ROOT_PASSWORD || '',
    buckets: {
      files: process.env.MINIO_BUCKET_FILES || 'gsv-files',
      avatars: process.env.MINIO_BUCKET_AVATARS || 'gsv-avatars',
      chat: process.env.MINIO_BUCKET_CHAT || 'gsv-chat',
    },
  },
  smb: {
    enabled: process.env.SMB_ENABLED === 'true',
    host: process.env.SMB_HOST || '',
    share: process.env.SMB_SHARE || '',
    username: process.env.SMB_USERNAME || '',
    password: process.env.SMB_PASSWORD || '',
    domain: process.env.SMB_DOMAIN || 'WORKGROUP',
    mountPath: process.env.SMB_MOUNT_PATH || '/mnt/smb',
  },
  uploadPath: process.env.UPLOAD_PATH || '/app/uploads',
  maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || '500', 10),
}));
