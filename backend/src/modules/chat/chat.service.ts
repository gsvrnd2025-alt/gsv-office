import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class ChatService {
  constructor(private dataSource: DataSource) {}

  async getConversations(userId: string, page = 1, limit = 20) {
    return this.dataSource.query(`
      SELECT c.*, cm.last_read_at, cm.is_muted, cm.is_archived,
             COUNT(m.id) FILTER (WHERE m.created_at > COALESCE(cm.last_read_at, '1970-01-01') AND m.sender_id != $1 AND m.deleted_at IS NULL) AS unread_count
      FROM conversations c
      JOIN conversation_members cm ON cm.conversation_id = c.id AND cm.user_id = $1 AND cm.left_at IS NULL
      LEFT JOIN messages m ON m.conversation_id = c.id
      GROUP BY c.id, cm.last_read_at, cm.is_muted, cm.is_archived
      ORDER BY c.last_message_at DESC NULLS LAST
      LIMIT $2 OFFSET $3
    `, [userId, limit, (page - 1) * limit]);
  }

  async getMessages(conversationId: string, userId: string, page = 1, limit = 50) {
    return this.dataSource.query(`
      SELECT m.id, m.conversation_id, m.sender_id, m.content, m.file_id, m.reply_to_id, m.created_at, m.edited_at AS updated_at, m.deleted_at,
             CASE
               WHEN m.type::text = 'image' THEN 'photo'
               WHEN m.type::text = 'audio' THEN 'music'
               ELSE m.type::text
             END AS type,
             u.full_name AS sender_name, u.avatar_url AS sender_avatar,
             COALESCE(json_agg(DISTINCT mr.*) FILTER (WHERE mr.id IS NOT NULL), '[]') AS reactions,
             f.name AS file_name, f.mime_type, f.size AS file_size, f.storage_url AS file_url
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      LEFT JOIN message_reactions mr ON mr.message_id = m.id
      LEFT JOIN files f ON f.id = m.file_id
      WHERE m.conversation_id = $1 AND m.deleted_at IS NULL
      GROUP BY m.id, m.conversation_id, m.sender_id, m.content, m.file_id, m.reply_to_id, m.created_at, m.edited_at, m.deleted_at, m.type, u.full_name, u.avatar_url, f.name, f.mime_type, f.size, f.storage_url
      ORDER BY m.created_at DESC
      LIMIT $2 OFFSET $3
    `, [conversationId, limit, (page - 1) * limit]);
  }

  async createConversation(dto: any) {
    const [conv] = await this.dataSource.query(
      `INSERT INTO conversations (type, name, description, created_by)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [dto.type || 'private', dto.name, dto.description, dto.createdBy]
    );

    // Add the creator
    await this.dataSource.query(
      `INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [conv.id, dto.createdBy]
    );

    // Add any target members (e.g. for DMs)
    if (dto.members && Array.isArray(dto.members)) {
      for (const memberId of dto.members) {
        await this.dataSource.query(
          `INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [conv.id, memberId]
        );
      }
    }

    return conv;
  }

  async sendMessage(dto: { conversationId: string; senderId: string; content: string; type?: string; fileId?: string; replyToId?: string }) {
    let mappedType = dto.type || 'text';
    if (mappedType === 'photo') mappedType = 'image';
    if (mappedType === 'music') mappedType = 'audio';
    if (mappedType === 'folder') mappedType = 'file';

    const validTypes = ['text', 'image', 'video', 'audio', 'document', 'file', 'voice_note', 'system'];
    if (!validTypes.includes(mappedType)) {
      mappedType = 'file';
    }

    const fileId = (dto.fileId && dto.fileId !== '' && dto.fileId !== 'null' && dto.fileId !== 'undefined') ? dto.fileId : null;
    const replyToId = (dto.replyToId && dto.replyToId !== '' && dto.replyToId !== 'null' && dto.replyToId !== 'undefined') ? dto.replyToId : null;

    const [msg] = await this.dataSource.query(
      `INSERT INTO messages (conversation_id, sender_id, content, type, file_id, reply_to_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [dto.conversationId, dto.senderId, dto.content, mappedType, fileId, replyToId]
    );

    if (msg.type === 'image') msg.type = 'photo';
    if (msg.type === 'audio') msg.type = 'music';

    await this.dataSource.query(
      `UPDATE conversations SET last_message_at = NOW(), last_message_preview = $1 WHERE id = $2`,
      [dto.content?.substring(0, 100), dto.conversationId]
    );
    return msg;
  }

  async addReaction(messageId: string, userId: string, emoji: string) {
    await this.dataSource.query(
      `INSERT INTO message_reactions (message_id, user_id, emoji) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [messageId, userId, emoji]
    );
  }

  async removeReaction(messageId: string, userId: string, emoji: string) {
    await this.dataSource.query(
      `DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3`,
      [messageId, userId, emoji]
    );
  }

  async markAsRead(conversationId: string, userId: string) {
    await this.dataSource.query(
      `UPDATE conversation_members SET last_read_at = NOW() WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, userId]
    );
  }

  async deleteMessage(messageId: string, userId: string) {
    const [msg] = await this.dataSource.query(
      `UPDATE messages SET deleted_at = NOW() WHERE id = $1 AND sender_id = $2 RETURNING *`,
      [messageId, userId]
    );
    return msg;
  }
}
