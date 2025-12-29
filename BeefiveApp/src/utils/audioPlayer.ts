import Sound from 'react-native-sound';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Enable playback in silence mode (iOS)
Sound.setCategory('Playback');

let appMelody: Sound | null = null;
let isSoundEnabled: boolean = true; // Default to enabled
let soundVolume: number = 1.0; // Default volume (0.0 to 1.0)

const SOUND_ENABLED_KEY = '@beefive:soundEnabled';
const SOUND_VOLUME_KEY = '@beefive:soundVolume';

// Load sound settings from storage
export const loadSoundSettings = async (): Promise<void> => {
  try {
    const enabled = await AsyncStorage.getItem(SOUND_ENABLED_KEY);
    if (enabled !== null) {
      isSoundEnabled = enabled === 'true';
    }
    
    const volume = await AsyncStorage.getItem(SOUND_VOLUME_KEY);
    if (volume !== null) {
      soundVolume = parseFloat(volume);
    }
    
    // Stop melody if sound is disabled
    if (!isSoundEnabled && appMelody) {
      if (appMelody.isPlaying()) {
        appMelody.stop();
      }
      appMelody.release();
      appMelody = null;
    } else if (isSoundEnabled && appMelody) {
      // Apply volume if sound is enabled
      appMelody.setVolume(soundVolume);
    }
  } catch (error) {
    console.error('Error loading sound settings:', error);
  }
};

// Get current sound enabled state
export const getSoundEnabled = (): boolean => {
  return isSoundEnabled;
};

/**
 * Stop the app melody if it's playing
 */
const stopAppMelodyInternal = (): void => {
  if (appMelody) {
    try {
      // Try to stop if it might be playing
      appMelody.stop();
    } catch (error) {
      // Ignore errors if already stopped
    }
    try {
      appMelody.release();
    } catch (error) {
      // Ignore errors if already released
    }
    appMelody = null;
  }
};

// Set sound enabled state
export const setSoundEnabled = async (enabled: boolean): Promise<void> => {
  try {
    isSoundEnabled = enabled;
    await AsyncStorage.setItem(SOUND_ENABLED_KEY, enabled.toString());
    
    if (enabled) {
      // Re-enable: set volume on existing sound if it exists, otherwise playAppMelody will handle creating it
      if (appMelody) {
        appMelody.setVolume(soundVolume);
        if (!appMelody.isPlaying()) {
          appMelody.play();
        }
      }
      // Note: If appMelody is null, playAppMelody() should be called from the component
    } else {
      // Disable: stop and release the sound completely
      stopAppMelodyInternal();
    }
  } catch (error) {
    console.error('Error saving sound enabled state:', error);
  }
};

// Get current volume
export const getSoundVolume = (): number => {
  return soundVolume;
};

// Set sound volume (0.0 to 1.0)
export const setSoundVolume = async (volume: number): Promise<void> => {
  try {
    soundVolume = Math.max(0, Math.min(1, volume)); // Clamp between 0 and 1
    await AsyncStorage.setItem(SOUND_VOLUME_KEY, soundVolume.toString());
    
    // Apply to existing sound if playing
    if (appMelody && isSoundEnabled) {
      appMelody.setVolume(soundVolume);
    }
  } catch (error) {
    console.error('Error saving sound volume:', error);
  }
};

/**
 * Initialize and play the app melody (background music)
 */
export const playAppMelody = (): void => {
  try {
    // Don't play if sound is disabled
    if (!isSoundEnabled) {
      return;
    }

    // If already playing, don't start again
    if (appMelody && appMelody.isPlaying()) {
      return;
    }

    // Release previous instance if exists
    if (appMelody) {
      appMelody.release();
    }

    // Create new sound instance
    // For Android: file should be in res/raw/ and accessed by filename without extension
    // For iOS: file should be in the app bundle, accessed by filename with extension
    const soundPath = Platform.OS === 'android' 
      ? 'bee_five_melody_01'  // Android: filename without extension from res/raw/
      : 'Bee_Five_Melody_01.mp3'; // iOS: filename with extension from app bundle

    appMelody = new Sound(
      soundPath,
      Sound.MAIN_BUNDLE,
      (error) => {
        if (error) {
          console.error('Failed to load app melody:', error);
          return;
        }

        // Set the sound to loop indefinitely (-1 means infinite loop)
        if (appMelody) {
          appMelody.setNumberOfLoops(-1);
          appMelody.setVolume(soundVolume);
          
          // Play the sound
          appMelody.play((success) => {
            if (success) {
              console.log('App melody started playing (looping)');
            } else {
              console.log('App melody playback failed');
            }
            // Don't release the sound - let it loop continuously
          });
        }
      }
    );
  } catch (error) {
    console.error('Error playing app melody:', error);
  }
};

/**
 * Pause the app melody (stop but keep instance for resuming)
 */
export const pauseAppMelody = (): void => {
  if (appMelody) {
    try {
      if (appMelody.isPlaying()) {
        appMelody.stop();
      }
    } catch (error) {
      // Ignore errors
    }
    // Don't release - keep the instance so we can resume
  }
};

/**
 * Resume the app melody if it was paused
 */
export const resumeAppMelody = (): void => {
  if (!isSoundEnabled) {
    return; // Don't resume if sound is disabled
  }
  
  if (appMelody) {
    try {
      if (!appMelody.isPlaying()) {
        appMelody.play();
      }
    } catch (error) {
      console.error('Error resuming melody:', error);
      // If resume fails, try to recreate the sound
      appMelody = null;
      playAppMelody();
    }
  } else {
    // No instance exists, start fresh
    playAppMelody();
  }
};

/**
 * Stop the app melody if it's playing (public export)
 */
export const stopAppMelody = (): void => {
  stopAppMelodyInternal();
};

// Legacy function names for backward compatibility (redirect to new names)
export const playLoginMelody = playAppMelody;
export const stopLoginMelody = stopAppMelody;

