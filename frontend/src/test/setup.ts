/// <reference types="jest" />

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const React = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return function MockMaterialCommunityIcon({ name }: { name: string }) {
    return React.createElement(Text, { accessibilityElementsHidden: true }, name);
  };
});

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return function MockMaterialIcon({ name }: { name: string }) {
    return React.createElement(Text, { accessibilityElementsHidden: true }, name);
  };
});

// Shared Jest setup is intentionally small. Test doubles stay beside the tests that need them.
