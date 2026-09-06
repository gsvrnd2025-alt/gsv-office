import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/models/chat_model.dart';
import '../../../core/state/chat_provider.dart';

class CallHudOverlay extends StatelessWidget {
  const CallHudOverlay({super.key});

  @override
  Widget build(BuildContext context) {
    final chat = context.watch<ChatProvider>();
    if (chat.callStatus != CallStatus.active && chat.callStatus != CallStatus.dialing) {
      return const SizedBox.shrink();
    }

    final isDialing = chat.callStatus == CallStatus.dialing;
    final isVideo = chat.callType == CallType.video;

    return Positioned(
      bottom: 24,
      right: 24,
      child: Material(
        elevation: 16,
        borderRadius: BorderRadius.circular(20),
        color: Colors.transparent,
        child: Container(
          width: isVideo ? 320 : 280,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: const Color(0xFF111827).withValues(alpha: 0.95),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppColors.primary.withValues(alpha: 0.5), width: 1.5),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.5),
                blurRadius: 24,
                offset: const Offset(0, 8),
              ),
              BoxShadow(
                color: AppColors.primary.withValues(alpha: 0.2),
                blurRadius: 16,
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Header with Call Type Badge & Pulse
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: (isDialing ? AppColors.amber : AppColors.emerald).withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: (isDialing ? AppColors.amber : AppColors.emerald).withValues(alpha: 0.5),
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                            color: isDialing ? AppColors.amber : AppColors.emerald,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          isDialing ? 'DIALING...' : (chat.callType == CallType.intercom ? 'INTERCOM' : (isVideo ? 'VIDEO CALL' : 'VOICE CALL')),
                          style: TextStyle(
                            color: isDialing ? AppColors.amber : AppColors.emerald,
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (!isDialing)
                    Text(
                      chat.formattedCallDuration,
                      style: const TextStyle(
                        color: Colors.white70,
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        fontFamily: 'monospace',
                      ),
                    ),
                ],
              ),

              const SizedBox(height: 16),

              // Avatar & Name
              CircleAvatar(
                radius: 30,
                backgroundColor: AppColors.primary,
                child: Text(
                  chat.targetUserName?.isNotEmpty == true ? chat.targetUserName![0].toUpperCase() : 'U',
                  style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(height: 10),
              Text(
                chat.targetUserName ?? 'Colleague',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              Text(
                isDialing ? 'Connecting workstation...' : 'Connected (LAN / TrueNAS)',
                style: TextStyle(color: Colors.white.withValues(alpha: 0.6), fontSize: 11),
              ),

              const SizedBox(height: 20),

              // Control Buttons
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  // Mute Mic
                  _buildCallActionBtn(
                    icon: chat.isMuted ? Icons.mic_off_rounded : Icons.mic_rounded,
                    isActive: chat.isMuted,
                    activeColor: AppColors.amber,
                    onTap: () => chat.toggleMute(),
                  ),

                  // Video Toggle (if video call)
                  if (isVideo)
                    _buildCallActionBtn(
                      icon: chat.isVideoEnabled ? Icons.videocam_rounded : Icons.videocam_off_rounded,
                      isActive: !chat.isVideoEnabled,
                      activeColor: AppColors.amber,
                      onTap: () => chat.toggleVideo(),
                    ),

                  // Speaker Toggle
                  _buildCallActionBtn(
                    icon: chat.isSpeakerOn ? Icons.volume_up_rounded : Icons.volume_down_rounded,
                    isActive: chat.isSpeakerOn,
                    activeColor: AppColors.primaryLight,
                    onTap: () => chat.toggleSpeaker(),
                  ),

                  // End Call (Red)
                  InkWell(
                    borderRadius: BorderRadius.circular(20),
                    onTap: () => chat.endCall(),
                    child: Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        gradient: AppColors.roseGradient,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.rose.withValues(alpha: 0.4),
                            blurRadius: 10,
                          ),
                        ],
                      ),
                      child: const Icon(Icons.call_end_rounded, color: Colors.white, size: 20),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCallActionBtn({
    required IconData icon,
    required bool isActive,
    required Color activeColor,
    required VoidCallback onTap,
  }) {
    return InkWell(
      borderRadius: BorderRadius.circular(20),
      onTap: onTap,
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: isActive ? activeColor.withValues(alpha: 0.2) : Colors.white.withValues(alpha: 0.08),
          shape: BoxShape.circle,
          border: Border.all(
            color: isActive ? activeColor : Colors.white.withValues(alpha: 0.15),
          ),
        ),
        child: Icon(
          icon,
          size: 18,
          color: isActive ? activeColor : Colors.white70,
        ),
      ),
    );
  }
}
