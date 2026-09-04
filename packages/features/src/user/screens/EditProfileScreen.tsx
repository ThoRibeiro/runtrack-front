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
  SectionHeader,
  Select,
  Skeleton,
  Slider,
  Text,
  TextArea,
  iconSize,
  space,
  useTheme,
  useToast,
} from '@runtrack/ui';
import { validateDisplayName, validateHandle } from '../../auth/validation';
import { DateField } from '../components/DateField';
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
 * Every field is labelled, above it and in plain sight. The form used to ask
 * its questions *inside* the fields instead, which reads well while they are
 * empty and not at all once they are filled: three rounded boxes holding
 * « Jean », « jean » and « Hello moi c'est jean » say nothing about which one is
 * the name. A placeholder disappears the moment someone types, so it can never
 * be the only thing that says what a field is.
 *
 * The sections above them — who I am, my body, who can see me — group what is
 * saved together, which is also what is *sent* together: three endpoints, three
 * groups.
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
    <ProfileForm profile={me.data} physiology={physiology.data} onSaved={onSaved} onBack={onBack} />
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

        <SectionHeader title={translate('profile.identity')} />

        <FormField
          label={translate('profile.displayName')}
          error={messageFor('displayName')}
          required
        >
          {(field) => (
            <Input
              field={field}
              value={displayName}
              onChangeText={setDisplayName}
              autoComplete="name"
              testID="edit-display-name"
            />
          )}
        </FormField>

        <FormField label={translate('profile.handle')} error={messageFor('handle')} required>
          {(field) => (
            <Input
              field={field}
              value={handle}
              onChangeText={setHandle}
              autoComplete="username"
              testID="edit-handle"
            />
          )}
        </FormField>

        <FormField label={translate('profile.bio')} error={messageFor('bio')}>
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

        <SectionHeader title={translate('profile.body')} />
        {/* §11: health data. Saying what it is for is part of asking for it. */}
        <Text variant="caption" tone="muted">
          {translate('profile.physiologyWhy')}
        </Text>

        <FormField label={translate('profile.biologicalSex')}>
          {(field) => (
            <Select
              field={field}
              defaultValue="UNSPECIFIED"
              value={sex}
              onValueChange={setSex}
              placeholder={translate('profile.notSet')}
              options={BIOLOGICAL_SEXES.map((candidate) => ({
                value: candidate,
                label: translate(`sex.${candidate}`),
              }))}
              testID="edit-sex"
            />
          )}
        </FormField>

        <DateField
          label={translate('profile.birthDate')}
          value={birthDate}
          onChange={setBirthDate}
          placeholder={translate('profile.birthDatePick')}
          error={messageFor('birthDate')}
          testID="edit-birth-date"
        />

        <Measure
          label={translate('profile.weight')}
          value={weight}
          onChange={setWeight}
          minimum={WEIGHT_RANGE.minimum}
          maximum={WEIGHT_RANGE.maximum}
          fallback={WEIGHT_RANGE.fallback}
          unit="profile.weightValue"
          error={messageFor('weight')}
          testID="edit-weight"
        />

        <Measure
          label={translate('profile.height')}
          value={height}
          onChange={setHeight}
          minimum={HEIGHT_RANGE.minimum}
          maximum={HEIGHT_RANGE.maximum}
          fallback={HEIGHT_RANGE.fallback}
          unit="profile.heightValue"
          error={messageFor('height')}
          testID="edit-height"
        />

        <SectionHeader title={translate('profile.privacy')} />

        <FormField label={translate('profile.accountScope')}>
          {(field) => (
            <Select
              field={field}
              defaultValue="FOLLOWERS"
              value={scope}
              onValueChange={setScope}
              // La feuille porte déjà la question en titre : la reprendre sur
              // chacune des trois réponses la faisait lire quatre fois.
              options={VISIBILITIES.map((candidate) => ({
                value: candidate,
                label: translate(`visibility.${candidate}`),
              }))}
              testID="edit-scope"
            />
          )}
        </FormField>

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

/**
 * Les bornes, et la valeur d'où part quelqu'un qui n'a rien renseigné.
 *
 * Elles sont plus larges que les plages plausibles parce qu'elles ne valident
 * rien : `validateWeight` reste seul juge, et une borne de curseur qui refuse
 * ce que le formulaire accepte est une impasse silencieuse.
 */
const WEIGHT_RANGE = { minimum: 30, maximum: 200, fallback: 70 } as const;
const HEIGHT_RANGE = { minimum: 100, maximum: 230, fallback: 175 } as const;

/**
 * Un poids, une taille : une valeur qu'on fait glisser plutôt qu'on ne tape.
 *
 * Le clavier numérique demandait de savoir son poids au dixième près pour un
 * champ dont personne ne connaît la précision attendue. Un curseur donne
 * l'ordre de grandeur d'un geste, et laisse la valeur exacte lisible à côté.
 *
 * « Non renseigné » est un état, pas un zéro : la physiologie est facultative
 * (§11), et un curseur posé à 70 kg sur un profil vide aurait déclaré un poids
 * que personne n'a donné. Il faut y toucher pour que la valeur existe, et
 * « Effacer » la fait repartir.
 */
function Measure({
  label,
  value,
  onChange,
  minimum,
  maximum,
  fallback,
  unit,
  error,
  testID,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  minimum: number;
  maximum: number;
  fallback: number;
  unit: 'profile.weightValue' | 'profile.heightValue';
  error: string | undefined;
  testID: string;
}): ReactNode {
  const numeric = Number(value.replace(',', '.'));
  const set = value.trim() !== '' && Number.isFinite(numeric);
  const shown = set ? translate(unit, { value: numeric }) : translate('profile.notSet');

  return (
    <FormField label={label} error={error} labelHidden>
      {(field) => (
        <View style={{ gap: space.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.sm }}>
            <Text variant="caption" tone="muted" decorative style={{ flex: 1 }}>
              {label}
            </Text>
            <Text variant="bodyStrong" decorative testID={`${testID}-value`}>
              {shown}
            </Text>
            {set && (
              <Button
                label={translate('profile.clear')}
                variant="ghost"
                size="sm"
                onPress={() => {
                  onChange('');
                }}
                testID={`${testID}-clear`}
              />
            )}
          </View>
          <Slider
            field={field}
            minimum={minimum}
            maximum={maximum}
            value={set ? numeric : fallback}
            defaultValue={fallback}
            onValueChange={(next) => {
              onChange(String(next));
            }}
            formatValue={(current) => translate(unit, { value: current })}
            testID={testID}
          />
        </View>
      )}
    </FormField>
  );
}
