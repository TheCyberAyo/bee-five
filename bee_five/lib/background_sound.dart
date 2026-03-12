import 'package:audioplayers/audioplayers.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Background melody (looping) from BeefiveApp. Active from when player enters the game until turned off.
class BackgroundSound {
  BackgroundSound._();
  static final BackgroundSound _instance = BackgroundSound._();
  static BackgroundSound get instance => _instance;

  static const String soundEnabledKey = 'bee_five_sound_enabled';
  static const String _assetPath = 'sounds/Bee_Five_Melody_01.mp3';

  final AudioPlayer _player = AudioPlayer();
  bool _initialized = false;
  bool _soundEnabled = true;

  bool get soundEnabled => _soundEnabled;

  /// Load saved preference and start playing if enabled.
  Future<void> init() async {
    if (_initialized) return;
    try {
      final prefs = await SharedPreferences.getInstance();
      _soundEnabled = prefs.getBool(soundEnabledKey) ?? true;
      _player.setReleaseMode(ReleaseMode.loop);
      _player.setPlayerMode(PlayerMode.mediaPlayer);
      _initialized = true;
      if (_soundEnabled) await _play();
    } catch (_) {}
  }

  /// Start looping playback (no-op if disabled).
  Future<void> _play() async {
    try {
      await _player.setSource(AssetSource(_assetPath));
      await _player.resume();
    } catch (_) {}
  }

  /// Stop playback.
  Future<void> _stop() async {
    try {
      await _player.stop();
    } catch (_) {}
  }

  /// Pause playback (e.g. when app goes to background). Does not change soundEnabled.
  Future<void> pause() async {
    try {
      await _player.pause();
    } catch (_) {}
  }

  /// Resume playback if sound is enabled (e.g. when app returns to foreground).
  Future<void> resumeIfEnabled() async {
    if (!_soundEnabled || !_initialized) return;
    try {
      await _player.resume();
    } catch (_) {}
  }

  /// Call when player enters the game (e.g. HomePage first build). Starts looping if sound is enabled.
  Future<void> startIfEnabled() async {
    await init();
    if (_soundEnabled) await _play();
  }

  /// Set sound on/off and persist. Stops or starts playback accordingly.
  Future<bool> setEnabled(bool enabled) async {
    if (_soundEnabled == enabled) return _soundEnabled;
    _soundEnabled = enabled;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(soundEnabledKey, enabled);
      if (enabled) {
        await _play();
      } else {
        await _stop();
      }
    } catch (_) {}
    return _soundEnabled;
  }

  /// Toggle enabled state; returns new value.
  Future<bool> toggle() async {
    return setEnabled(!_soundEnabled);
  }

  /// Release player (call from app dispose if needed).
  Future<void> dispose() async {
    try {
      await _player.release();
    } catch (_) {}
  }
}
