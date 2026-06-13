import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { AtSign, Save, ScrollText, UserRound } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { SegmentedControl } from '../../src/components/ui/SegmentedControl';
import { TextField } from '../../src/components/ui/TextField';
import { updateMyProfile } from '../../src/lib/actions/endpoints';
import { useMe } from '../../src/features/me/useMe';
import { ProfileFlowFrame } from '../../src/features/profile/components/ProfileFlowFrame';
import { colors, spacing } from '../../src/theme/tokens';

const specialtyOptions = [
  { label: 'Knowledge', value: 'knowledge' },
  { label: 'Sports', value: 'sports' },
  { label: 'Finance', value: 'finance' },
];

export default function EditProfileScreen() {
  const router = useRouter();
  const { data, error, loading, refresh } = useMe();
  const [displayName, setDisplayName] = useState(data.profile.displayName);
  const [username, setUsername] = useState(data.user?.username ?? '');
  const [bio, setBio] = useState(data.user?.bio ?? '');
  const [specialty, setSpecialty] = useState('knowledge');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const primaryCategory = data.profile.juryCategories[0] ?? 'knowledge';
  const validationError = useMemo(
    () => validateProfileForm(displayName, username, bio),
    [bio, displayName, username],
  );
  const hasEdited = displayName !== data.profile.displayName ||
    username !== (data.user?.username ?? '') ||
    bio !== (data.user?.bio ?? '') ||
    specialty !== primaryCategory;
  const visibleValidationError = hasEdited ? validationError : null;
  const canSave = data.source === 'server' &&
    data.capabilities.canUpdateProfile &&
    !loading &&
    !saving &&
    !validationError;

  useEffect(() => {
    setDisplayName(data.profile.displayName);
    setUsername(data.user?.username ?? '');
    setBio(data.user?.bio ?? '');
    setSpecialty(primaryCategory);
  }, [data.profile.displayName, data.user?.bio, data.user?.username, primaryCategory]);

  return (
    <ProfileFlowFrame
      eyebrow="Edit profile"
      onBack={() => router.back()}
      title="Edit profile."
      subtitle="Profile changes affect how other players review your DARE history and trust."
    >
      {data.source === 'mock' && !error ? (
        <InlineAlert
          tone="info"
          title={loading ? 'Syncing profile' : 'Preview data'}
          message={loading ? 'Profile details are loading.' : 'Live profile details appear after sign-in and sync.'}
        />
      ) : null}

      {error ? (
        <InlineAlert
          tone="danger"
          title="Profile sync failed"
          message={error}
        />
      ) : null}

      {saveError ? (
        <InlineAlert
          tone="danger"
          title="Profile save failed"
          message={saveError}
        />
      ) : null}

      <View style={styles.form}>
        <TextField
          error={visibleValidationError?.field === 'displayName' ? visibleValidationError.message : undefined}
          label="Display name"
          leftIcon={<UserRound color={colors.textMuted} size={16} />}
          onChangeText={setDisplayName}
          placeholder="Kade"
          value={displayName}
        />
        <TextField
          autoCapitalize="none"
          error={visibleValidationError?.field === 'username' ? visibleValidationError.message : undefined}
          label="Username"
          leftIcon={<AtSign color={colors.textMuted} size={16} />}
          onChangeText={setUsername}
          placeholder="@kade"
          value={username}
        />
        <TextField
          error={visibleValidationError?.field === 'bio' ? visibleValidationError.message : undefined}
          label="Bio"
          leftIcon={<ScrollText color={colors.textMuted} size={16} />}
          multiline
          onChangeText={setBio}
          placeholder="Sharp challenges, clean rules, fair disputes."
          textAlignVertical="top"
          style={styles.bio}
          value={bio}
        />
        <SegmentedControl
          accessibilityLabel="Primary specialty"
          onChange={setSpecialty}
          options={specialtyOptions}
          value={specialty}
        />
      </View>
      <InlineAlert
        tone="info"
        title="Public profile"
        message="Display name, bio, specialties, and trust history can be visible before players accept a DARE."
      />
      <ActionButton
        accessibilityLabel="Save profile"
        disabled={!canSave}
        icon={<Save color={colors.text} size={17} />}
        label={saving ? 'Saving' : 'Save profile'}
        onPress={() => {
          void handleSaveProfile();
        }}
      />
    </ProfileFlowFrame>
  );

  async function handleSaveProfile() {
    const nextError = validateProfileForm(displayName, username, bio);
    if (nextError) {
      setSaveError(nextError.message);
      return;
    }

    setSaving(true);
    setSaveError(null);

    const result = await updateMyProfile({
      bio: bio.trim() ? bio.trim() : null,
      displayName: displayName.trim(),
      username: normalizeUsername(username),
    });

    if (!result.ok) {
      setSaveError(result.error.message);
      setSaving(false);
      return;
    }

    await refresh();
    setSaving(false);
    router.back();
  }
}

function normalizeUsername(value: string) {
  return value.trim().replace(/^@+/, '');
}

function validateProfileForm(displayName: string, username: string, bio: string) {
  const trimmedDisplayName = displayName.trim();
  const normalizedUsername = normalizeUsername(username);

  if (trimmedDisplayName.length < 1 || trimmedDisplayName.length > 80) {
    return {
      field: 'displayName' as const,
      message: 'Display name must be 1 to 80 characters.',
    };
  }

  if (normalizedUsername.length < 3 || normalizedUsername.length > 30) {
    return {
      field: 'username' as const,
      message: 'Username must be 3 to 30 characters.',
    };
  }

  if (!/^[A-Za-z0-9_]+$/.test(normalizedUsername)) {
    return {
      field: 'username' as const,
      message: 'Username can use letters, numbers, and underscores only.',
    };
  }

  if (bio.length > 300) {
    return {
      field: 'bio' as const,
      message: 'Bio must be 300 characters or fewer.',
    };
  }

  return null;
}

const styles = StyleSheet.create({
  form: {
    gap: spacing[12],
  },
  bio: {
    minHeight: 110,
  },
});
