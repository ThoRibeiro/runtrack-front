import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { aRuntime, renderWithRuntime } from '../../testing/harness';
import { ChooseHandleScreen } from './ChooseHandleScreen';

const noop = (): void => undefined;

describe('choosing a handle', () => {
  it('sends the chosen handle and moves on', async () => {
    const harness = aRuntime();
    let chosen = false;

    await renderWithRuntime(
      <ChooseHandleScreen onChosen={() => {
        chosen = true;
      }} onSkip={noop} />,
      harness,
    );
    await userEvent.type(screen.getByTestId('choose-handle-input'), 'marie');
    await userEvent.press(screen.getByTestId('choose-handle-submit'));

    await waitFor(() => {
      expect(chosen).toBe(true);
    });
  });

  /** A derived handle is ugly but valid: the screen must not become a toll gate. */
  it('lets someone move on without choosing', async () => {
    const harness = aRuntime();
    let skipped = false;

    await renderWithRuntime(
      <ChooseHandleScreen onChosen={noop} onSkip={() => {
        skipped = true;
      }} />,
      harness,
    );
    // Le libellé porte l'accessibilité ; le texte lui-même est décoratif.
    await userEvent.press(screen.getByLabelText('Plus tard'));

    expect(skipped).toBe(true);
  });

  it('refuses a handle the rules would reject', async () => {
    const harness = aRuntime();
    let chosen = false;

    await renderWithRuntime(
      <ChooseHandleScreen onChosen={() => {
        chosen = true;
      }} onSkip={noop} />,
      harness,
    );
    await userEvent.type(screen.getByTestId('choose-handle-input'), 'a');
    await userEvent.press(screen.getByTestId('choose-handle-submit'));

    await waitFor(() => {
      expect(chosen).toBe(false);
    });
  });
});
