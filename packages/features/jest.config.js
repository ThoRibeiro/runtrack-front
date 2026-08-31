/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  // Worklets ships its own resolver: without it, jest picks the `.native`
  // entry points, which reach for a native module that does not exist here and
  // every suite fails on an import rather than on anything it asserts.
  resolver: 'react-native-worklets/jest/resolver.js',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.test.{ts,tsx}', '!src/**/index.ts'],
  // The preset's list does not know about the packages this design system pulls
  // in. Anything shipping ESM has to be transformed, or jest fails on an import
  // that has nothing to do with the test.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-native-svg|react-native-reanimated|react-native-worklets|react-native-gesture-handler|@shopify/flash-list))',
  ],
};
