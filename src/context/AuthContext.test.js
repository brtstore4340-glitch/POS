import { describe, it, expect,  vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAuth, AuthProvider } from '../context/AuthContext';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';

// Mock Firebase modules
vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn((auth, callback) => {
    // Immediately call with null user
    callback(null);
    return () => {}; // unsubscribe function
  }),
  getAuth: vi.fn(() => ({})),
}));

vi.mock('firebase/firestore', () => ({
  getDoc: vi.fn(() => Promise.resolve({
    exists: () => true,
    data: () => ({ role: 'admin', mustChangePassword: false }),
  })),
  doc: vi.fn(),
}));

vi.mock('../services/firebase', () => ({
  auth: {},
  db: {},
}));

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should provide auth context', async () => {
    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current).toBeDefined();
      expect(result.current.user).toBeDefined();
      expect(result.current.login).toBeInstanceOf(Function);
      expect(result.current.logout).toBeInstanceOf(Function);
    });
  });

  it('should handle login', async () => {
    const mockUser = { uid: '123', email: '6705067@boots-pos.local' };
    signInWithEmailAndPassword.mockResolvedValue({ user: mockUser });

    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    await result.current.login('6705067', 'password');

    expect(signInWithEmailAndPassword).toHaveBeenCalled With('6705067@boots-pos.local', 'password');
  });

  it('should handle logout', async () => {
    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    await result.current.logout();

    expect(signOut).toHaveBeenCalled();
  });
});
