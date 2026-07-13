// Jest setup file
// Add any global test setup code here

// Mock expo modules
jest.mock('expo', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('expo-status-bar', () => ({
  __esModule: true,
  StatusBar: {},
}));
