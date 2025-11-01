/**
 * Hook for accessing authentication context
 * Provides convenient access to auth state and methods
 */

import { useContext } from 'react';
import { AuthContext, AuthContextType } from './AuthContext';

/**
 * Custom hook to access authentication context
 * Must be used within an AuthProvider
 *
 * @returns AuthContextType with user, session, and auth methods
 * @throws Error if used outside AuthProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, signIn, signOut, isAuthenticated } = useAuth();
 *
 *   if (isAuthenticated) {
 *     return <div>Welcome, {user?.email}</div>;
 *   }
 *
 *   return <LoginForm onSignIn={signIn} />;
 * }
 * ```
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error(
      'useAuth must be used within an AuthProvider. ' +
      'Wrap your component tree with <AuthProvider> to use authentication features.'
    );
  }

  return context;
}
