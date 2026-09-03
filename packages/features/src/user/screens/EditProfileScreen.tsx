import { useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import {
  BIOLOGICAL_SEXES,
  VISIBILITIES,
  type BiologicalSex,
  type MyProfile,
  type Physiology,
  type Visibility,
} from '@runtrack/core';
import {
  Avatar,
  Button,
  Card,
  FormField,
  Icon,
  Input,
  Pressable,
  ScreenHeader,
  Select,
  Skeleton,
  Text,
  TextArea,
  iconSize,
  space,
  useTheme,
  useToast,
} from '@runtrack/ui';
import { validateDisplayName, validateHandle } from '../../auth/validation';
import { describeError, translate } from '../../i18n';
import { useMe } from '../hooks/useProfile';
import {
  useChangeAccountScope,
  useChangeAvatar,
  useChangeHandle,
  usePhysiology,
  useUpdatePhysiology,
  useUpdateProfile,
  useUploadAvatar,
} from '../hooks/useProfileEdition';
import { useRuntime } from '../../runtime/RuntimeProvider';
import {
  toOptionalNumber,
  validateBio,
  validateBirthDate,
  validateHeight,
  validateWeight,
} from '../profileValidation';

/**
 * Editing one's own profile — the photo, then who one is, then the body.
 *
 * The form asks its questions **inside** the fields rather than above them, so
 * the screen reads as a list of questions instead of a wall of labels. The
 * labels are still there for a screen reader (`labelHidden`), because a
 * placeholder disappears the moment someone starts typing and cannot be the
 * only thing that says what a field is.
 *
 * Three groups, three endpoints, and only what changed is sent: renaming a
 * handle is a uniqueness check on the server, and firing it on every save
 * would fail against one's own name. Physiology is the only health data in the
 * application (§11) — its own request, and the reason it is asked for written
 * next to it.
 */
export interface EditProfileScreenProps {
  onSaved: () => void;
  onBack: () => void;
}

export function EditProfileScreen({ onSaved, onBack }: EditProfileScreenProps): ReactNode {
  const theme = useTheme();
  const me = useMe();
  const physiology = usePhysiology();

  if (me.isPending || physiology.isPending) {
    return (
      <View
        style={{ flex: 1, backgroundColor: theme.colours.canvas, padding: space.md, gap: space.sm }}
        testID="edit-profile-loading"
      >
        <Skeleton width={96} height={96} rounded="full" />
        <Skeleton width="60%" height={theme.typography.title.lineHeight} />
        <Skeleton width="100%" height={theme.typography.body.lineHeight} />
      </View>
    );
  }

  if (me.isError || physiology.isError) {
    const described = describeError(me.error ?? physiology.error);
    return (
      <View style={{ flex: 1, backgroundColor: theme.colours.canvas, padding: space.md }}>
        <Card tone="alt" testID="edit-profile-error">
          <Text tone="danger">{described.title}</Text>
        </Card>
      </View>
    );
  }

  // Mounted with the loaded values: a form whose initial state is filled in by
  // an effect flickers, and loses whatever was typed while it was loading.
  return (
    <ProfileForm
      profile={me.data}
      physiology={physiology.data}
      onSaved={onSaved}
      onBack={onBack}
    />
  );
}

function ProfileForm({
  profile,
  physiology,
  onSaved,
  onBack,
}: {
  profile: MyProfile;
  physiology: Physiology;
  onSaved: () => void;
  onBack: () => void;
}): ReactNode {
  const theme = useTheme();
  const toast = useToast();

  const updateProfile = useUpdateProfile();
  const changeHandle = useChangeHandle();
  const changeAvatar = useChangeAvatar();
  const uploadAvatar = useUploadAvatar();
  const picker = useRuntime().imagePicker;
  const changeScope = useChangeAccountScope();
  const updatePhysiology = useUpdatePhysiology();

  const [displayName, setDisplayName] = useState(profile.displayName);
  const [handle, setHandle] = useState(profile.handle);
  const [bio, setBio] = useState(profile.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? '');
  const [scope, setScope] = useState<Visibility>(profile.accountScope);
  const [birthDate, setBirthDate] = useState(physiology.birthDate ?? '');
  const [sex, setSex] = useState<BiologicalSex>(physiology.biologicalSex);
  const [weight, setWeight] = useState(numberField(physiology.weightKilograms));
  const [height, setHeight] = useState(numberField(physiology.heightCentimetres));

  const [submitted, setSubmitted] = useState(false);
  const [failure, setFailure] = useState<unknown>(undefined);
  const [photoFailure, setPhotoFailure] = useState<unknown>(undefined);

  const errors = {
    displayName: validateDisplayName(displayName),
    handle: validateHandle(handle),
    bio: validateBio(bio),
    birthDate: validateBirthDate(birthDate),
    weight: validateWeight(weight),
    height: validateHeight(height),
  };
  const invalid = Object.values(errors).some((error) => error !== undefined);

  /** Shown once the runner has tried to save, not while they are still typing. */
  const messageFor = (key: keyof typeof errors): string | undefined => {
    const error = errors[key];
    return submitted && error !== undefined ? translate(error) : undefined;
  };

  const saving =
    updateProfile.isPending ||
    changeHandle.isPending ||
    changeScope.isPending ||
    updatePhysiology.isPending;

  const physiologyChanged = (): boolean =>
    birthDate !== (physiology.birthDate ?? '') ||
    sex !== physiology.biologicalSex ||
    weight !== numberField(physiology.weightKilograms) ||
    height !== numberField(physiology.heightCentimetres);

  /**
   * §15 : jamais de `catch` muet. Une galerie refermée sans choisir n'est pas
   * une erreur — il n'y a simplement pas de photo — mais un envoi qui échoue
   * se dit, sous l'avatar, là où on regardait.
   */
  const choosePhoto = async (): Promise<void> => {
    if (picker === undefined) return;
    setPhotoFailure(undefined);

    const chosen = await picker.pick();
    if (chosen === undefined) return;

    try {
      const saved = await uploadAvatar.mutateAsync(chosen);
      setAvatarUrl(saved.avatarUrl ?? '');
    } catch (error) {
      setPhotoFailure(error);
    }
  };

  const removePhoto = async (): Promise<void> => {
    setPhotoFailure(undefined);
    try {
      await changeAvatar.mutateAsync(undefined);
      setAvatarUrl('');
    } catch (error) {
      setPhotoFailure(error);
    }
  };

  const save = async (): Promise<void> => {
    setSubmitted(true);
    if (invalid) return;
    setFailure(undefined);

    try {
      if (displayName !== profile.displayName || bio !== (profile.bio ?? '')) {
        await updateProfile.mutateAsync({ displayName: displayName.trim(), bio: bio.trim() });
      }
      if (handle.trim() !== profile.handle) {
        await changeHandle.mutateAsync(handle.trim());
      }
      if (scope !== profile.accountScope) {
        await changeScope.mutateAsync(scope);
      }
      if (physiologyChanged()) {
        await updatePhysiology.mutateAsync({
          birthDate: birthDate.trim() === '' ? undefined : birthDate.trim(),
          biologicalSex: sex,
          weightKilograms: toOptionalNumber(weight),
          heightCentimetres: toOptionalNumber(height),
        });
      }
    } catch (error) {
      // §15: never a silent catch. The code decides the sentence, and the
      // screen stays open on what was typed.
      setFailure(error);
      return;
    }

    toast.show(translate('profile.saved'), 'success');
    onSaved();
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colours.canvas }} testID="edit-profile-screen">
      <ScreenHeader
        title={translate('profile.editTitle')}
        onBack={onBack}
        backLabel={translate('common.back')}
        testID="edit-profile-header"
      />

      <ScrollView
        contentContainerStyle={{
          padding: space.md,
          // Le bouton ne finit ni collé au bord, ni sous le geste « accueil ».
          paddingBottom: space['3xl'],
          gap: space.md,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignItems: 'center', gap: space.xxs, marginBottom: space.sm }}>
          <Pressable
            onPress={() => {
              void choosePhoto();
            }}
            accessibilityRole="button"
            accessibilityLabel={translate('profile.photoChange')}
            enforceTouchTarget={false}
            testID="edit-avatar"
          >
            <View>
              <Avatar
                name={displayName}
                uri={avatarUrl.trim() === '' ? undefined : avatarUrl.trim()}
                size="xl"
              />
              {/* Le crayon dit que la photo se change ; le bouton porte le mot. */}
              <View
                style={{
                  position: 'absolute',
                  right: -space.xxs,
                  bottom: -space.xxs,
                  padding: space.xs,
                  borderRadius: theme.radius.full,
                  backgroundColor: theme.colours.brand.fill,
                  borderWidth: theme.stroke.thick,
                  borderColor: theme.colours.canvas,
                }}
              >
                <Icon name="edit" size={iconSize.sm} colour={theme.colours.brand.onFill} />
              </View>
            </View>
          </Pressable>

          <Text variant="section">{profile.displayName}</Text>
          <Text tone="muted">{profile.email}</Text>

          {/*
            La photo part dès qu'elle est choisie : c'est son propre endpoint,
            et faire attendre « Enregistrer » à un fichier déjà sélectionné ne
            servirait qu'à le perdre si l'écran est quitté.
          */}
          {uploadAvatar.isPending && (
            <Text variant="caption" tone="muted" testID="edit-avatar-uploading">
              {translate('profile.photoUploading')}
            </Text>
          )}
          {photoFailure !== undefined && (
            <Text variant="caption" tone="danger" testID="edit-avatar-error">
              {/*
                Le détail vient avec : « Pas de réseau » sur un téléversement
                peut aussi bien dire que le fichier n'a pas pu être lu, et sans
                la phrase du dessous il n'y a rien à quoi se raccrocher.
              */}
              {[describeError(photoFailure).title, describeError(photoFailure).detail]
                .filter((part) => part !== undefined)
                .join(' — ')}
            </Text>
          )}
          {avatarUrl !== '' && (
            <Button
              label={translate('profile.photoRemove')}
              variant="ghost"
              size="sm"
              loading={changeAvatar.isPending}
              onPress={() => {
                void removePhoto();
              }}
              testID="edit-avatar-remove"
            />
          )}
        </View>

        <FormField
          label={translate('profile.displayName')}
          error={messageFor('displayName')}
          labelHidden
          required
        >
          {(field) => (
            <Input
              field={field}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder={translate('profile.displayNameAsk')}
              autoComplete="name"
              testID="edit-display-name"
            />
          )}
        </FormField>

        <FormField label={translate('profile.handle')} error={messageFor('handle')} labelHidden required>
          {(field) => (
            <Input
              field={field}
              value={handle}
              onChangeText={setHandle}
              placeholder={translate('profile.handleAsk')}
              autoComplete="username"
              testID="edit-handle"
            />
          )}
        </FormField>

        <FormField label={translate('profile.bio')} error={messageFor('bio')} labelHidden>
          {(field) => (
            <TextArea
              field={field}
              value={bio}
              onChangeText={setBio}
              placeholder={translate('profile.bioPlaceholder')}
              minimumLines={3}
              testID="edit-bio"
            />
          )}
        </FormField>

        <FormField label={translate('profile.biologicalSex')} labelHidden>
          {(field) => (
            <Select
              field={field}
              defaultValue="UNSPECIFIED"
              value={sex}
              onValueChange={setSex}
              placeholder={translate('profile.biologicalSexAsk')}
              options={BIOLOGICAL_SEXES.map((candidate) => ({
                value: candidate,
                label: translate(`sex.${candidate}`),
              }))}
              testID="edit-sex"
            />
          )}
        </FormField>

        <FormField label={translate('profile.birthDate')} error={messageFor('birthDate')} labelHidden>
          {(field) => (
            <Input
              field={field}
              value={birthDate}
              onChangeText={setBirthDate}
              placeholder={translate('profile.birthDateAsk')}
              icon="calendar"
              testID="edit-birth-date"
            />
          )}
        </FormField>

        <FormField label={translate('profile.weight')} error={messageFor('weight')} labelHidden>
          {(field) => (
            <Input
              field={field}
              value={weight}
              onChangeText={setWeight}
              placeholder={translate('profile.weightAsk')}
              keyboardType="decimal-pad"
              testID="edit-weight"
            />
          )}
        </FormField>

        <FormField label={translate('profile.height')} error={messageFor('height')} labelHidden>
          {(field) => (
            <Input
              field={field}
              value={height}
              onChangeText={setHeight}
              placeholder={translate('profile.heightAsk')}
              keyboardType="decimal-pad"
              testID="edit-height"
            />
          )}
        </FormField>

        <FormField label={translate('profile.accountScope')} labelHidden>
          {(field) => (
            <Select
              field={field}
              defaultValue="FOLLOWERS"
              value={scope}
              onValueChange={setScope}
              placeholder={translate('profile.accountScope')}
              options={VISIBILITIES.map((candidate) => ({
                value: candidate,
                label: `${translate('profile.accountScope')} — ${translate(`visibility.${candidate}`)}`,
              }))}
              testID="edit-scope"
            />
          )}
        </FormField>

        {/* §11: health data. Saying what it is for is part of asking for it. */}
        <Text variant="caption" tone="muted">
          {translate('profile.physiologyWhy')}
        </Text>

        {failure !== undefined && (
          <Card tone="alt" testID="edit-profile-failure">
            <Text tone="danger">{describeError(failure).title}</Text>
          </Card>
        )}

        <Button
          label={translate('profile.save')}
          loading={saving}
          fullWidth
          onPress={() => {
            void save();
          }}
          testID="edit-profile-save"
        />
      </ScrollView>

    </View>
  );
}

/** A number the runner can edit as text — and an absent one as an empty field. */
function numberField(value: number | undefined): string {
  return value === undefined ? '' : String(value);
}
