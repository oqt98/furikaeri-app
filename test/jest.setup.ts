import { Alert } from 'react-native';

const mockAsyncStorage = require('./async-storage-mock.cjs');

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

jest.mock('react-native-draggable-flatlist', () => {
  const React = require('react');
  const { View } = require('react-native');

  const MockList = ({
    data,
    renderItem,
    ListHeaderComponent,
    contentContainerStyle,
  }: any) =>
    React.createElement(
      View,
      { style: contentContainerStyle },
      ListHeaderComponent,
      ...(data ?? []).map((item: any, index: number) =>
        React.createElement(
          React.Fragment,
          { key: item.id ?? item.key ?? index },
          renderItem({ item, index, drag: jest.fn(), isActive: false })
        )
      )
    );

  return {
    __esModule: true,
    default: MockList,
    ScaleDecorator: ({ children }: any) => children,
  };
});

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  getPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('notification-id'),
  AndroidImportance: { DEFAULT: 'default' },
  SchedulableTriggerInputTypes: { DAILY: 'daily' },
}));

jest.mock('expo-file-system', () => ({
  File: {
    pickFileAsync: jest.fn(),
  },
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true, assets: [] }),
}));

beforeEach(() => {
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
