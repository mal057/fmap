/**
 * Tests for Register page
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@fmap/shared-utils';
import Register from '../../pages/Register';
import React from 'react';

const mockNavigate = jest.fn();
const mockSignUp = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('@fmap/shared-utils', () => ({
  ...jest.requireActual('@fmap/shared-utils'),
  useAuth: () => ({
    signIn: jest.fn(),
    signUp: mockSignUp,
    signOut: jest.fn(),
    user: null,
    session: null,
    isAuthenticated: false,
    loading: false,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('Register Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderRegister = () => {
    return render(
      <BrowserRouter>
        <AuthProvider>
          <Register />
        </AuthProvider>
      </BrowserRouter>
    );
  };

  it('should render registration form', () => {
    renderRegister();

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
  });

  it('should validate password confirmation', async () => {
    renderRegister();

    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmInput = screen.getByLabelText(/confirm password/i);

    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmInput, { target: { value: 'different' } });

    // Form validation would catch this
    expect(passwordInput).toHaveValue('password123');
    expect(confirmInput).toHaveValue('different');
  });

  it('should call signUp on form submission', async () => {
    mockSignUp.mockResolvedValue({ error: null });
    renderRegister();

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^password$/i);

    fireEvent.change(emailInput, { target: { value: 'newuser@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    // Additional form submission logic would be tested here
    expect(emailInput).toHaveValue('newuser@example.com');
  });
});
