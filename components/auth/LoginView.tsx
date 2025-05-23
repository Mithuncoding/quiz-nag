import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext'; // Adjust path as needed

interface LoginViewProps {
  onLoginSuccess: () => void;
  onNavigateToSignup: () => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, onNavigateToSignup }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      onLoginSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to login. Please check your credentials.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-800/70 backdrop-blur-md shadow-2xl rounded-xl p-6 md:p-10 max-w-md mx-auto">
      <h2 className="text-3xl font-bold mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
        Login
      </h2>
      {error && (
        <div className="mb-4 p-3 bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg text-sm" role="alert">
          <i className="fas fa-times-circle mr-2"></i>{error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-neutral-300 mb-1">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full p-3 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-colors duration-200 shadow-sm"
            aria-label="Email Address"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-neutral-300 mb-1">
            Password
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full p-3 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-colors duration-200 shadow-sm"
            aria-label="Password"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <><i className="fas fa-spinner fa-spin mr-2"></i>Logging In...</> : <><i className="fas fa-sign-in-alt mr-2"></i>Login</>}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-neutral-400">
        Don't have an account?{' '}
        <button onClick={onNavigateToSignup} className="font-medium text-purple-400 hover:text-purple-300">
          Sign Up
        </button>
      </p>
    </div>
  );
};

export default LoginView;
