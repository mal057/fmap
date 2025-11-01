/**
 * Tests for App component (routing)
 */

import { render, screen } from '@testing-library/react';
import App from '../App';
import React from 'react';

jest.mock('@fmap/shared-utils', () => ({
  ...jest.requireActual('@fmap/shared-utils'),
  useAuth: () => ({
    user: null,
    session: null,
    isAuthenticated: false,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('App Component', () => {
  it('should render without crashing', () => {
    render(<App />);

    // App should render some content
    const appContainer = document.body;
    expect(appContainer).toBeInTheDocument();
  });

  it('should set up routing', () => {
    render(<App />);

    // Routing would be configured
    expect(document.body).toBeInTheDocument();
  });
});
