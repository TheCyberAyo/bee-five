import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';

interface ForgotPasswordPageProps {
  onBack: () => void;
  onNavigateToSignIn: () => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage({
  onBack,
  onNavigateToSignIn,
}: ForgotPasswordPageProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);

  const { resetPasswordForEmail } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const validateEmail = (emailValue: string): string | null => {
    if (!emailValue.trim()) {
      return 'Please enter your email address';
    }
    if (!EMAIL_REGEX.test(emailValue.trim())) {
      return 'Please enter a valid email address';
    }
    return null;
  };

  const emailError = emailTouched ? validateEmail(email) : null;

  const handleSubmit = async () => {
    setError(null);
    setSuccess(false);
    setEmailTouched(true);

    const validationError = validateEmail(email);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const { error: resetError } = await resetPasswordForEmail(email.trim());

      if (resetError) {
        let errorMessage = resetError.message || 'Failed to send password reset email.';
        if (resetError.message?.includes('rate limit')) {
          errorMessage = 'Too many requests. Please wait a few minutes before trying again.';
        } else if (resetError.message?.includes('email')) {
          errorMessage = 'Please check your email address and try again.';
        }
        setError(errorMessage);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
    } catch (err) {
      console.error('Password reset error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.');
      setLoading(false);
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
    successContainer: {
      backgroundColor: '#e8f5e9',
      borderLeftWidth: 4,
      borderLeftColor: '#4CAF50',
      padding: 16,
      borderRadius: 8,
      marginBottom: 20,
    },
    successTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#2e7d32',
      marginBottom: 8,
    },
    successText: {
      color: '#2e7d32',
      fontSize: 14,
      marginBottom: 8,
    },
    emailDisplay: {
      backgroundColor: '#fff',
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#4CAF50',
      marginTop: 8,
    },
    emailDisplayText: {
      color: '#2e7d32',
      fontSize: 14,
      fontWeight: '600',
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
    input: {
      borderWidth: 2,
      borderColor: emailError ? '#f44336' : isDark ? '#444' : '#ddd',
      borderRadius: 12,
      padding: 14,
      fontSize: 16,
      color: isDark ? '#fff' : '#000',
      backgroundColor: isDark ? '#2a2a2a' : '#fff',
    },
    inputError: {
      fontSize: 12,
      color: '#f44336',
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
    secondaryButton: {
      marginTop: 16,
      padding: 12,
      alignItems: 'center',
    },
    secondaryButtonText: {
      color: '#FFC30B',
      fontSize: 14,
      fontWeight: '600',
    },
    navigationLinks: {
      marginTop: 20,
      alignItems: 'center',
    },
    navigationText: {
      color: isDark ? '#999' : '#666',
      fontSize: 14,
    },
    navigationLink: {
      color: '#FFC30B',
      fontWeight: '600',
    },
  });

  if (success) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.successContainer}>
            <Text style={styles.successTitle}>✓ Check your email!</Text>
            <Text style={styles.successText}>
              We've sent a password reset link to:
            </Text>
            <View style={styles.emailDisplay}>
              <Text style={styles.emailDisplayText}>{email}</Text>
            </View>
            <Text style={styles.successText}>
              Please check your inbox and click the link to reset your password. The link will expire in 1 hour.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              setSuccess(false);
              setEmail('');
              setError(null);
              setEmailTouched(false);
            }}
          >
            <Text style={styles.secondaryButtonText}>Send another email</Text>
          </TouchableOpacity>

          <View style={styles.navigationLinks}>
            <Text style={styles.navigationText}>
              Remember your password?{' '}
              <Text style={styles.navigationLink} onPress={onNavigateToSignIn}>
                Sign In
              </Text>
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

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
              <Text style={styles.backButtonText}>← Back to Sign In</Text>
            </TouchableOpacity>
            <Text style={styles.title}>🔑 Forgot Password?</Text>
            <Text style={styles.subtitle}>
              Enter your email address and we'll send you a link to reset your password.
            </Text>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor={isDark ? '#666' : '#999'}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setError(null);
              }}
              onBlur={() => setEmailTouched(true)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
            {emailError && <Text style={styles.inputError}>{emailError}</Text>}
          </View>

          <TouchableOpacity
            style={[styles.submitButton, (loading || !!emailError) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading || !!emailError}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.submitButtonText}>Send Reset Link</Text>
            )}
          </TouchableOpacity>

          <View style={styles.navigationLinks}>
            <Text style={styles.navigationText}>
              Remember your password?{' '}
              <Text style={styles.navigationLink} onPress={onNavigateToSignIn}>
                Sign In
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

