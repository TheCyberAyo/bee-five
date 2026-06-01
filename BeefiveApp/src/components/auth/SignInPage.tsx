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
}

const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;

export default function SignInPage({
  onBack,
  onNavigateToSignUp,
}: SignInPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { signIn } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const validateUsername = (value: string): string | null => {
    if (!value.trim()) {
      return 'Please enter your username';
    }
    if (value.trim().length < 3) {
      return 'Username must be at least 3 characters';
    }
    if (!USERNAME_REGEX.test(value.trim())) {
      return 'Username can only contain letters, numbers, underscores, and hyphens';
    }
    return null;
  };

  const validatePassword = (passwordValue: string): string | null => {
    if (!passwordValue) {
      return 'Please enter your password';
    }
    return null;
  };

  const usernameError = usernameTouched ? validateUsername(username) : null;
  const passwordError = passwordTouched ? validatePassword(password) : null;

  const handleSubmit = async () => {
    setError(null);
    setUsernameTouched(true);
    setPasswordTouched(true);

    const uErr = validateUsername(username);
    const pErr = validatePassword(password);

    if (uErr || pErr) {
      setError(uErr || pErr || 'Please check your inputs');
      return;
    }

    setLoading(true);

    try {
      const { error: signInError } = await signIn(username.trim(), password);

      if (signInError) {
        const m = signInError.message?.toLowerCase() ?? '';
        let errorMessage =
          signInError.message || 'Failed to sign in. Please try again.';
        if (
          m.includes('invalid login') ||
          m.includes('invalid_credentials') ||
          m.includes('invalid grant')
        ) {
          errorMessage = 'Invalid username or password. Please try again.';
        }
        setError(errorMessage);
        setLoading(false);
        return;
      }

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
      borderColor: usernameError || passwordError ? '#f44336' : isDark ? '#444' : '#ddd',
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
    backButtonText: {
      fontSize: 16,
      color: '#FFC30B',
      fontWeight: '600',
      marginBottom: 16,
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
          <TouchableOpacity onPress={onBack}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.header}>
            <Text style={styles.title}>🐝 Sign In</Text>
            <Text style={styles.subtitle}>Sign in with your BeeFive username.</Text>
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
                placeholder="your_username"
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
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              (loading || !!usernameError || !!passwordError) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={loading || !!usernameError || !!passwordError}
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
