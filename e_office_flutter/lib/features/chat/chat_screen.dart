import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:file_picker/file_picker.dart';
import 'package:intl/intl.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_styles.dart';
import '../../core/models/chat_model.dart';
import '../../core/state/theme_provider.dart';
import '../../core/state/auth_provider.dart';
import '../../core/state/chat_provider.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _msgController = TextEditingController();
  final _scrollController = ScrollController();
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = context.read<AuthProvider>();
      final chat = context.read<ChatProvider>();
      if (auth.user != null) {
        chat.fetchConversations(auth.user!.id);
      }
    });
  }

  @override
  void dispose() {
    _msgController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    if (_scrollController.hasClients) {
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent + 80,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    }
  }

  void _handleSendMessage() {
    final text = _msgController.text.trim();
    if (text.isEmpty) return;

    final chat = context.read<ChatProvider>();
    final auth = context.read<AuthProvider>();
    if (chat.activeConversationId == null || auth.user == null) return;

    chat.sendMessage(
      conversationId: chat.activeConversationId!,
      currentUserId: auth.user!.id,
      content: text,
      type: MessageType.text,
    );

    _msgController.clear();
    Future.delayed(const Duration(milliseconds: 100), _scrollToBottom);
  }

  void _handlePickAndShareFile() async {
    final result = await FilePicker.pickFiles();
    if (result != null && result.files.isNotEmpty && mounted) {
      final file = result.files.first;
      final chat = context.read<ChatProvider>();
      final auth = context.read<AuthProvider>();
      if (chat.activeConversationId == null || auth.user == null) return;

      final isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].contains(file.extension?.toLowerCase());

      chat.sendMessage(
        conversationId: chat.activeConversationId!,
        currentUserId: auth.user!.id,
        content: isImage ? '📷 Image Attachment' : '📎 ${file.name}',
        type: isImage ? MessageType.image : MessageType.file,
        fileName: file.name,
        fileSize: file.size,
        fileUrl: file.path,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('File shared: ${file.name}')),
        );
      }
      Future.delayed(const Duration(milliseconds: 100), _scrollToBottom);
    }
  }

  void _showMissedCallsDialog(BuildContext context, ChatProvider chat, bool isDark) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.phone_missed_rounded, color: AppColors.rose, size: 20),
            SizedBox(width: 8),
            Text('Missed Call History'),
          ],
        ),
        content: SizedBox(
          width: 360,
          child: chat.missedCalls.isEmpty
              ? const Padding(
                  padding: EdgeInsets.all(24),
                  child: Center(child: Text('No missed calls 🎉', style: TextStyle(color: Colors.grey))),
                )
              : ListView.separated(
                  shrinkWrap: true,
                  itemCount: chat.missedCalls.length,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (ctx, i) {
                    final item = chat.missedCalls[i];
                    return ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: CircleAvatar(
                        backgroundColor: AppColors.rose.withValues(alpha: 0.15),
                        child: const Icon(Icons.call_missed_rounded, color: AppColors.rose, size: 18),
                      ),
                      title: Text(item.callerName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      subtitle: Text(
                        '${DateFormat('hh:mm a').format(item.timestamp)} • ${item.callType == CallType.video ? 'Video' : 'Intercom / Voice'}',
                        style: const TextStyle(fontSize: 11),
                      ),
                      trailing: IconButton(
                        icon: const Icon(Icons.phone_forwarded_rounded, color: AppColors.emerald, size: 18),
                        onPressed: () {
                          Navigator.pop(ctx);
                          final auth = context.read<AuthProvider>();
                          if (auth.user != null) {
                            chat.startCall(
                              targetUserId: item.callerId,
                              targetUserName: item.callerName,
                              type: item.callType,
                              currentUser: auth.user!,
                            );
                          }
                        },
                      ),
                    );
                  },
                ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Close')),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isDark;
    final chat = context.watch<ChatProvider>();
    final auth = context.watch<AuthProvider>();
    final user = auth.user;

    final activeConv = chat.conversations.firstWhere(
      (c) => c.id == chat.activeConversationId,
      orElse: () => ChatConversation(id: '', name: 'Select a conversation', participants: []),
    );

    return LayoutBuilder(
      builder: (context, constraints) {
        final isMobile = constraints.maxWidth < 700;

        return Row(
          children: [
            // Conversations List Sidebar
            if (!isMobile || chat.activeConversationId == null)
              Container(
                width: isMobile ? constraints.maxWidth : 300,
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF0D121F) : const Color(0xFFFAFAFA),
                  border: Border(right: BorderSide(color: isDark ? AppColors.darkBorder.withValues(alpha: 0.5) : AppColors.lightBorder)),
                ),
                child: Column(
                  children: [
                    // Top Search & Call History Button
                    Padding(
                      padding: const EdgeInsets.all(12),
                      child: Row(
                        children: [
                          Expanded(
                            child: TextField(
                              onChanged: (v) => setState(() => _searchQuery = v.toLowerCase()),
                              decoration: InputDecoration(
                                hintText: 'Search chats & channels...',
                                hintStyle: const TextStyle(fontSize: 12),
                                prefixIcon: const Icon(Icons.search_rounded, size: 16),
                                filled: true,
                                fillColor: isDark ? AppColors.darkCard : Colors.white,
                                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                              ),
                            ),
                          ),
                          const SizedBox(width: 6),
                          IconButton(
                            icon: Badge(
                              isLabelVisible: chat.missedCalls.isNotEmpty,
                              label: Text('${chat.missedCalls.length}'),
                              child: const Icon(Icons.history_rounded, size: 20),
                            ),
                            tooltip: 'Missed Calls Log',
                            onPressed: () => _showMissedCallsDialog(context, chat, isDark),
                          ),
                        ],
                      ),
                    ),

                    // Conversations List
                    Expanded(
                      child: chat.isLoadingConversations
                          ? const Center(child: CircularProgressIndicator())
                          : Builder(
                              builder: (context) {
                                final filtered = chat.conversations.where((c) {
                                  if (_searchQuery.isEmpty) return true;
                                  final n = c.getDisplayName(user?.id ?? '').toLowerCase();
                                  return n.contains(_searchQuery);
                                }).toList();

                                return ListView.builder(
                                  itemCount: filtered.length,
                                  itemBuilder: (context, i) {
                                    final conv = filtered[i];
                                    final isSelected = conv.id == chat.activeConversationId;
                                    final name = conv.getDisplayName(user?.id ?? '');
                                    final isOnline = conv.isUserOnline(user?.id ?? '');

                                return ListTile(
                                  selected: isSelected,
                                  selectedTileColor: AppColors.primary.withValues(alpha: isDark ? 0.2 : 0.1),
                                  onTap: () {
                                    chat.selectConversation(conv.id, user?.id ?? '');
                                  },
                                  leading: Stack(
                                    children: [
                                      CircleAvatar(
                                        backgroundColor: conv.isGroup ? AppColors.secondary : AppColors.primary,
                                        child: Text(
                                          name.isNotEmpty ? name[0].toUpperCase() : '#',
                                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                                        ),
                                      ),
                                      if (isOnline)
                                        Positioned(
                                          bottom: 0,
                                          right: 0,
                                          child: Container(
                                            width: 10,
                                            height: 10,
                                            decoration: BoxDecoration(
                                              color: AppColors.emerald,
                                              shape: BoxShape.circle,
                                              border: Border.all(color: isDark ? AppColors.darkBg : Colors.white, width: 2),
                                            ),
                                          ),
                                        ),
                                    ],
                                  ),
                                  title: Text(
                                    name,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                                      fontSize: 13,
                                      color: isDark ? Colors.white : AppColors.lightTextPrimary,
                                    ),
                                  ),
                                  subtitle: Text(
                                    conv.lastMessage?.content ?? 'No messages yet',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontSize: 11,
                                      color: isDark ? AppColors.darkTextTertiary : AppColors.lightTextTertiary,
                                    ),
                                  ),
                                );
                              },
                            );
                          },
                        ),
                    ),
                  ],
                ),
              ),

            // Main Active Chat Area
            if (!isMobile || chat.activeConversationId != null)
              Expanded(
                child: chat.activeConversationId == null
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.forum_outlined, size: 64, color: isDark ? AppColors.darkTextTertiary : AppColors.lightTextTertiary),
                            const SizedBox(height: 12),
                            Text('Select a conversation or channel to start chatting', style: AppStyles.bodyMedium(isDark: isDark)),
                          ],
                        ),
                      )
                    : Column(
                        children: [
                          // Chat Header with Calling Action Buttons
                          Container(
                            height: 60,
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            decoration: BoxDecoration(
                              color: isDark ? AppColors.darkCard : Colors.white,
                              border: Border(bottom: BorderSide(color: isDark ? AppColors.darkBorder.withValues(alpha: 0.5) : AppColors.lightBorder)),
                            ),
                            child: Row(
                              children: [
                                if (isMobile)
                                  IconButton(
                                    icon: const Icon(Icons.arrow_back_rounded),
                                    onPressed: () => chat.selectConversation('', user?.id ?? ''),
                                  ),
                                CircleAvatar(
                                  radius: 18,
                                  backgroundColor: activeConv.isGroup ? AppColors.secondary : AppColors.primary,
                                  child: Text(
                                    activeConv.getDisplayName(user?.id ?? '')[0].toUpperCase(),
                                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Text(
                                        activeConv.getDisplayName(user?.id ?? ''),
                                        style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: isDark ? Colors.white : AppColors.lightTextPrimary),
                                      ),
                                      Text(
                                        activeConv.isGroup ? '${activeConv.participants.length} members' : 'GSV Intercom Network',
                                        style: TextStyle(fontSize: 10, color: isDark ? AppColors.darkTextTertiary : AppColors.lightTextTertiary),
                                      ),
                                    ],
                                  ),
                                ),

                                // Voice Call Button
                                IconButton(
                                  icon: const Icon(Icons.phone_rounded, color: AppColors.emerald, size: 20),
                                  tooltip: 'Start Voice Call',
                                  onPressed: () {
                                    if (user != null) {
                                      final targetName = activeConv.getDisplayName(user.id);
                                      chat.startCall(
                                        targetUserId: activeConv.id,
                                        targetUserName: targetName,
                                        type: CallType.audio,
                                        currentUser: user,
                                      );
                                    }
                                  },
                                ),

                                // Video Call Button
                                IconButton(
                                  icon: const Icon(Icons.videocam_rounded, color: AppColors.primaryLight, size: 22),
                                  tooltip: 'Start Video Call',
                                  onPressed: () {
                                    if (user != null) {
                                      final targetName = activeConv.getDisplayName(user.id);
                                      chat.startCall(
                                        targetUserId: activeConv.id,
                                        targetUserName: targetName,
                                        type: CallType.video,
                                        currentUser: user,
                                      );
                                    }
                                  },
                                ),

                                // Intercom Broadcast Button
                                IconButton(
                                  icon: const Icon(Icons.podcasts_rounded, color: AppColors.amber, size: 20),
                                  tooltip: 'Intercom Broadcast',
                                  onPressed: () {
                                    if (user != null) {
                                      final targetName = activeConv.getDisplayName(user.id);
                                      chat.startCall(
                                        targetUserId: activeConv.id,
                                        targetUserName: targetName,
                                        type: CallType.intercom,
                                        currentUser: user,
                                      );
                                    }
                                  },
                                ),
                              ],
                            ),
                          ),

                          // Message List
                          Expanded(
                            child: chat.isLoadingMessages
                                ? const Center(child: CircularProgressIndicator())
                                : ListView.builder(
                                    controller: _scrollController,
                                    padding: const EdgeInsets.all(16),
                                    itemCount: chat.messages.length,
                                    itemBuilder: (context, i) {
                                      final msg = chat.messages[i];
                                      final isMe = msg.senderId == user?.id;
                                      return _buildMessageBubble(msg, isMe, isDark);
                                    },
                                  ),
                          ),

                          // Input Composer & File Sharing
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            decoration: BoxDecoration(
                              color: isDark ? AppColors.darkCard : Colors.white,
                              border: Border(top: BorderSide(color: isDark ? AppColors.darkBorder.withValues(alpha: 0.5) : AppColors.lightBorder)),
                            ),
                            child: Row(
                              children: [
                                // Attachment / Share File Button (WhatsApp style)
                                IconButton(
                                  icon: const Icon(Icons.attach_file_rounded, size: 20),
                                  tooltip: 'Share Document or Media',
                                  onPressed: _handlePickAndShareFile,
                                ),

                                Expanded(
                                  child: TextField(
                                    controller: _msgController,
                                    style: TextStyle(color: isDark ? Colors.white : AppColors.lightTextPrimary, fontSize: 13),
                                    decoration: InputDecoration(
                                      hintText: 'Type a message... (Press Enter to send)',
                                      hintStyle: TextStyle(color: isDark ? AppColors.darkTextTertiary : AppColors.lightTextTertiary, fontSize: 13),
                                      filled: true,
                                      fillColor: isDark ? AppColors.darkSurface : AppColors.lightCardHover,
                                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: BorderSide.none),
                                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                                    ),
                                    onSubmitted: (_) => _handleSendMessage(),
                                  ),
                                ),

                                const SizedBox(width: 8),

                                // Send Button
                                InkWell(
                                  borderRadius: BorderRadius.circular(20),
                                  onTap: _handleSendMessage,
                                  child: Container(
                                    width: 40,
                                    height: 40,
                                    decoration: BoxDecoration(
                                      gradient: AppColors.primaryGradient,
                                      shape: BoxShape.circle,
                                    ),
                                    child: const Icon(Icons.send_rounded, color: Colors.white, size: 18),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
              ),
          ],
        );
      },
    );
  }

  Widget _buildMessageBubble(ChatMessage msg, bool isMe, bool isDark) {
    final timeStr = DateFormat('hh:mm a').format(msg.createdAt);

    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        constraints: const BoxConstraints(maxWidth: 460),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: isMe
              ? AppColors.primary
              : (isDark ? AppColors.darkCard : AppColors.lightCardHover),
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(14),
            topRight: const Radius.circular(14),
            bottomLeft: Radius.circular(isMe ? 14 : 2),
            bottomRight: Radius.circular(isMe ? 2 : 14),
          ),
          border: isMe ? null : Border.all(color: isDark ? AppColors.darkBorder.withValues(alpha: 0.5) : AppColors.lightBorder),
        ),
        child: Column(
          crossAxisAlignment: isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            if (msg.type == MessageType.file || msg.type == MessageType.image) ...[
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    msg.type == MessageType.image ? Icons.image_rounded : Icons.insert_drive_file_rounded,
                    color: isMe ? Colors.white : AppColors.primaryLight,
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Flexible(
                    child: Text(
                      msg.fileName ?? 'Shared File',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: isMe ? Colors.white : (isDark ? Colors.white : AppColors.lightTextPrimary),
                        fontSize: 12,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
            ],
            Text(
              msg.content ?? '',
              style: TextStyle(
                color: isMe ? Colors.white : (isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary),
                fontSize: 13,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              timeStr,
              style: TextStyle(
                fontSize: 9,
                color: isMe ? Colors.white70 : (isDark ? AppColors.darkTextTertiary : AppColors.lightTextTertiary),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
