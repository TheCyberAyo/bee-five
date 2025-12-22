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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';

interface SignUpPageProps {
  onBack: () => void;
  onNavigateToSignIn: () => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;

export default function SignUpPage({
  onBack,
  onNavigateToSignIn,
}: SignUpPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { signUp } = useAuth();
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

  const validateUsername = (usernameValue: string): string | null => {
    if (!usernameValue.trim()) {
      return 'Please enter a username';
    }
    if (usernameValue.trim().length < 3) {
      return 'Username must be at least 3 characters';
    }
    if (!USERNAME_REGEX.test(usernameValue.trim())) {
      return 'Username can only contain letters, numbers, underscores, and hyphens';
    }
    return null;
  };

  const validatePassword = (passwordValue: string): string | null => {
    if (!passwordValue) {
      return 'Please enter a password';
    }
    if (passwordValue.length < 6) {
      return 'Password must be at least 6 characters';
    }
    return null;
  };

  const validateConfirmPassword = (passwordValue: string, confirmValue: string): string | null => {
    if (!confirmValue) {
      return 'Please confirm your password';
    }
    if (passwordValue !== confirmValue) {
      return 'Passwords do not match';
    }
    return null;
  };

  const emailError = emailTouched ? validateEmail(email) : null;
  const usernameError = usernameTouched ? validateUsername(username) : null;
  const passwordError = passwordTouched ? validatePassword(password) : null;
  const confirmPasswordError = confirmPasswordTouched
    ? validateConfirmPassword(password, confirmPassword)
    : null;

  const handleSubmit = async () => {
    setError(null);
    setEmailTouched(true);
    setUsernameTouched(true);
    setPasswordTouched(true);
    setConfirmPasswordTouched(true);

    const emailValidationError = validateEmail(email);
    const usernameValidationError = validateUsername(username);
    const passwordValidationError = validatePassword(password);
    const confirmPasswordValidationError = validateConfirmPassword(password, confirmPassword);

    if (
      emailValidationError ||
      usernameValidationError ||
      passwordValidationError ||
      confirmPasswordValidationError
    ) {
      setError(
        emailValidationError ||
          usernameValidationError ||
          passwordValidationError ||
          confirmPasswordValidationError ||
          'Please check your inputs'
      );
      return;
    }

    setLoading(true);

    try {
      const { data, error: signUpError } = await signUp(email.trim(), password, username.trim());

      if (signUpError) {
        let errorMessage = signUpError.message || 'Failed to sign up. Please try again.';
        if (
          signUpError.message?.toLowerCase().includes('username') ||
          signUpError.message?.toLowerCase().includes('duplicate') ||
          signUpError.message?.toLowerCase().includes('unique')
        ) {
          errorMessage = 'Username is already taken. Please choose another.';
        } else if (signUpError.message?.includes('User already registered')) {
          errorMessage = 'An account with this email already exists. Please sign in instead.';
        }
        setError(errorMessage);
        setLoading(false);
        return;
      }

      // Success
      setLoading(false);
      Alert.alert(
        'Account Created!',
        'Please check your email to confirm your account before signing in.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back to sign in
              onNavigateToSignIn();
            },
          },
        ]
      );
    } catch (err) {
      console.error('Sign up error:', err);
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
      borderColor: emailError || passwordError || usernameError || confirmPasswordError
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
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back to Sign In</Text>
            </TouchableOpacity>
            <Text style={styles.title}>🐝 Sign Up</Text>
            <Text style={styles.subtitle}>Create an account to save your progress and compete with friends!</Text>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Username</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Choose a username"
                placeholderTextColor={isDark ? '#666' : '#999'}
                value={username}
                onChangeText={(text) => {
                  setUsername(text);
                  setError(null);
                }}
                onBlur={() => setUsernameTouched(true)}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>
            {usernameError && <Text style={styles.inputError}>{usernameError}</Text>}
            {!usernameError && usernameTouched && username.trim().length >= 3 && (
              <Text style={[styles.inputError, { color: '#4CAF50' }]}>✓ Username available</Text>
            )}
          </View>

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
            <Text style={styles.label}>Password</Text>
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
            {!passwordError && passwordTouched && password.length >= 6 && (
              <Text style={[styles.inputError, { color: '#4CAF50' }]}>✓ Password is valid</Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
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
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Text style={styles.passwordToggleText}>{showConfirmPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
            {confirmPasswordError && <Text style={styles.inputError}>{confirmPasswordError}</Text>}
            {!confirmPasswordError &&
              confirmPasswordTouched &&
              confirmPassword &&
              password === confirmPassword && (
                <Text style={[styles.inputError, { color: '#4CAF50' }]}>✓ Passwords match</Text>
              )}
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              (loading ||
                !!emailError ||
                !!passwordError ||
                !!usernameError ||
                !!confirmPasswordError) &&
                styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={
              loading ||
              !!emailError ||
              !!passwordError ||
              !!usernameError ||
              !!confirmPasswordError
            }
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.submitButtonText}>Sign Up</Text>
            )}
          </TouchableOpacity>

          <View style={styles.switchAuth}>
            <Text style={styles.switchAuthText}>
              Already have an account?{' '}
              <Text style={styles.switchAuthLink} onPress={onNavigateToSignIn}>
                Sign In
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

