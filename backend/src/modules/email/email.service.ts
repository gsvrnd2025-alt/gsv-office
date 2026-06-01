import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService, private ds: DataSource) {
    this.transporter = nodemailer.createTransport({
      host: config.get('mail.host'),
      port: config.get('mail.port'),
      secure: config.get('mail.secure'),
      auth: { user: config.get('mail.user'), pass: config.get('mail.password') },
    });
  }

  async getEmails(userId: string, folder: string = 'inbox') {
    return this.ds.query(
      `SELECT e.*, ea.email_address FROM emails e JOIN email_accounts ea ON ea.id = e.account_id WHERE e.user_id = $1 AND e.folder = $2 AND e.deleted_at IS NULL ORDER BY e.received_at DESC`,
      [userId, folder]
    );
  }

  async sendEmail(dto: { to: string[]; cc?: string[]; subject: string; body: string; isHtml?: boolean }, userId: string) {
    await this.transporter.sendMail({
      from: this.config.get('mail.from'),
      to: dto.to.join(','),
      cc: dto.cc?.join(','),
      subject: dto.subject,
      [dto.isHtml ? 'html' : 'text']: dto.body,
    });
    await this.ds.query(
      `INSERT INTO emails (user_id, folder, subject, to_addresses, body_html, body_text, sent_at)
       SELECT id, 'sent', $1, $2, $3, $4, NOW() FROM email_accounts WHERE user_id = $5 AND is_default = true`,
      [dto.subject, dto.to, dto.isHtml ? dto.body : null, dto.isHtml ? null : dto.body, userId]
    );
    return { sent: true };
  }

  async markRead(emailId: string, userId: string) {
    await this.ds.query(`UPDATE emails SET is_read = true WHERE id = $1 AND user_id = $2`, [emailId, userId]);
  }

  async deleteEmail(emailId: string, userId: string) {
    await this.ds.query(`UPDATE emails SET deleted_at = NOW() WHERE id = $1 AND user_id = $2`, [emailId, userId]);
  }
}
