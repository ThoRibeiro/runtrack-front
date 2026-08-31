// The web secure store needs an IndexedDB and a Web Crypto implementation.
// Node 22 has the second natively; the first comes from `fake-indexeddb`.
import 'fake-indexeddb/auto';

jest.mock('expo-secure-store', () => {
  const vault = new Map<string, string>();
  return {
    setItemAsync: jest.fn((key: string, value: string) => {
      vault.set(key, value);
      return Promise.resolve();
    }),
    getItemAsync: jest.fn((key: string) => Promise.resolve(vault.get(key) ?? null)),
    deleteItemAsync: jest.fn((key: string) => {
      vault.delete(key);
      return Promise.resolve();
    }),
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'whenUnlockedThisDeviceOnly',
  };
});
