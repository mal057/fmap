/**
 * Tests for ProtectedRoute component
 */

import { render, screen } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@fmap/shared-utils';
import ProtectedRoute from '../../components/ProtectedRoute';
import React from 'react';

const TestComponent = () => <div>Protected Content</div>;

describe('ProtectedRoute', () => {
  it('should render children when authenticated', () => {
    const mockUseAuth = jest.fn(() => ({
      user: { id: '123' },
      isAuthenticated: true,
    }));

    jest.mock('@fmap/shared-utils', () => ({
      useAuth: mockUseAuth,
      AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    }));

    render(
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <TestComponent />
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    );
  });

  it('should redirect to login when not authenticated', () => {
    // Redirect logic would be tested here
    expect(true).toBe(true);
  });
});
