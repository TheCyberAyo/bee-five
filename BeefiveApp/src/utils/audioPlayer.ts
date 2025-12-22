import Sound from 'react-native-sound';
import { Platform } from 'react-native';

// Enable playback in silence mode (iOS)
Sound.setCategory('Playback');

let loginMelody: Sound | null = null;

/**
 * Initialize and play the login melody
 */
export const playLoginMelody = (): void => {
  try {
    // If already playing, don't start again
    if (loginMelody && loginMelody.isPlaying()) {
      return;
    }

    // Release previous instance if exists
    if (loginMelody) {
      loginMelody.release();
    }

    // Create new sound instance
    // For Android: file should be in res/raw/ and accessed by filename without extension
    // For iOS: file should be in the app bundle, accessed by filename with extension
    const soundPath = Platform.OS === 'android' 
      ? 'bee_five_melody_01'  // Android: filename without extension from res/raw/
      : 'Bee_Five_Melody_01.mp3'; // iOS: filename with extension from app bundle

    loginMelody = new Sound(
      soundPath,
      Sound.MAIN_BUNDLE,
      (error) => {
        if (error) {
          console.error('Failed to load login melody:', error);
          return;
        }

        // Play the sound
        if (loginMelody) {
          loginMelody.play((success) => {
            if (success) {
              console.log('Login melody played successfully');
            } else {
              console.log('Login melody playback failed');
            }
            // Release the sound after playback
            if (loginMelody) {
              loginMelody.release();
              loginMelody = null;
            }
          });
        }
      }
    );
  } catch (error) {
    console.error('Error playing login melody:', error);
  }
};

/**
 * Stop the login melody if it's playing
 */
export const stopLoginMelody = (): void => {
  if (loginMelody && loginMelody.isPlaying()) {
    loginMelody.stop();
    loginMelody.release();
    loginMelody = null;
  }
};

