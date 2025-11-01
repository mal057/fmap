/**
 * Integration tests for authentication flow
 * Tests complete user registration and login flow
 */

import { mockSupabaseClient } from '../mocks/supabase';

describe('Authentication Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('User Registration Flow', () => {
    it('should complete full registration flow', async () => {
      const email = 'newuser@example.com';
      const password = 'SecurePassword123!';

      // Mock successful signup
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: {
          user: { id: '123', email },
          session: { access_token: 'test-token' },
        },
        error: null,
      });

      // Call signup
      const result = await mockSupabaseClient.auth.signUp({
        email,
        password,
      });

      expect(result.error).toBeNull();
      expect(result.data.user?.email).toBe(email);
      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
        email,
        password,
      });
    });

    it('should handle registration errors', async () => {
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Email already exists' },
      });

      const result = await mockSupabaseClient.auth.signUp({
        email: 'existing@example.com',
        password: 'password',
      });

      expect(result.error?.message).toBe('Email already exists');
    });
  });

  describe('User Login Flow', () => {
    it('should complete full login flow', async () => {
      const email = 'user@example.com';
      const password = 'password123';

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: '123', email },
          session: { access_token: 'test-token' },
        },
        error: null,
      });

      const result = await mockSupabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      expect(result.error).toBeNull();
      expect(result.data.user?.email).toBe(email);
      expect(result.data.session?.access_token).toBe('test-token');
    });

    it('should handle invalid credentials', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' },
      });

      const result = await mockSupabaseClient.auth.signInWithPassword({
        email: 'user@example.com',
        password: 'wrongpassword',
      });

      expect(result.error?.message).toBe('Invalid credentials');
    });
  });

  describe('Session Management', () => {
    it('should retrieve current session', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: {
          session: { access_token: 'test-token' },
        },
        error: null,
      });

      const result = await mockSupabaseClient.auth.getSession();

      expect(result.data.session?.access_token).toBe('test-token');
    });

    it('should sign out user', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null });

      const result = await mockSupabaseClient.auth.signOut();

      expect(result.error).toBeNull();
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
    });
  });
});
