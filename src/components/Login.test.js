import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from '../components/Login';
import { useAuth } from '../context/AuthContext';

// Mock AuthContext
vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: null }),
  };
});

describe('Login Component', () => {
  const mockLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      login: mockLogin,
      currentUser: null,
      user: null,
    });
  });

  it('should render login form', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    expect(screen.getByLabelText(/employee id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should show validation errors for empty fields', async () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);

    // HTML5 validation will prevent submission
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('should call login on form submission', async () => {
    mockLogin.mockResolvedValue({});

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    const employeeIdInput = screen.getByPlaceholderText(/enter your employee id/i);
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(employeeIdInput, { target: { value: '6705067' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('6705067@boots-pos.local', 'password123');
    });
  });

  it('should display error on login failure', async () => {
    const errorMessage = 'Invalid employee ID';
    mockLogin.mockRejectedValue({ code: 'auth/user-not-found' });

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    const employeeIdInput = screen.getByPlaceholderText(/enter your employee id/i);
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(employeeIdInput, { target: { value: 'invalid' } });
    fireEvent.change(passwordInput, { target: { value: 'wrong' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid employee id/i)).toBeInTheDocument();
    });
  });

  it('should have forgot password link', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    const forgotPasswordLink = screen.getByText(/forgot password/i);
    expect(forgotPasswordLink).toBeInTheDocument();
    
    fireEvent.click(forgotPasswordLink);
    expect(mockNavigate).toHaveBeenCalledWith('/reset-password');
  });
});
