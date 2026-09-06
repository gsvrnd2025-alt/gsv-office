import 'dart:async';
import 'package:audioplayers/audioplayers.dart';
import 'storage_service.dart';

class SoundService {
  static final AudioPlayer _loopPlayer = AudioPlayer();
  static final AudioPlayer _effectPlayer = AudioPlayer();
  static bool _isPlayingLoop = false;

  // Sound generator URLs or bundled audio
  static const String _ringtoneUrl = 'https://assets.mixkit.co/active_storage/sfx/2874/2874-preview.mp3';
  static const String _dialToneUrl = 'https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3';
  static const String _msgToneUrl = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';
  static const String _endCallUrl = 'https://assets.mixkit.co/active_storage/sfx/2871/2871-preview.mp3';

  static Future<void> playRingtone() async {
    if (!StorageService.isSoundEnabled()) return;
    try {
      await _loopPlayer.stop();
      await _loopPlayer.setReleaseMode(ReleaseMode.loop);
      await _loopPlayer.play(UrlSource(_ringtoneUrl));
      _isPlayingLoop = true;
    } catch (_) {}
  }

  static Future<void> playDialTone() async {
    if (!StorageService.isSoundEnabled()) return;
    try {
      await _loopPlayer.stop();
      await _loopPlayer.setReleaseMode(ReleaseMode.loop);
      await _loopPlayer.play(UrlSource(_dialToneUrl));
      _isPlayingLoop = true;
    } catch (_) {}
  }

  static Future<void> stopLoop() async {
    if (_isPlayingLoop) {
      try {
        await _loopPlayer.stop();
      } catch (_) {}
      _isPlayingLoop = false;
    }
  }

  static Future<void> playEndCall() async {
    await stopLoop();
    if (!StorageService.isSoundEnabled()) return;
    try {
      await _effectPlayer.play(UrlSource(_endCallUrl));
    } catch (_) {}
  }

  static Future<void> playMessageTone() async {
    if (!StorageService.isSoundEnabled()) return;
    try {
      await _effectPlayer.play(UrlSource(_msgToneUrl));
    } catch (_) {}
  }
}
