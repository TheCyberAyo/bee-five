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

        // Set the sound to loop indefinitely (-1 means infinite loop)
        if (loginMelody) {
          loginMelody.setNumberOfLoops(-1);
          
          // Play the sound
          loginMelody.play((success) => {
            if (success) {
              console.log('Login melody started playing (looping)');
            } else {
              console.log('Login melody playback failed');
            }
            // Don't release the sound - let it loop continuously
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

