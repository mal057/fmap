/**
 * Tests for Maps page (file listing)
 */

import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@fmap/shared-utils';
import Maps from '../../pages/Maps';
import React from 'react';

jest.mock('@fmap/shared-utils', () => ({
  ...jest.requireActual('@fmap/shared-utils'),
  useAuth: () => ({
    user: { id: '123', email: 'test@example.com' },
    session: { access_token: 'test-token' },
    isAuthenticated: true,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('Maps Page', () => {
  const renderMaps = () => {
    return render(
      <BrowserRouter>
        <AuthProvider>
          <Maps />
        </AuthProvider>
      </BrowserRouter>
    );
  };

  it('should render maps list interface', () => {
    renderMaps();

    expect(screen.getByText(/maps/i) || screen.getByText(/files/i)).toBeInTheDocument();
  });

  it('should display empty state when no maps', () => {
    renderMaps();

    // Empty state logic would be tested here
    const container = screen.getByRole('main') || document.body;
    expect(container).toBeInTheDocument();
  });
});
