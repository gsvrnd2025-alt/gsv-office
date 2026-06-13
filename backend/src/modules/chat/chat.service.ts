import { Injectable, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ChatGateway } from '../../gateways/chat.gateway';

@Injectable()
export class ChatService implements OnModuleInit {
  constructor(
    private dataSource: DataSource,
    @Inject(forwardRef(() => ChatGateway)) private chatGateway: ChatGateway,
  ) {}

  async onModuleInit() {
    try {
      await this.mergeDuplicateConversations();
    } catch (err) {
      console.error('Error in onModuleInit duplicate conversation merge:', err);
    }

    try {
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS group_invitations (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
          invited_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          invitee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          status VARCHAR(20) DEFAULT 'pending',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(conversation_id, invitee_id)
        );
      `);
      console.log('[ChatService] Verified group_invitations table exists.');
    } catch (err) {
      console.error('Error creating group_invitations table:', err);
    }

    try {
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS member_removal_requests (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
          target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          status VARCHAR(20) DEFAULT 'pending',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
      await this.dataSource.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_removal_requests 
        ON member_removal_requests(conversation_id, target_user_id) 
        WHERE status = 'pending';
      `);
      console.log('[ChatService] Verified member_removal_requests table exists.');
    } catch (err) {
      console.error('Error creating member_removal_requests table:', err);
    }

    try {
      // Ensure folder_id column exists on messages table
      await this.dataSource.query(`
        ALTER TABLE messages ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;
      `);
      
      // Ensure 'folder' exists in the message_type enum
      const types = await this.dataSource.query(`
        SELECT enumlabel FROM pg_enum 
        JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
        WHERE pg_type.typname = 'message_type';
      `);
      const hasFolder = types.some((t: any) => t.enumlabel === 'folder');
      if (!hasFolder) {
        await this.dataSource.query(`ALTER TYPE message_type ADD VALUE 'folder';`);
      }
    } catch (err) {
      console.error('Failed to run chat db migration:', err);
    }

    try {
      // Ensure the Public Chat conversation exists
      const existing = await this.dataSource.query(`
        SELECT id FROM conversations WHERE type = 'broadcast' AND name = 'Public Chat' LIMIT 1
      `);
      if (existing.length === 0) {
        const [publicConv] = await this.dataSource.query(`
          INSERT INTO conversations (type, name, description, metadata)
          VALUES ('broadcast', 'Public Chat', 'Mandatory public chat for all workspace users', '{"isPublic": true}')
          RETURNING id
        `);
        // Add all existing users
        await this.dataSource.query(`
          INSERT INTO conversation_members (conversation_id, user_id)
          SELECT $1, id FROM users
          ON CONFLICT (conversation_id, user_id) DO NOTHING
        `, [publicConv.id]);
        console.log('[ChatService] Created Public Chat and added all existing users.');
      }
    } catch (err) {
      console.error('Error ensuring Public Chat exists:', err);
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
    // Ensure user is in the public chat room
    try {
      const publicChat = await this.dataSource.query(`
        SELECT id FROM conversations WHERE type = 'broadcast' AND name = 'Public Chat' LIMIT 1
      `);
      if (publicChat.length > 0) {
        await this.dataSource.query(`
          INSERT INTO conversation_members (conversation_id, user_id)
          VALUES ($1, $2)
          ON CONFLICT (conversation_id, user_id) DO NOTHING
        `, [publicChat[0].id, userId]);
      }
    } catch (e) {
      console.error('Error auto-joining user to public chat:', e);
    }

    return this.dataSource.query(`
      SELECT c.*, cm.last_read_at, cm.is_muted, cm.is_archived,
             (
               SELECT COUNT(*) FROM messages m
               WHERE m.conversation_id = c.id
                 AND m.created_at > COALESCE(cm.last_read_at, '1970-01-01'::timestamptz)
                 AND m.sender_id != $1
                 AND m.deleted_at IS NULL
             ) AS unread_count,
             (
               SELECT json_agg(json_build_object('id', u.id, 'fullName', u.full_name, 'loginId', u.login_id, 'departmentId', u.department_id, 'department_id', u.department_id, 'role', mem.role))
               FROM conversation_members mem
               JOIN users u ON u.id = mem.user_id
               WHERE mem.conversation_id = c.id
             ) AS members
      FROM conversations c
      JOIN conversation_members cm ON cm.conversation_id = c.id AND cm.user_id = $1 AND cm.left_at IS NULL
      GROUP BY c.id, cm.last_read_at, cm.is_muted, cm.is_archived
      ORDER BY COALESCE(c.last_message_at, c.created_at) DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, (page - 1) * limit]);
  }

  async getMessages(conversationId: string, userId: string, page = 1, limit = 500) {
    return this.dataSource.query(`
      SELECT m.id, m.conversation_id, m.sender_id, m.content, m.file_id, m.folder_id, m.reply_to_id, m.created_at, m.deleted_at,
             CASE
               WHEN m.type::text = 'image' THEN 'photo'
               WHEN m.type::text = 'audio' THEN 'music'
               ELSE m.type::text
             END AS type,
             u.full_name AS sender_name, u.avatar_url AS sender_avatar,
             COALESCE(json_agg(mr) FILTER (WHERE mr.message_id IS NOT NULL), '[]') AS reactions,
             COALESCE(f.original_name, f.name, fold.name) AS file_name, f.mime_type, f.size AS file_size, f.storage_url AS file_url
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      LEFT JOIN message_reactions mr ON mr.message_id = m.id
      LEFT JOIN files f ON f.id = m.file_id
      LEFT JOIN folders fold ON fold.id = m.folder_id
      WHERE m.conversation_id = $1 AND m.deleted_at IS NULL
      GROUP BY m.id, m.conversation_id, m.sender_id, m.content, m.file_id, m.folder_id, m.reply_to_id, m.created_at, m.deleted_at, 
             CASE
               WHEN m.type::text = 'image' THEN 'photo'
               WHEN m.type::text = 'audio' THEN 'music'
               ELSE m.type::text
             END, u.full_name, u.avatar_url, f.original_name, f.name, fold.name, f.mime_type, f.size, f.storage_url
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
        // Reset left_at to NULL for both members so they can see the conversation again in their list
        await this.dataSource.query(
          `UPDATE conversation_members SET left_at = NULL WHERE conversation_id = $1`,
          [existing[0].id]
        );
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
      `INSERT INTO conversation_members (conversation_id, user_id, role) VALUES ($1, $2, 'admin') ON CONFLICT DO NOTHING`,
      [conv.id, dto.createdBy]
    );

    // Add any target members (e.g. for DMs)
    if (dto.members && Array.isArray(dto.members)) {
      for (const memberId of dto.members) {
        await this.dataSource.query(
          `INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [conv.id, memberId]
        );
        // Notify them via WebSocket so their sidebar list updates instantly
        try {
          this.chatGateway.emitToUser(memberId, 'message:new', {
            conversationId: conv.id,
            type: 'system',
            content: 'Group created'
          });
        } catch (e) {}
      }
    }

    // Return fully populated conversation with members array for immediate frontend use
    const [populatedConv] = await this.dataSource.query(`
      SELECT c.*,
             (
               SELECT json_agg(json_build_object('id', u.id, 'fullName', u.full_name, 'loginId', u.login_id, 'departmentId', u.department_id, 'department_id', u.department_id, 'role', mem.role))
               FROM conversation_members mem
               JOIN users u ON u.id = mem.user_id
               WHERE mem.conversation_id = c.id
             ) AS members
      FROM conversations c
      WHERE c.id = $1
    `, [conv.id]);
    return populatedConv || conv;
  }

  async sendMessage(dto: { conversationId: string; senderId: string; content: string; type?: string; fileId?: string; folderId?: string; replyToId?: string }) {
    const [membership] = await this.dataSource.query(
      `SELECT role, left_at FROM conversation_members WHERE conversation_id = $1 AND user_id = $2`,
      [dto.conversationId, dto.senderId]
    );
    if (membership && (membership.role === 'blocked' || membership.left_at !== null)) {
      throw new Error('You are blocked from sending messages in this group.');
    }

    let mappedType = dto.type || 'text';
    if (mappedType === 'photo') mappedType = 'image';
    if (mappedType === 'music') mappedType = 'audio';

    const validTypes = ['text', 'image', 'video', 'audio', 'document', 'file', 'voice_note', 'system', 'folder'];
    if (!validTypes.includes(mappedType)) {
      mappedType = 'file';
    }

    const fileId = (dto.fileId && dto.fileId !== '' && dto.fileId !== 'null' && dto.fileId !== 'undefined') ? dto.fileId : null;
    const folderId = (dto.folderId && dto.folderId !== '' && dto.folderId !== 'null' && dto.folderId !== 'undefined') ? dto.folderId : null;
    const replyToId = (dto.replyToId && dto.replyToId !== '' && dto.replyToId !== 'null' && dto.replyToId !== 'undefined') ? dto.replyToId : null;

    const [msg] = await this.dataSource.query(
      `INSERT INTO messages (conversation_id, sender_id, content, type, file_id, folder_id, metadata, reply_to_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [dto.conversationId, dto.senderId, dto.content, mappedType, fileId, folderId, folderId ? { folderId } : {}, replyToId]
    );

    if (fileId) {
      const members = await this.dataSource.query(
        `SELECT user_id FROM conversation_members WHERE conversation_id = $1 AND user_id != $2`,
        [dto.conversationId, dto.senderId]
      );
      for (const m of members) {
        await this.dataSource.query(
          `INSERT INTO file_shares (file_id, shared_by, shared_with_user_id, permission)
           VALUES ($1, $2, $3, 'read') ON CONFLICT DO NOTHING`,
          [fileId, dto.senderId, m.user_id]
        );
      }
    }

    if (folderId) {
      const members = await this.dataSource.query(
        `SELECT user_id FROM conversation_members WHERE conversation_id = $1 AND user_id != $2`,
        [dto.conversationId, dto.senderId]
      );
      
      // Get all descendant folders including the folder itself
      const descendants = await this.dataSource.query(
        `WITH RECURSIVE descendants AS (
           SELECT id FROM folders WHERE id = $1
           UNION ALL
           SELECT f.id FROM folders f
           INNER JOIN descendants d ON d.id = f.parent_id
         )
         SELECT id FROM descendants`,
        [folderId]
      );

      for (const m of members) {
        for (const desc of descendants) {
          await this.dataSource.query(
            `INSERT INTO folder_access_requests (folder_id, owner_id, requester_id, requester_name, status, permission)
             SELECT $1, $2, $3, 'Chat Auto-Share', 'approved', 'read'
             WHERE NOT EXISTS (
               SELECT 1 FROM folder_access_requests 
               WHERE folder_id = $1 AND requester_id = $3
             )`,
            [desc.id, dto.senderId, m.user_id]
          );
        }
      }
    }

    await this.dataSource.query(
      `UPDATE conversations SET last_message_at = NOW(), last_message_preview = $1 WHERE id = $2`,
      [dto.content?.substring(0, 100), dto.conversationId]
    );

    // Fetch the fully joined message record
    const [insertedMsg] = await this.dataSource.query(`
      SELECT m.id, m.conversation_id, m.sender_id, m.content, m.file_id, m.folder_id, m.reply_to_id, m.created_at, m.deleted_at,
             CASE
               WHEN m.type::text = 'image' THEN 'photo'
               WHEN m.type::text = 'audio' THEN 'music'
               ELSE m.type::text
             END AS type,
             u.full_name AS sender_name, u.avatar_url AS sender_avatar,
             COALESCE(json_agg(mr) FILTER (WHERE mr.message_id IS NOT NULL), '[]') AS reactions,
             COALESCE(f.original_name, f.name, fold.name) AS file_name, f.mime_type, f.size AS file_size, f.storage_url AS file_url
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      LEFT JOIN message_reactions mr ON mr.message_id = m.id
      LEFT JOIN files f ON f.id = m.file_id
      LEFT JOIN folders fold ON fold.id = m.folder_id
      WHERE m.id = $1
      GROUP BY m.id, m.conversation_id, m.sender_id, m.content, m.file_id, m.folder_id, m.reply_to_id, m.created_at, m.deleted_at,
             CASE
               WHEN m.type::text = 'image' THEN 'photo'
               WHEN m.type::text = 'audio' THEN 'music'
               ELSE m.type::text
             END,
             u.full_name, u.avatar_url, f.original_name, f.name, fold.name, f.mime_type, f.size, f.storage_url
    `, [msg.id]);

    // Broadcast real-time to all conversation members via WebSocket
    try {
      this.chatGateway.emitToConversation(dto.conversationId, 'message:new', insertedMsg);
      
      const allMembers = await this.dataSource.query(
        `SELECT user_id FROM conversation_members WHERE conversation_id = $1 AND left_at IS NULL`,
        [dto.conversationId]
      );
      for (const member of allMembers) {
        this.chatGateway.emitToUser(member.user_id, 'message:new', insertedMsg);
      }
    } catch (e) {
      // Gateway may not be ready on startup
    }

    return insertedMsg;
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

  async addMember(conversationId: string, userId: string, requestingUserId: string) {
    const [conv] = await this.dataSource.query(`SELECT type FROM conversations WHERE id = $1`, [conversationId]);
    if (conv && conv.type === 'group') {
      const [senderMember] = await this.dataSource.query(
        `SELECT role FROM conversation_members WHERE conversation_id = $1 AND user_id = $2`,
        [conversationId, requestingUserId]
      );
      if (!senderMember || senderMember.role !== 'admin') {
        throw new Error('Only group admins can directly add members to this group');
      }
    }

    await this.dataSource.query(
      `INSERT INTO conversation_members (conversation_id, user_id, role)
       VALUES ($1, $2, 'member')
       ON CONFLICT (conversation_id, user_id) DO UPDATE SET left_at = NULL, role = 'member'`,
      [conversationId, userId]
    );

    // Insert system message
    const [user] = await this.dataSource.query(`SELECT full_name FROM users WHERE id = $1`, [userId]);
    const systemContent = `${user?.full_name || 'A teammate'} was added to the group.`;
    await this.dataSource.query(
      `INSERT INTO messages (conversation_id, sender_id, content, type)
       VALUES ($1, $2, $3, 'system')`,
      [conversationId, requestingUserId, systemContent]
    );

    // Send WebSockets to notify user and update active room conversation list
    try {
      this.chatGateway.emitToUser(userId, 'message:new', {
        conversationId,
        type: 'system',
        content: systemContent
      });
      this.chatGateway.emitToConversation(conversationId, 'message:new', {
        conversationId,
        type: 'system',
        content: systemContent
      });
    } catch (e) {}

    return { success: true };
  }

  async updateConversation(id: string, dto: any, requestingUserId?: string) {
    // For group chats, enforce admin-only for name/description changes
    if (requestingUserId) {
      const [conv] = await this.dataSource.query(`SELECT type FROM conversations WHERE id = $1`, [id]);
      if (conv && conv.type === 'group') {
        const [reqMember] = await this.dataSource.query(
          `SELECT role FROM conversation_members WHERE conversation_id = $1 AND user_id = $2`,
          [id, requestingUserId]
        );
        if (!reqMember || reqMember.role !== 'admin') {
          throw new Error('Only group admins can update group details');
        }
      }
    }

    // Fetch the old conversation details for system message
    const [oldConv] = await this.dataSource.query(`SELECT name, description FROM conversations WHERE id = $1`, [id]);

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;
    
    if (dto.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(dto.name);
    }
    if (dto.description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(dto.description);
    }
    if (dto.metadata !== undefined) {
      fields.push(`metadata = $${idx++}`);
      values.push(typeof dto.metadata === 'string' ? dto.metadata : JSON.stringify(dto.metadata));
    }
    
    if (fields.length === 0) return { success: true };
    
    values.push(id);
    await this.dataSource.query(
      `UPDATE conversations SET ${fields.join(', ')} WHERE id = $${idx}`,
      values
    );

    // Post system message and broadcast for name/description changes
    if (requestingUserId && oldConv) {
      const changes: string[] = [];
      if (dto.name !== undefined && dto.name !== oldConv.name) {
        changes.push(`renamed the group to "${dto.name}"`);
      }
      if (dto.description !== undefined && dto.description !== oldConv.description) {
        changes.push('updated the group description');
      }
      if (changes.length > 0) {
        const [user] = await this.dataSource.query(`SELECT full_name FROM users WHERE id = $1`, [requestingUserId]);
        const systemContent = `${user?.full_name || 'Admin'} ${changes.join(' and ')}.`;
        await this.dataSource.query(
          `INSERT INTO messages (conversation_id, sender_id, content, type) VALUES ($1, $2, $3, 'system')`,
          [id, requestingUserId, systemContent]
        );
        // Broadcast to all members so sidebars and chat views update in real-time
        try {
          this.chatGateway.emitToConversation(id, 'message:new', {
            conversationId: id,
            type: 'system',
            content: systemContent
          });
          // Also emit to individual users who may not have joined the conversation room
          const members = await this.dataSource.query(
            `SELECT user_id FROM conversation_members WHERE conversation_id = $1`,
            [id]
          );
          for (const m of members) {
            this.chatGateway.emitToUser(m.user_id, 'message:new', {
              conversationId: id,
              type: 'system',
              content: systemContent
            });
          }
        } catch (e) {}
      }
    }
    
    return { success: true };
  }

  async deleteConversation(id: string, userId: string, clearForEveryone: boolean) {
    if (clearForEveryone) {
      const [reqMember] = await this.dataSource.query(
        `SELECT role FROM conversation_members WHERE conversation_id = $1 AND user_id = $2`,
        [id, userId]
      );
      if (!reqMember || reqMember.role !== 'admin') {
        throw new Error('Only group admins can delete this group for everyone');
      }

      await this.dataSource.transaction(async (manager) => {
        await manager.query(`DELETE FROM messages WHERE conversation_id = $1`, [id]);
        await manager.query(`DELETE FROM conversation_members WHERE conversation_id = $1`, [id]);
        await manager.query(`DELETE FROM conversations WHERE id = $1`, [id]);
      });
    } else {
      const [user] = await this.dataSource.query(`SELECT full_name FROM users WHERE id = $1`, [userId]);
      const systemContent = `${user?.full_name || 'A teammate'} left the group.`;
      
      await this.dataSource.transaction(async (manager) => {
        await manager.query(
          `UPDATE conversation_members SET left_at = NOW() WHERE conversation_id = $1 AND user_id = $2`,
          [id, userId]
        );
        await manager.query(
          `INSERT INTO messages (conversation_id, sender_id, content, type)
           VALUES ($1, $2, $3, 'system')`,
          [id, userId, systemContent]
        );
      });
      
      try {
        const remainingMembers = await this.dataSource.query(
          `SELECT user_id FROM conversation_members WHERE conversation_id = $1 AND left_at IS NULL`,
          [id]
        );
        this.chatGateway.emitToConversation(id, 'message:new', {
          conversationId: id,
          type: 'system',
          content: systemContent
        });
        for (const m of remainingMembers) {
          this.chatGateway.emitToUser(m.user_id, 'message:new', {
            conversationId: id,
            type: 'system',
            content: systemContent
          });
        }
        this.chatGateway.emitToUser(userId, 'conversation:removed', {
          conversationId: id
        });
      } catch (e) {}
    }
    return { success: true };
  }

  async createInvitation(conversationId: string, invitedById: string, inviteeId: string) {
    const [senderMember] = await this.dataSource.query(
      `SELECT role FROM conversation_members WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, invitedById]
    );
    if (!senderMember || senderMember.role !== 'admin') {
      throw new Error('Only admins can invite new members to this group');
    }

    const [existingMember] = await this.dataSource.query(
      `SELECT id FROM conversation_members WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, inviteeId]
    );
    if (existingMember) {
      throw new Error('User is already a member of this conversation');
    }

    const [invitation] = await this.dataSource.query(
      `INSERT INTO group_invitations (conversation_id, invited_by_id, invitee_id, status)
       VALUES ($1, $2, $3, 'pending')
       ON CONFLICT (conversation_id, invitee_id) DO UPDATE SET status = 'pending', updated_at = NOW()
       RETURNING *`,
      [conversationId, invitedById, inviteeId]
    );

    const [conv] = await this.dataSource.query(
      `SELECT name FROM conversations WHERE id = $1`,
      [conversationId]
    );
    const [inviter] = await this.dataSource.query(
      `SELECT full_name FROM users WHERE id = $1`,
      [invitedById]
    );

    await this.dataSource.query(
      `INSERT INTO notifications (user_id, type, title, body, data)
       VALUES ($1, 'chat', $2, $3, $4)`,
      [
        inviteeId,
        'Group Invitation',
        `${inviter?.full_name || 'Someone'} invited you to join "${conv?.name || 'a group'}"`,
        JSON.stringify({ type: 'group_invite', invitationId: invitation.id, conversationId })
      ]
    );

    try {
      this.chatGateway.emitToUser(inviteeId, 'notification:new', {
        type: 'group_invite',
        invitationId: invitation.id,
        conversationId,
        message: `${inviter?.full_name || 'Someone'} invited you to join "${conv?.name || 'a group'}"`
      });
    } catch (e) {}

    return invitation;
  }

  async getInvitations(userId: string) {
    return this.dataSource.query(`
      SELECT gi.*, c.name AS conversation_name, c.description AS conversation_description, u.full_name AS inviter_name
      FROM group_invitations gi
      JOIN conversations c ON c.id = gi.conversation_id
      JOIN users u ON u.id = gi.invited_by_id
      WHERE gi.invitee_id = $1 AND gi.status = 'pending'
      ORDER BY gi.created_at DESC
    `, [userId]);
  }

  async acceptInvitation(invitationId: string, userId: string) {
    const [invitation] = await this.dataSource.query(
      `SELECT * FROM group_invitations WHERE id = $1 AND invitee_id = $2`,
      [invitationId, userId]
    );
    if (!invitation) throw new Error('Invitation not found or unauthorized');

    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `UPDATE group_invitations SET status = 'accepted', updated_at = NOW() WHERE id = $1`,
        [invitationId]
      );

      await manager.query(
        `INSERT INTO conversation_members (conversation_id, user_id, role)
         VALUES ($1, $2, 'member')
         ON CONFLICT (conversation_id, user_id) DO UPDATE SET left_at = NULL, role = 'member'`,
        [invitation.conversation_id, userId]
      );

      const [user] = await manager.query(`SELECT full_name FROM users WHERE id = $1`, [userId]);
      const systemContent = `${user?.full_name || 'A teammate'} joined the group.`;
      
      const [msg] = await manager.query(
        `INSERT INTO messages (conversation_id, sender_id, content, type)
         VALUES ($1, $2, $3, 'system') RETURNING *`,
        [invitation.conversation_id, userId, systemContent]
      );
    });

    return { success: true };
  }

  async rejectInvitation(invitationId: string, userId: string) {
    const [invitation] = await this.dataSource.query(
      `SELECT * FROM group_invitations WHERE id = $1 AND invitee_id = $2`,
      [invitationId, userId]
    );
    if (!invitation) throw new Error('Invitation not found or unauthorized');

    await this.dataSource.query(
      `UPDATE group_invitations SET status = 'rejected', updated_at = NOW() WHERE id = $1`,
      [invitationId]
    );
    return { success: true };
  }

  async removeMember(conversationId: string, userIdToRemove: string, requestingUserId: string) {
    const [reqMember] = await this.dataSource.query(
      `SELECT role FROM conversation_members WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, requestingUserId]
    );
    if (!reqMember || reqMember.role !== 'admin') {
      throw new Error('Only admins can remove members from this group');
    }

    // Get remaining members BEFORE removal for broadcasting
    const remainingMembers = await this.dataSource.query(
      `SELECT user_id FROM conversation_members WHERE conversation_id = $1`,
      [conversationId]
    );

    let systemContent = '';
    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `DELETE FROM conversation_members WHERE conversation_id = $1 AND user_id = $2`,
        [conversationId, userIdToRemove]
      );

      const [removedUser] = await manager.query(`SELECT full_name FROM users WHERE id = $1`, [userIdToRemove]);
      const [reqUser] = await manager.query(`SELECT full_name FROM users WHERE id = $1`, [requestingUserId]);
      systemContent = `${removedUser?.full_name || 'Teammate'} was removed by ${reqUser?.full_name || 'admin'}.`;
      
      await manager.query(
        `INSERT INTO messages (conversation_id, sender_id, content, type)
         VALUES ($1, $2, $3, 'system')`,
        [conversationId, requestingUserId, systemContent]
      );
    });

    // Broadcast to all remaining members so sidebars update
    try {
      this.chatGateway.emitToConversation(conversationId, 'message:new', {
        conversationId,
        type: 'system',
        content: systemContent
      });
      for (const m of remainingMembers) {
        this.chatGateway.emitToUser(m.user_id, 'message:new', {
          conversationId,
          type: 'system',
          content: systemContent
        });
      }
      // Notify the removed user so their sidebar removes the group
      this.chatGateway.emitToUser(userIdToRemove, 'conversation:removed', {
        conversationId
      });
    } catch (e) {}

    return { success: true };
  }

  async changeMemberRole(conversationId: string, targetUserId: string, newRole: string, requestingUserId: string) {
    if (newRole !== 'admin' && newRole !== 'member' && newRole !== 'blocked') {
      throw new Error('Invalid role specified');
    }

    const [reqMember] = await this.dataSource.query(
      `SELECT role FROM conversation_members WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, requestingUserId]
    );
    if (!reqMember || reqMember.role !== 'admin') {
      throw new Error('Only admins can change member roles in this group');
    }

    let systemContent = '';
    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `UPDATE conversation_members SET role = $1 WHERE conversation_id = $2 AND user_id = $3`,
        [newRole, conversationId, targetUserId]
      );

      const [targetUser] = await manager.query(`SELECT full_name FROM users WHERE id = $1`, [targetUserId]);
      if (newRole === 'blocked') {
        systemContent = `${targetUser?.full_name || 'Teammate'} has been blocked by the admin.`;
      } else {
        systemContent = `${targetUser?.full_name || 'Teammate'} is now a ${newRole === 'admin' ? 'group admin' : 'group member'}.`;
      }

      await manager.query(
        `INSERT INTO messages (conversation_id, sender_id, content, type)
         VALUES ($1, $2, $3, 'system')`,
        [conversationId, requestingUserId, systemContent]
      );
    });

    // Broadcast to all members so sidebars and member lists update in real-time
    try {
      this.chatGateway.emitToConversation(conversationId, 'message:new', {
        conversationId,
        type: 'system',
        content: systemContent
      });
      const members = await this.dataSource.query(
        `SELECT user_id FROM conversation_members WHERE conversation_id = $1`,
        [conversationId]
      );
      for (const m of members) {
        this.chatGateway.emitToUser(m.user_id, 'message:new', {
          conversationId,
          type: 'system',
          content: systemContent
        });
      }
    } catch (e) {}

    return { success: true };
  }

  async createRemovalRequest(conversationId: string, targetUserId: string, requesterId: string) {
    // 1. Verify target is a member of the conversation
    const [targetMember] = await this.dataSource.query(
      `SELECT role FROM conversation_members WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, targetUserId]
    );
    if (!targetMember) {
      throw new Error('Target user is not a member of this conversation');
    }

    // 2. Verify requester is a member of the conversation
    const [requesterMember] = await this.dataSource.query(
      `SELECT role FROM conversation_members WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, requesterId]
    );
    if (!requesterMember) {
      throw new Error('Requester is not a member of this conversation');
    }

    if (requesterMember.role === 'admin') {
      throw new Error('Admins can remove members directly without a request');
    }

    // 3. Insert the removal request
    await this.dataSource.query(
      `INSERT INTO member_removal_requests (conversation_id, target_user_id, requester_id, status)
       VALUES ($1, $2, $3, 'pending')
       ON CONFLICT (conversation_id, target_user_id) DO NOTHING`,
      [conversationId, targetUserId, requesterId]
    );

    // Broadcast update to the group's admins so they see it in real-time
    try {
      const admins = await this.dataSource.query(
        `SELECT user_id FROM conversation_members WHERE conversation_id = $1 AND role = 'admin'`,
        [conversationId]
      );
      for (const admin of admins) {
        this.chatGateway.emitToUser(admin.user_id, 'member_removal:request_created', {
          conversationId,
          targetUserId,
          requesterId
        });
      }
    } catch (e) {}

    return { success: true };
  }

  async getRemovalRequests(conversationId: string) {
    return this.dataSource.query(
      `SELECT r.*,
              u_req.full_name AS requester_name, u_req.avatar_url AS requester_avatar,
              u_target.full_name AS target_name, u_target.avatar_url AS target_avatar
       FROM member_removal_requests r
       JOIN users u_req ON u_req.id = r.requester_id
       JOIN users u_target ON u_target.id = r.target_user_id
       WHERE r.conversation_id = $1 AND r.status = 'pending'`,
      [conversationId]
    );
  }

  async approveRemovalRequest(requestId: string, adminId: string) {
    // Get the request
    const [request] = await this.dataSource.query(
      `SELECT * FROM member_removal_requests WHERE id = $1 AND status = 'pending'`,
      [requestId]
    );
    if (!request) {
      throw new Error('Removal request not found or not pending');
    }

    const { conversation_id: conversationId, target_user_id: targetUserId } = request;

    // Verify adminId is admin of the conversation
    const [adminMember] = await this.dataSource.query(
      `SELECT role FROM conversation_members WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, adminId]
    );
    if (!adminMember || adminMember.role !== 'admin') {
      throw new Error('Only admins can approve removal requests');
    }

    // Update the request status
    await this.dataSource.query(
      `UPDATE member_removal_requests SET status = 'approved', updated_at = NOW() WHERE id = $1`,
      [requestId]
    );

    // Call removeMember
    return this.removeMember(conversationId, targetUserId, adminId);
  }

  async rejectRemovalRequest(requestId: string, adminId: string) {
    // Get the request
    const [request] = await this.dataSource.query(
      `SELECT * FROM member_removal_requests WHERE id = $1 AND status = 'pending'`,
      [requestId]
    );
    if (!request) {
      throw new Error('Removal request not found or not pending');
    }

    const { conversation_id: conversationId } = request;

    // Verify adminId is admin of the conversation
    const [adminMember] = await this.dataSource.query(
      `SELECT role FROM conversation_members WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, adminId]
    );
    if (!adminMember || adminMember.role !== 'admin') {
      throw new Error('Only admins can reject removal requests');
    }

    // Update request status to 'rejected'
    await this.dataSource.query(
      `UPDATE member_removal_requests SET status = 'rejected', updated_at = NOW() WHERE id = $1`,
      [requestId]
    );

    // Broadcast rejected state to admins
    try {
      this.chatGateway.emitToUser(adminId, 'member_removal:request_rejected', {
        requestId,
        conversationId
      });
    } catch (e) {}

    return { success: true };
  }
}
