import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ResetPassword from '../components/ResetPassword';
import * as securityService from '../services/securityService';

// Mock security service
vi.mock('../services/securityService', () => ({
  fetchSecurityQuestions: vi.fn(),
  verifySecurityAnswer: vi.fn(),
}));

// Mock Firestore
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
  doc: vi.fn(),
  updateDoc: vi.fn(),
}));

vi.mock('../services/firebase', () => ({
  db: {},
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('ResetPassword Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render step 1 - employee ID input', () => {
    render(
      <BrowserRouter>
        <ResetPassword />
      </BrowserRouter>
    );

    expect(screen.getByText(/reset password/i)).toBeInTheDocument();
    expect(screen.getByText(/step 1 of 3/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/employee id/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
  });

  it('should navigate back to login', () => {
    render(
      <BrowserRouter>
        <ResetPassword />
      </BrowserRouter>
    );

    const backButton = screen.getByText(/back to login/i);
    fireEvent.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('should proceed to step 2 on valid employee ID', async () => {
    const { getDocs } = await import('firebase/firestore');
    
    getDocs.mockResolvedValue({
      empty: false,
      docs: [{
        id: 'user123',
        data: () => ({
          securityQuestionId: '1',
          securityAnswerHash: 'hash123',
        }),
      }],
    });

    securityService.fetchSecurityQuestions.mockResolvedValue([
      { id: '1', question: 'What is your favorite color?' },
    ]);

    render(
      <BrowserRouter>
        <ResetPassword />
      </BrowserRouter>
    );

    const employeeIdInput = screen.getByPlaceholderText(/enter your employee id/i);
    const continueButton = screen.getByRole('button', { name: /continue/i });

    fireEvent.change(employeeIdInput, { target: { value: '6705067' } });
    fireEvent.click(continueButton);

    await waitFor(() => {
      expect(screen.getByText(/step 2 of 3/i)).toBeInTheDocument();
      expect(screen.getByText(/what is your favorite color/i)).toBeInTheDocument();
    });
  });

  it('should show error for invalid employee ID', async () => {
    const { getDocs } = await import('firebase/firestore');
    
    getDocs.mockResolvedValue({
      empty: true,
    });

    render(
      <BrowserRouter>
        <ResetPassword />
      </BrowserRouter>
    );

    const employeeIdInput = screen.getByPlaceholderText(/enter your employee id/i);
    const continueButton = screen.getByRole('button', { name: /continue/i });

    fireEvent.change(employeeIdInput, { target: { value: 'invalid' } });
    fireEvent.click(continueButton);

    await waitFor(() => {
      expect(screen.getByText(/employee id not found/i)).toBeInTheDocument();
    });
  });

  it('should verify security answer and proceed to step 3', async () => {
    const { getDocs } = await import('firebase/firestore');
    
    getDocs.mockResolvedValue({
      empty: false,
      docs: [{
        id: 'user123',
        data: () => ({
          securityQuestionId: '1',
          securityAnswerHash: 'hash123',
        }),
      }],
    });

    securityService.fetchSecurityQuestions.mockResolvedValue([
      { id: '1', question: 'What is your favorite color?' },
    ]);

    securityService.verifySecurityAnswer.mockResolvedValue(true);

    render(
      <BrowserRouter>
        <ResetPassword />
      </BrowserRouter>
    );

    // Step 1
    const employeeIdInput = screen.getByPlaceholderText(/enter your employee id/i);
    fireEvent.change(employeeIdInput, { target: { value: '6705067' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // Wait for Step 2
    await waitFor(() => {
      expect(screen.getByText(/step 2 of 3/i)).toBeInTheDocument();
    });

    // Step 2
    const answerInput = screen.getByPlaceholderText(/enter your answer/i);
    fireEvent.change(answerInput, { target: { value: 'blue' } });
    fireEvent.click(screen.getByRole('button', { name: /verify answer/i }));

    // Should proceed to Step 3
    await waitFor(() => {
      expect(screen.getByText(/step 3 of 3/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    });
  });
});
