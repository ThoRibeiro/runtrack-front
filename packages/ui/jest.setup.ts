import '@testing-library/react-native';
import 'react-native-gesture-handler/jestSetup';

// Reanimated runs on the UI thread, which does not exist in jsdom. Its own mock
// keeps the API and turns the worklets into plain calls, so a test can still
// assert what a component renders — not how smoothly it got there. Frame rate is
// measured on a device with the profiler, never here.
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// Native modules that have no place in a unit test. Haptics is mocked rather
// than skipped so that a test can assert it fired — §4 puts haptics on exactly
// four events, and "it buzzes everywhere" is a regression worth catching.
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));
