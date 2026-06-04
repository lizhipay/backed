import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProviders } from '@/app/providers/AppProviders';
import { LoginPage } from '@/features/auth/LoginPage';

test('renders the login page', () => {
  render(
    <MemoryRouter>
      <AppProviders>
        <LoginPage />
      </AppProviders>
    </MemoryRouter>,
  );

  expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
});
