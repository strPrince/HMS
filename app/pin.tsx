import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../constants/colors';
import { useAuth } from '../providers/AuthProvider';
import { Utensils, ArrowLeft, X } from 'lucide-react-native';

const PIN_LENGTH = 4;

export default function PinScreen() {
  const { selectedProfile, signInWithPin, clearProfile } = useAuth();
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!selectedProfile) {
      router.replace('/profile-select');
    }
  }, [router, selectedProfile]);

  const dots = useMemo(() => Array.from({ length: PIN_LENGTH }), []);

  const handleDigit = (digit: string) => {
    if (pin.length >= PIN_LENGTH) return;
    const next = `${pin}${digit}`;
    setPin(next);
    setError('');
    if (next.length === PIN_LENGTH) {
      const ok = signInWithPin(next);
      if (ok) {
        const target =
          selectedProfile?.role === 'manager'
            ? '/(tabs)/dashboard'
            : selectedProfile?.role === 'kitchen'
            ? '/(tabs)/kitchen'
            : '/(tabs)/tables';
        router.replace(target);
      } else {
        setError('Incorrect PIN');
        setPin('');
      }
    }
  };

  const handleBackspace = () => {
    if (pin.length === 0) return;
    setPin(pin.slice(0, -1));
    setError('');
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  const handleChangeUser = () => {
    clearProfile();
    router.replace('/profile-select');
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.changeUser} onPress={handleChangeUser}>
        <ArrowLeft size={16} color={colors.primary} />
        <Text style={styles.changeUserText}>Change user</Text>
      </Pressable>

      <View style={styles.brandIcon}>
        <Utensils size={26} color={colors.surface} />
      </View>
      <Text style={styles.title}>Welcome Back</Text>
      <Text style={styles.subtitle}>Enter your PIN to start ordering</Text>

      <View style={styles.dotsRow}>
        {dots.map((_, index) => (
          <View
            key={`dot-${index}`}
            style={[
              styles.dot,
              index < pin.length && styles.dotFilled
            ]}
          />
        ))}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.keypad}>
        {['1','2','3','4','5','6','7','8','9'].map((digit) => (
          <Pressable key={digit} style={styles.key} onPress={() => handleDigit(digit)}>
            <Text style={styles.keyText}>{digit}</Text>
          </Pressable>
        ))}
        <Pressable style={[styles.key, styles.clearKey]} onPress={handleClear}>
          <X size={18} color={colors.danger} />
        </Pressable>
        <Pressable style={styles.key} onPress={() => handleDigit('0')}>
          <Text style={styles.keyText}>0</Text>
        </Pressable>
        <Pressable style={styles.key} onPress={handleBackspace}>
          <ArrowLeft size={18} color={colors.mutedDark} />
        </Pressable>
      </View>

      <Pressable>
        <Text style={styles.forgotText}>Forgot PIN?</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 28,
    paddingTop: 40
  },
  changeUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 18
  },
  changeUserText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary
  },
  brandIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 18
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textStrong,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 13,
    color: colors.mutedDark,
    textAlign: 'center',
    marginTop: 6
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 22,
    marginBottom: 12
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  dotFilled: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  errorText: {
    textAlign: 'center',
    color: colors.danger,
    fontSize: 12,
    marginBottom: 8
  },
  keypad: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16
  },
  key: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center'
  },
  keyText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textStrong
  },
  clearKey: {
    backgroundColor: '#FFE8E5'
  },
  forgotText: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary
  }
});
