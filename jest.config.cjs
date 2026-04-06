module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/test/**/*.test.ts', '<rootDir>/test/**/*.test.tsx'],
  setupFilesAfterEnv: ['<rootDir>/test/jest.setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!(?:.pnpm/)?(?:react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|expo-router|react-native-safe-area-context|react-native-gesture-handler|react-native-reanimated|react-native-draggable-flatlist))',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  clearMocks: true,
};
