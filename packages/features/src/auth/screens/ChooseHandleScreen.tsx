import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { Button, FormField, Input, Pressable, Text, space } from '@runtrack/ui';
import { translate } from '../../i18n';
import { useChangeHandle } from '../../user/hooks/useProfileEdition';
import { validateHandle } from '../validation';
import { AuthLayout } from './AuthLayout';

/**
 * Le pseudo, demandé une fois le compte ouvert.
 *
 * Un compte fédéré naît avec un pseudo dérivé de son identifiant, parce qu'un
 * profil ne peut pas exister sans et qu'un retour de redirection n'est pas un
 * endroit où poser une question. C'est ici qu'on la pose — après, sur un écran
 * qui n'a plus rien à faire d'autre.
 *
 * **« Plus tard » est proposé.** Le pseudo dérivé est laid mais valide : bloquer
 * l'entrée dans l'application sur un formulaire, pour quelqu'un qui vient de
 * s'authentifier, transformerait une invitation en péage.
 */
export interface ChooseHandleScreenProps {
  onChosen: () => void;
  onSkip: () => void;
}

export function ChooseHandleScreen({ onChosen, onSkip }: ChooseHandleScreenProps): ReactNode {
  const changeHandle = useChangeHandle();
  const [handle, setHandle] = useState('');
  const [showErrors, setShowErrors] = useState(false);

  const handleError = validateHandle(handle);

  const submit = (): void => {
    setShowErrors(true);
    if (handleError !== undefined) return;

    changeHandle.mutate(handle.trim(), {
      onSuccess: () => {
        onChosen();
      },
    });
  };

  return (
    <AuthLayout
      title={translate('auth.handle.title')}
      subtitle={translate('auth.handle.subtitle')}
      error={changeHandle.error}
      testID="choose-handle"
      footer={
        <View style={{ gap: space.sm, alignItems: 'center' }}>
          <Pressable onPress={onSkip} accessibilityLabel={translate('auth.handle.later')}>
            <Text tone="brand" decorative>
              {translate('auth.handle.later')}
            </Text>
          </Pressable>
        </View>
      }
    >
      <FormField
        label={translate('auth.handle.label')}
        required
        error={showErrors && handleError !== undefined ? translate(handleError) : undefined}
      >
        {(field) => (
          <Input
            field={field}
            value={handle}
            onChangeText={setHandle}
            placeholder={translate('auth.handle.placeholder')}
            autoComplete="username"
            testID="choose-handle-input"
          />
        )}
      </FormField>

      <Button
        label={translate('auth.handle.submit')}
        onPress={submit}
        loading={changeHandle.isPending}
        fullWidth
        testID="choose-handle-submit"
      />
    </AuthLayout>
  );
}
