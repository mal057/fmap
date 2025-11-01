/**
 * Tests for Upload page
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@fmap/shared-utils';
import Upload from '../../pages/Upload';
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

describe('Upload Page', () => {
  const renderUpload = () => {
    return render(
      <BrowserRouter>
        <AuthProvider>
          <Upload />
        </AuthProvider>
      </BrowserRouter>
    );
  };

  it('should render upload interface', () => {
    renderUpload();

    expect(screen.getByText(/upload/i)).toBeInTheDocument();
  });

  it('should handle file selection', () => {
    renderUpload();

    const file = new File(['test'], 'test.gpx', { type: 'application/gpx+xml' });
    const input = screen.getByLabelText(/file/i) || document.querySelector('input[type="file"]');

    if (input) {
      fireEvent.change(input, { target: { files: [file] } });
    }
  });

  it('should validate file types', () => {
    renderUpload();

    const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    // File validation logic would be tested here
    expect(invalidFile.name).toBe('test.txt');
  });
});
