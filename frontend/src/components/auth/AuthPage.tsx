import React, { useState } from 'react';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { useAuth } from '../../contexts/AuthContext';
import { Logo } from '../BrandElements';

type AuthMode = 'login' | 'register';

export const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, register } = useAuth();

  const handleLogin = async (email: string, password: string) => {
    setError('');
    setIsLoading(true);
    
    try {
      await login(email, password);
      // Navigation will be handled by the App component when auth state changes
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => {
    setError('');
    setIsLoading(true);
    
    try {
      await register(userData);
      // Navigation will be handled by the App component when auth state changes
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-infinity-blue-50 via-white to-infinity-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and Branding */}
        <div className="text-center">
          <Logo size="lg" variant="full" className="justify-center mb-4" />
          <p className="text-lg text-neural-gray-600">
            Your Infinite Knowledge Companion
          </p>
        </div>

        {/* Auth Forms */}
        {mode === 'login' ? (
          <LoginForm
            onLogin={handleLogin}
            onSwitchToRegister={switchMode}
            isLoading={isLoading}
            error={error}
          />
        ) : (
          <RegisterForm
            onRegister={handleRegister}
            onSwitchToLogin={switchMode}
            isLoading={isLoading}
            error={error}
          />
        )}

        {/* Footer */}
        <div className="text-center text-sm text-neural-gray-500">
          <p>
            By continuing, you agree to our{' '}
            <a href="#" className="text-infinity-blue-600 hover:underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-infinity-blue-600 hover:underline">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};