import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class ChatService implements OnModuleInit {
  constructor(private dataSource: DataSource) {}

  async onModuleInit() {
    try {
      await this.mergeDuplicateConversations();
    } catch (err) {
      console.error('Error in onModuleInit duplicate conversation merge:', err);
    }
  }

  async mergeDuplicateConversations() {
    try {
      console.log('[ChatService] Checking for duplicate private conversations to merge...');
      const duplicates = await this.dataSource.query(`
        WITH member_pairs AS (
          SELECT conversation_id, array_agg(user_id ORDER BY user_id) as member_ids
          FROM conversation_members
          GROUP BY conversation_id
        ),
        duplicates AS (
          SELECT mp.member_ids, array_agg(mp.conversation_id ORDER BY mp.conversation_id ASC) as conv_ids
          FROM member_pairs mp
          JOIN conversations c ON c.id = mp.conversation_id
          WHERE c.type = 'private' AND cardinality(mp.member_ids) = 2
          GROUP BY mp.member_ids
          HAVING count(mp.conversation_id) > 1
        )
        SELECT member_ids, conv_ids FROM duplicates;
      `);

      if (!duplicates || duplicates.length === 0) {
        console.log('[ChatService] No duplicate conversations found.');
        return;
      }

      console.log(`[ChatService] Found ${duplicates.length} duplicate groups of conversations.`);

      for (const row of duplicates) {
        const convIds = row.conv_ids;
        const primaryId = convIds[0];
        const dupIds = convIds.slice(1);
        
        console.log(`[ChatService] Merging conversations: ${dupIds.join(', ')} into primary: ${primaryId}`);

        await this.dataSource.transaction(async (manager) => {
          // 1. Move all messages from duplicates to primary
          await manager.query(
            `UPDATE messages SET conversation_id = $1 WHERE conversation_id = ANY($2)`,
            [primaryId, dupIds]
          );

          // 2. Delete membership entries for duplicate conversations
          await manager.query(
            `DELETE FROM conversation_members WHERE conversation_id = ANY($1)`,
            [dupIds]
          );

          // 3. Delete duplicate conversation records
          await manager.query(
            `DELETE FROM conversations WHERE id = ANY($1)`,
            [dupIds]
          );

          // 4. Reset the last message preview and time for the primary conversation
          const latestMsg = await manager.query(
            `SELECT content, created_at FROM messages WHERE conversation_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1`,
            [primaryId]
          );

          if (latestMsg.length > 0) {
            await manager.query(
              `UPDATE conversations SET last_message_at = $1, last_message_preview = $2 WHERE id = $3`,
              [latestMsg[0].created_at, latestMsg[0].content?.substring(0, 100) || '', primaryId]
            );
          }
        });
      }
      console.log('[ChatService] Duplicate conversation merge complete.');
    } catch (error) {
      console.error('[ChatService] Error merging duplicate conversations:', error);
    }
  }

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

  async getMessages(conversationId: string, userId: string, page = 1, limit = 500) {
    return this.dataSource.query(`
      SELECT m.id, m.conversation_id, m.sender_id, m.content, m.file_id, m.reply_to_id, m.created_at, m.deleted_at,
             CASE
               WHEN m.type::text = 'image' THEN 'photo'
               WHEN m.type::text = 'audio' THEN 'music'
               ELSE m.type::text
             END AS type,
             u.full_name AS sender_name, u.avatar_url AS sender_avatar,
             COALESCE(json_agg(DISTINCT mr.*) FILTER (WHERE mr.message_id IS NOT NULL), '[]') AS reactions,
             COALESCE(f.original_name, f.name) AS file_name, f.mime_type, f.size AS file_size, f.storage_url AS file_url
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      LEFT JOIN message_reactions mr ON mr.message_id = m.id
      LEFT JOIN files f ON f.id = m.file_id
      WHERE m.conversation_id = $1 AND m.deleted_at IS NULL
      GROUP BY m.id, m.conversation_id, m.sender_id, m.content, m.file_id, m.reply_to_id, m.created_at, m.deleted_at, 
             CASE
               WHEN m.type::text = 'image' THEN 'photo'
               WHEN m.type::text = 'audio' THEN 'music'
               ELSE m.type::text
             END, u.full_name, u.avatar_url, f.original_name, f.name, f.mime_type, f.size, f.storage_url
      ORDER BY m.created_at DESC
      LIMIT $2 OFFSET $3
    `, [conversationId, limit, (page - 1) * limit]);
  }

  async createConversation(dto: any) {
    if (dto.type === 'private' && dto.members && dto.members.length === 1) {
      // Find a conversation that has exactly these two users and NO ONE ELSE
      const user1 = dto.createdBy;
      const user2 = dto.members[0];
      
      const existing = await this.dataSource.query(
        `SELECT c.* FROM conversations c
         WHERE c.type = 'private'
         AND EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id = c.id AND cm.user_id = $1)
         AND EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id = c.id AND cm.user_id = $2)
         AND (SELECT COUNT(*) FROM conversation_members cm WHERE cm.conversation_id = c.id) = 2
         LIMIT 1`,
        [user1, user2]
      );
      if (existing.length > 0) {
        return existing[0];
      }
    }

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

  async addMember(conversationId: string, userId: string) {
    await this.dataSource.query(
      `INSERT INTO conversation_members (conversation_id, user_id, role) VALUES ($1, $2, 'member') ON CONFLICT DO NOTHING`,
      [conversationId, userId]
    );
    return { success: true };
  }
}
