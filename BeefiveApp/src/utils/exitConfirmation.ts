import { Alert, Platform, BackHandler } from 'react-native';

/**
 * Shows a confirmation dialog before exiting the game
 * @param onConfirm - Callback to execute if user confirms exit
 * @param onCancel - Optional callback to execute if user cancels
 */
export const showExitConfirmation = (
  onConfirm: () => void,
  onCancel?: () => void
) => {
  Alert.alert(
    'Exit Game',
    'Are you sure you want to exit the game?',
    [
      {
        text: 'Cancel',
        style: 'cancel',
        onPress: onCancel,
      },
      {
        text: 'Exit',
        style: 'destructive',
        onPress: onConfirm,
      },
    ],
    { cancelable: true }
  );
};

/**
 * Sets up Android hardware back button handler with exit confirmation
 * @param onBackPress - Callback to execute when back button is pressed and user confirms
 * @returns Cleanup function to remove the back handler
 */
export const setupBackButtonHandler = (onBackPress: () => void) => {
  if (Platform.OS !== 'android') {
    return () => {}; // No-op for non-Android platforms
  }

  const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
    showExitConfirmation(onBackPress);
    return true; // Prevent default back behavior
  });

  return () => backHandler.remove();
};






