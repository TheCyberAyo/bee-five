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

interface SignInPageProps {
  onBack: () => void;
  onNavigateToSignUp: () => void;
  onNavigateToForgotPassword: () => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignInPage({
  onBack,
  onNavigateToSignUp,
  onNavigateToForgotPassword,
}: SignInPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { signIn } = useAuth();
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

  const validatePassword = (passwordValue: string): string | null => {
    if (!passwordValue) {
      return 'Please enter your password';
    }
    return null;
  };

  const emailError = emailTouched ? validateEmail(email) : null;
  const passwordError = passwordTouched ? validatePassword(password) : null;

  const handleSubmit = async () => {
    setError(null);
    setEmailTouched(true);
    setPasswordTouched(true);

    const emailValidationError = validateEmail(email);
    const passwordValidationError = validatePassword(password);

    if (emailValidationError || passwordValidationError) {
      setError(emailValidationError || passwordValidationError || 'Please check your inputs');
      return;
    }

    setLoading(true);

    try {
      const { error: signInError } = await signIn(email.trim(), password);

      if (signInError) {
        let errorMessage = signInError.message || 'Failed to sign in. Please try again.';
        if (signInError.message?.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please try again.';
        } else if (signInError.message?.includes('Email not confirmed')) {
          errorMessage = 'Please check your email and confirm your account before signing in.';
        }
        setError(errorMessage);
        setLoading(false);
        return;
      }

      // Success - user will be automatically redirected to menu by parent component
      setLoading(false);
    } catch (err) {
      console.error('Sign in error:', err);
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
    },
    header: {
      marginTop: 20,
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
      borderColor: emailError || passwordError ? '#f44336' : (isDark ? '#444' : '#ddd'),
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
    forgotPasswordLink: {
      alignSelf: 'flex-end',
      marginTop: -10,
      marginBottom: 20,
    },
    forgotPasswordText: {
      color: '#FFC30B',
      fontSize: 14,
      fontWeight: '600',
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
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 20,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: isDark ? '#444' : '#ddd',
    },
    dividerText: {
      marginHorizontal: 12,
      color: isDark ? '#999' : '#666',
      fontSize: 14,
    },
    switchAuth: {
      marginTop: 20,
      alignItems: 'center',
    },
    switchAuthText: {
      color: isDark ? '#999' : '#666',
      fontSize: 14,
    },
    switchAuthLink: {
      color: '#FFC30B',
      fontWeight: '600',
    },
  });

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
            <Text style={styles.title}>🐝 Sign In</Text>
            <Text style={styles.subtitle}>Welcome back! Sign in to continue playing.</Text>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrapper}>
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
            </View>
            {emailError && <Text style={styles.inputError}>{emailError}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={styles.label}>Password</Text>
              <TouchableOpacity onPress={onNavigateToForgotPassword} style={styles.forgotPasswordLink}>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
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
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.passwordToggleText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
            {passwordError && <Text style={styles.inputError}>{passwordError}</Text>}
          </View>

          <TouchableOpacity
            style={[styles.submitButton, (loading || !!emailError || !!passwordError) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading || !!emailError || !!passwordError}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.submitButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.switchAuth}>
            <Text style={styles.switchAuthText}>
              Don't have an account?{' '}
              <Text style={styles.switchAuthLink} onPress={onNavigateToSignUp}>
                Sign Up
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

