import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { colors } from '../constants/colors';
import { staffProfiles } from '../mocks/staff-data';
import { useAuth } from '../providers/AuthProvider';
import { useRouter } from 'expo-router';
import { Utensils, Shield, Coffee, ChefHat } from 'lucide-react-native';

const roleMeta = {
  manager: { label: 'Manager', Icon: Shield },
  waiter: { label: 'Waiter', Icon: Coffee },
  kitchen: { label: 'Kitchen', Icon: ChefHat }
} as const;

export default function ProfileSelect() {
  const { selectProfile } = useAuth();
  const router = useRouter();

  const handleSelect = (profile: typeof staffProfiles[number]) => {
    selectProfile(profile);
    router.push('/pin');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.brandIcon}>
        <Utensils size={28} color={colors.surface} />
      </View>
      <Text style={styles.brandTitle}>Saffron & Sage</Text>
      <Text style={styles.brandSubtitle}>Staff Terminal</Text>

      <Text style={styles.sectionLabel}>SELECT YOUR PROFILE</Text>

      <View style={styles.profileList}>
        {staffProfiles.map((profile) => {
          const meta = roleMeta[profile.role];
          const RoleIcon = meta.Icon;
          return (
            <Pressable key={profile.id} style={styles.profileCard} onPress={() => handleSelect(profile)}>
              <View style={[styles.avatar, { backgroundColor: profile.avatarBg }]}>
                <Text style={[styles.avatarText, { color: profile.color }]}>{profile.initials}</Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{profile.name}</Text>
                <View style={styles.roleRow}>
                  <RoleIcon size={14} color={profile.color} />
                  <Text style={[styles.roleText, { color: colors.mutedDark }]}>{meta.label}</Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32
  },
  brandIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textStrong,
    textAlign: 'center'
  },
  brandSubtitle: {
    fontSize: 13,
    color: colors.mutedDark,
    textAlign: 'center',
    marginTop: 4
  },
  sectionLabel: {
    marginTop: 28,
    marginBottom: 12,
    fontSize: 12,
    letterSpacing: 1.2,
    color: colors.mutedDark,
    fontWeight: '700'
  },
  profileList: {
    gap: 12
  },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  avatarText: {
    fontWeight: '700'
  },
  profileInfo: {
    flex: 1
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textStrong
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6
  },
  roleText: {
    fontSize: 13,
    fontWeight: '600'
  }
});
