import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService implements OnModuleInit {
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService, private ds: DataSource) {
    this.transporter = nodemailer.createTransport({
      host: config.get('mail.host'),
      port: parseInt(config.get('mail.port'), 10),
      secure: config.get('mail.secure') === 'true' || config.get('mail.secure') === true,
      auth: { user: config.get('mail.user'), pass: config.get('mail.password') },
    });
  }

  async onModuleInit() {
    try {
      console.log('[EmailService] Auto-seeding default email accounts for all users...');
      const users = await this.ds.query(`SELECT id, email, full_name FROM users`);
      for (const u of users) {
        const existing = await this.ds.query(`SELECT id FROM email_accounts WHERE user_id = $1 LIMIT 1`, [u.id]);
        if (existing.length === 0) {
          console.log(`[EmailService] Seeding default email account for ${u.full_name} (${u.email})`);
          await this.ds.query(`
            INSERT INTO email_accounts (user_id, email_address, display_name, smtp_host, smtp_port, smtp_secure, is_default)
            VALUES ($1, $2, $3, $4, $5, $6, true)
          `, [
            u.id,
            u.email,
            u.full_name,
            this.config.get('mail.host') || '192.168.0.177',
            parseInt(this.config.get('mail.port'), 10) || 587,
            this.config.get('mail.secure') === 'true' || this.config.get('mail.secure') === true,
          ]);
        }
      }
      console.log('[EmailService] Email accounts seeding completed.');
    } catch (err) {
      console.error('[EmailService] Error in onModuleInit email_accounts seeding:', err);
    }
  }

  async getEmails(userId: string, folder: string = 'inbox') {
    const isTrash = folder === 'trash';
    return this.ds.query(
      `SELECT e.*, ea.email_address,
              COALESCE(
                (
                  SELECT json_agg(json_build_object('id', att.id, 'fileId', att.file_id, 'filename', att.filename, 'size', att.size, 'storageUrl', f.storage_url))
                  FROM email_attachments att
                  JOIN files f ON f.id = att.file_id
                  WHERE att.email_id = e.id
                ),
                '[]'::json
              ) AS attachments
       FROM emails e
       LEFT JOIN email_accounts ea ON ea.id = e.account_id
       WHERE e.user_id = $1 AND ${isTrash ? 'e.deleted_at IS NOT NULL' : 'e.folder = $2 AND e.deleted_at IS NULL'}
       ORDER BY COALESCE(e.received_at, e.sent_at) DESC`,
      isTrash ? [userId] : [userId, folder]
    );
  }

  async sendEmail(dto: { to: string[]; cc?: string[]; subject: string; body: string; isHtml?: boolean; attachmentIds?: string[] }, userId: string) {
    // 1. Get attachments metadata from files table if attachmentIds is provided
    let attachments = [];
    if (dto.attachmentIds && dto.attachmentIds.length > 0) {
      const files = await this.ds.query(
        `SELECT id, name, original_name, storage_path, size FROM files WHERE id = ANY($1)`,
        [dto.attachmentIds]
      );
      attachments = files.map((f: any) => ({
        filename: f.original_name,
        path: f.storage_path, // local file path on server
      }));
    }

    // 2. Save email into sender's 'sent' folder
    const [insertedEmail] = await this.ds.query(
      `INSERT INTO emails (account_id, user_id, folder, subject, to_addresses, cc_addresses, body_html, body_text, sent_at, is_read)
       SELECT id, user_id, 'sent', $1, $2, $3, $4, $5, NOW(), true
       FROM email_accounts
       WHERE user_id = $6 AND is_default = true
       RETURNING id`,
      [
        dto.subject,
        dto.to,
        dto.cc || [],
        dto.isHtml ? dto.body : null,
        dto.isHtml ? null : dto.body,
        userId
      ]
    );

    // 3. Save email attachments link into email_attachments table
    if (insertedEmail && dto.attachmentIds && dto.attachmentIds.length > 0) {
      const files = await this.ds.query(
        `SELECT id, original_name, size FROM files WHERE id = ANY($1)`,
        [dto.attachmentIds]
      );
      for (const f of files) {
        await this.ds.query(
          `INSERT INTO email_attachments (email_id, file_id, filename, size)
           VALUES ($1, $2, $3, $4)`,
          [insertedEmail.id, f.id, f.original_name, f.size]
        );
      }
    }

    // 4. Local delivery bypass: deliver directly into DB inbox for any local @gsv.local recipients
    const allRecipients = [...dto.to, ...(dto.cc || [])];
    if (allRecipients.length > 0) {
      try {
        const localAccounts = await this.ds.query(
          `SELECT id, user_id, email_address FROM email_accounts WHERE email_address = ANY($1)`,
          [allRecipients]
        );
        
        for (const acc of localAccounts) {
          const [insertedInbox] = await this.ds.query(
            `INSERT INTO emails (account_id, user_id, folder, subject, to_addresses, cc_addresses, body_html, body_text, received_at, is_read)
             VALUES ($1, $2, 'inbox', $3, $4, $5, $6, $7, NOW(), false)
             RETURNING id`,
            [
              acc.id,
              acc.user_id,
              dto.subject,
              dto.to,
              dto.cc || [],
              dto.isHtml ? dto.body : null,
              dto.isHtml ? null : dto.body
            ]
          );

          // Copy attachments to recipient's inbox mail record
          if (insertedInbox && dto.attachmentIds && dto.attachmentIds.length > 0) {
            const files = await this.ds.query(
              `SELECT id, original_name, size FROM files WHERE id = ANY($1)`,
              [dto.attachmentIds]
            );
            for (const f of files) {
              await this.ds.query(
                `INSERT INTO email_attachments (email_id, file_id, filename, size)
                 VALUES ($1, $2, $3, $4)`,
                [insertedInbox.id, f.id, f.original_name, f.size]
              );
            }
          }
        }
      } catch (localErr) {
        console.error('[EmailService] Error in local delivery bypass:', localErr);
      }
    }

    // 5. Attempt SMTP relay (non-blocking — local delivery already completed above)
    try {
      await this.transporter.sendMail({
        from: this.config.get('mail.from') || `admin@gsv.local`,
        to: dto.to.join(','),
        cc: dto.cc && dto.cc.length > 0 ? dto.cc.join(',') : undefined,
        subject: dto.subject,
        [dto.isHtml ? 'html' : 'text']: dto.body,
        attachments,
      });
    } catch (smtpErr) {
      console.warn('[EmailService] SMTP relay failed (local delivery still succeeded):', smtpErr.message);
    }

    return { sent: true };
  }

  async markRead(emailId: string, userId: string) {
    await this.ds.query(`UPDATE emails SET is_read = true WHERE id = $1 AND user_id = $2`, [emailId, userId]);
  }

  async updateReadStatus(emailId: string, userId: string, isRead: boolean) {
    await this.ds.query(`UPDATE emails SET is_read = $1 WHERE id = $2 AND user_id = $3`, [isRead, emailId, userId]);
    return { success: true, isRead };
  }

  async toggleStar(emailId: string, userId: string, isStarred: boolean) {
    await this.ds.query(`UPDATE emails SET is_starred = $1 WHERE id = $2 AND user_id = $3`, [isStarred, emailId, userId]);
    return { success: true, isStarred };
  }

  async deleteEmail(emailId: string, userId: string) {
    await this.ds.query(`UPDATE emails SET deleted_at = NOW() WHERE id = $1 AND user_id = $2`, [emailId, userId]);
  }
}
