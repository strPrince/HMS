import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Utensils, Phone, Lock } from 'lucide-react-native';
import { colors } from '../constants/colors';
import { RESTAURANT } from '../constants/restaurant';
import { useAuth } from '../providers/AuthProvider';

const IS_WEB = Platform.OS === 'web';
const MAX_CONTAINER_WIDTH = 480;

export default function PhoneLogin() {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn } = useAuth();

  const handleLogin = async () => {
    // Validation
    if (!phone.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    if (phone.length !== 10) {
      Alert.alert('Error', 'Phone number must be 10 digits');
      return;
    }

    if (!pin.trim()) {
      Alert.alert('Error', 'Please enter your PIN');
      return;
    }

    if (pin.length < 4) {
      Alert.alert('Error', 'PIN must be at least 4 digits');
      return;
    }

    setLoading(true);

    try {
      const success = await signIn(phone, pin);

      if (success) {
        // Navigate to root – index.tsx will redirect based on role
        router.replace('/');
      }
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Invalid phone number or PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: IS_WEB ? 60 : insets.top + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Header */}
        <View style={styles.brandSection}>
          <View style={styles.brandIcon}>
            <Utensils size={32} color={colors.surface} />
          </View>
          <Text style={styles.brandTitle}>{RESTAURANT.name}</Text>
          <Text style={styles.brandSubtitle}>Staff Login</Text>
        </View>

        {/* Login Form */}
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Sign In</Text>
          <Text style={styles.formSubtitle}>
            Enter your phone number and PIN to continue
          </Text>

          {/* Phone Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <View style={styles.inputWrapper}>
              <Phone size={20} color={colors.muted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter 10-digit phone number"
                placeholderTextColor={colors.muted}
                value={phone}
                onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, '').slice(0, 10))}
                keyboardType="phone-pad"
                maxLength={10}
                editable={!loading}
              />
            </View>
          </View>

          {/* PIN Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>PIN</Text>
            <View style={styles.inputWrapper}>
              <Lock size={20} color={colors.muted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your PIN"
                placeholderTextColor={colors.muted}
                value={pin}
                onChangeText={(text) => setPin(text.replace(/[^0-9]/g, '').slice(0, 6))}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={6}
                editable={!loading}
              />
            </View>
          </View>

          {/* Login Button */}
          <Pressable
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </Pressable>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          {RESTAURANT.footerText}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    maxWidth: IS_WEB ? MAX_CONTAINER_WIDTH : undefined,
    width: '100%',
    alignSelf: IS_WEB ? 'center' : undefined,
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  brandIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  brandSubtitle: {
    fontSize: 16,
    color: colors.muted,
  },
  formContainer: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: colors.text,
  },
  loginButton: {
    backgroundColor: colors.primary,
    height: 54,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.muted,
    marginTop: 32,
  },
});
