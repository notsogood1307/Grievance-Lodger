import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, AlertCircle, CheckCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isOfficer, setIsOfficer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      if (isOfficer) {
        // Officer Login (Email + Password)
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate('/officer');
      } else {
        // Citizen Login (OTP via Magic Link for MVP simplicity)
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            data: { role: 'citizen' } // Set default role for new signups
          }
        });
        if (error) throw error;
        setMessage('Check your email for the login link!');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
      <h2 className="text-2xl font-bold text-center text-slate-900 mb-8">
        {isOfficer ? 'Officer Portal' : 'Citizen Login'}
      </h2>

      <div className="flex bg-slate-100 p-1 rounded-lg mb-8">
        <button
          className={`flex-1 py-2 rounded-md font-medium text-sm transition-all ${!isOfficer ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => setIsOfficer(false)}
        >
          Citizen
        </button>
        <button
          className={`flex-1 py-2 rounded-md font-medium text-sm transition-all ${isOfficer ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => setIsOfficer(true)}
        >
          Officer
        </button>
      </div>

      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
              placeholder="you@example.com"
            />
          </div>
        </div>

        {isOfficer && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="flex items-center space-x-2 text-green-700 bg-green-50 p-3 rounded-lg text-sm">
            <CheckCircle className="h-5 w-5 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center space-x-2 bg-primary text-white py-2.5 rounded-lg font-medium hover:bg-primary-hover transition-colors disabled:opacity-70"
        >
          {loading ? (
            <span>Processing...</span>
          ) : (
            <>
              <LogIn className="h-5 w-5" />
              <span>{isOfficer ? 'Sign In' : 'Send Login Link'}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
