import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface ResetPasswordPageProps {
  onBack: () => void;
  onSuccess: () => void;
}

export default function ResetPasswordPage({
  onBack,
  onSuccess,
}: ResetPasswordPageProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [hasRecoveryDeepLink, setHasRecoveryDeepLink] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);

  const { updatePassword } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    const checkSession = async () => {
      if (!supabase) {
        setError('Authentication service is not configured.');
        setLoading(false);
        return;
      }

      try {
        // Check if we have a valid session (set from deep link)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
          // If no session and we haven't received a recovery deep link, show error
          // Otherwise, wait for deep link handler to process it
          if (!hasRecoveryDeepLink) {
            setError('Invalid or expired password reset link. Please request a new one.');
            setLoading(false);
          }
          // If hasRecoveryDeepLink is true, the deep link handler will set isValidToken
          return;
        }

        // If we have a session, check if it's a valid recovery session
        // A recovery session typically means the user can update their password
        // We'll allow the session if:
        // 1. We received a recovery deep link (hasRecoveryDeepLink), OR
        // 2. The session was just created (user might not be confirmed yet)
        // The actual validation happens when updatePassword is called - if it's not a valid recovery session, it will fail
        
        // For security: If user is already logged in with a confirmed account and we didn't get a recovery deep link,
        // this might be a regular session, not a recovery session
        if (session.user?.email_confirmed_at && !hasRecoveryDeepLink) {
          // This could be a regular logged-in session, not a recovery session
          // We'll be cautious and require a recovery deep link
          setError('Please use the password reset link from your email to access this page.');
          setLoading(false);
          return;
        }

        // Session exists and appears to be valid (either from recovery deep link or unconfirmed user)
        setIsValidToken(true);
        setLoading(false);
      } catch (err) {
        console.error('Password reset validation error:', err);
        setError('An unexpected error occurred. Please try again.');
        setLoading(false);
      }
    };

    checkSession();

    // Listen for deep links
    const handleDeepLink = async (event: { url: string }) => {
      try {
        // Validate URL format before parsing
        if (!event.url || typeof event.url !== 'string') {
          console.error('Invalid deep link URL format');
          setError('Invalid reset link format. Please request a new one.');
          setLoading(false);
          return;
        }

        // Parse URL with error handling
        let url: URL;
        try {
          url = new URL(event.url);
        } catch (urlError) {
          console.error('Failed to parse deep link URL:', urlError);
          setError('Invalid reset link format. Please request a new one.');
          setLoading(false);
          return;
        }

        // Extract hash parameters
        const hashParams = new URLSearchParams(url.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        // Validate that this is a recovery link
        if (type !== 'recovery') {
          console.error('Deep link is not a recovery type:', type);
          setError('Invalid reset link type. Please request a new one.');
          setLoading(false);
          return;
        }

        // Validate tokens exist
        if (!accessToken || !refreshToken) {
          console.error('Missing tokens in deep link');
          setError('Invalid reset link. Missing authentication tokens.');
          setLoading(false);
          return;
        }

        // Set session with error handling
        if (!supabase) {
          setError('Authentication service is not configured.');
          setLoading(false);
          return;
        }

        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          console.error('Failed to set recovery session:', sessionError);
          setError('Failed to validate reset link. Please request a new one.');
          setLoading(false);
          return;
        }

        // Successfully set recovery session
        setHasRecoveryDeepLink(true);
        setIsValidToken(true);
        setLoading(false);
      } catch (err) {
        console.error('Deep link handling error:', err);
        setError('An unexpected error occurred while processing the reset link. Please try again.');
        setLoading(false);
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => {
      subscription.remove();
    };
  }, []);

  const validatePassword = (pwd: string): string | null => {
    if (!pwd.trim()) {
      return 'Please enter a new password';
    }
    if (pwd.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    return null;
  };

  const validateConfirmPassword = (pwd: string, confirm: string): string | null => {
    if (!confirm.trim()) {
      return 'Please confirm your password';
    }
    if (pwd !== confirm) {
      return 'Passwords do not match';
    }
    return null;
  };

  const passwordError = passwordTouched ? validatePassword(password) : null;
  const confirmPasswordError = confirmPasswordTouched
    ? validateConfirmPassword(password, confirmPassword)
    : null;

  const handleSubmit = async () => {
    setError(null);
    setPasswordTouched(true);
    setConfirmPasswordTouched(true);

    const pwdError = validatePassword(password);
    const confirmError = validateConfirmPassword(password, confirmPassword);

    if (pwdError || confirmError) {
      setError(pwdError || confirmError || 'Please check your passwords.');
      return;
    }

    setSubmitting(true);

    try {
      const { error: updateError } = await updatePassword(password.trim());

      if (updateError) {
        setError(updateError.message || 'Failed to update password. Please try again.');
        setSubmitting(false);
        return;
      }

      setSubmitting(false);
      Alert.alert(
        'Password Updated!',
        'Your password has been successfully reset. You can now sign in with your new password.',
        [
          {
            text: 'OK',
            onPress: () => {
              onSuccess();
            },
          },
        ]
      );
    } catch (err: unknown) {
      console.error('Password update error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.');
      setSubmitting(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#1a1a1a' : '#fff',
    },
    scrollContent: {
      flexGrow: 1,
      padding: 20,
      justifyContent: 'center',
    },
    header: {
      marginBottom: 30,
    },
    backButton: {
      marginBottom: 20,
    },
    backButtonText: {
      fontSize: 16,
      color: '#FFC30B',
      fontWeight: '600',
    },
    title: {
      fontSize: 32,
      fontWeight: 'bold',
      color: isDark ? '#fff' : '#000',
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: isDark ? '#999' : '#666',
      marginBottom: 30,
    },
    errorContainer: {
      backgroundColor: '#fee',
      borderLeftWidth: 4,
      borderLeftColor: '#f44336',
      padding: 12,
      borderRadius: 8,
      marginBottom: 20,
    },
    errorText: {
      color: '#c33',
      fontSize: 14,
    },
    inputContainer: {
      marginBottom: 20,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#fff' : '#333',
      marginBottom: 8,
    },
    inputWrapper: {
      position: 'relative',
    },
    input: {
      borderWidth: 2,
      borderColor: passwordError || confirmPasswordError
        ? '#f44336'
        : isDark
        ? '#444'
        : '#ddd',
      borderRadius: 12,
      padding: 14,
      fontSize: 16,
      color: isDark ? '#fff' : '#000',
      backgroundColor: isDark ? '#2a2a2a' : '#fff',
    },
    passwordToggle: {
      position: 'absolute',
      right: 14,
      top: 14,
      padding: 4,
    },
    passwordToggleText: {
      color: isDark ? '#999' : '#666',
      fontSize: 14,
      fontWeight: '600',
    },
    inputError: {
      fontSize: 12,
      color: '#f44336',
      marginTop: 4,
    },
    inputSuccess: {
      fontSize: 12,
      color: '#4CAF50',
      marginTop: 4,
    },
    submitButton: {
      backgroundColor: '#FFC30B',
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginTop: 10,
      borderWidth: 3,
      borderColor: '#000',
    },
    submitButtonDisabled: {
      backgroundColor: '#ccc',
      borderColor: '#999',
    },
    submitButtonText: {
      color: '#000',
      fontSize: 16,
      fontWeight: 'bold',
    },
  });

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={[styles.scrollContent, { alignItems: 'center', justifyContent: 'center' }]}>
          <ActivityIndicator size="large" color="#FFC30B" />
          <Text style={[styles.subtitle, { marginTop: 20 }]}>
            Validating reset link...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Invalid token state
  if (!isValidToken) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Invalid Link</Text>
            <Text style={styles.subtitle}>
              {error || 'This password reset link is invalid or has expired.'}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Main form
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>🔒 Reset Password</Text>
            <Text style={styles.subtitle}>
              Enter your new password below. Make sure it's strong and secure.
            </Text>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>New Password</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Enter new password"
                placeholderTextColor={isDark ? '#666' : '#999'}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setError(null);
                }}
                onBlur={() => setPasswordTouched(true)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!submitting}
              />
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.passwordToggleText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
            {passwordError && <Text style={styles.inputError}>{passwordError}</Text>}
            {!passwordError && passwordTouched && password.length >= 6 && (
              <Text style={styles.inputSuccess}>✓ Password is valid</Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm New Password</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Confirm new password"
                placeholderTextColor={isDark ? '#666' : '#999'}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  setError(null);
                }}
                onBlur={() => setConfirmPasswordTouched(true)}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!submitting}
              />
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Text style={styles.passwordToggleText}>
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
            </View>
            {confirmPasswordError && <Text style={styles.inputError}>{confirmPasswordError}</Text>}
            {!confirmPasswordError &&
              confirmPassword &&
              password &&
              password === confirmPassword && (
                <Text style={styles.inputSuccess}>✓ Passwords match</Text>
              )}
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              (submitting || !!passwordError || !!confirmPasswordError) &&
                styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={submitting || !!passwordError || !!confirmPasswordError}
          >
            {submitting ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.submitButtonText}>Update Password</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}










