import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Train, LogIn, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const Login = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!phone || !password) {
      setError('Please enter both phone number and password.');
      return;
    }

    setLoading(true);
    const result = await login(phone, password);
    setLoading(false);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.error || 'Invalid credentials.');
    }
  };

  const fillDemo = (role: 'passenger' | 'staff') => {
    if (role === 'passenger') {
      setPhone('9876543210');
    } else {
      setPhone('9876543211');
    }
    setPassword('demo123');
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <Train className="text-red-600 h-10 w-10" />
            <span className="text-3xl font-bold tracking-tight text-slate-900">
              RailPulse <span className="text-red-600">ETA</span>
            </span>
          </div>
          <p className="text-slate-600 text-sm">AI-Powered Dynamic Train Arrival Forecasting</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Sign In</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="10-digit mobile number"
                className="w-full bg-white border border-slate-300 text-slate-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                autoComplete="tel"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-white border border-slate-300 text-slate-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Demo Accounts */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-xs text-slate-500 text-center mb-3">Quick demo access</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fillDemo('passenger')}
                className="flex-1 text-xs py-2 px-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
              >
                Passenger Demo
              </button>
              <button
                type="button"
                onClick={() => fillDemo('staff')}
                className="flex-1 text-xs py-2 px-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
              >
                Railway Staff Demo
              </button>
            </div>
          </div>

          <p className="text-center text-slate-600 text-sm mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-red-600 hover:text-red-700 font-medium">
              Create Account
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          Smart India Hackathon 2026 Prototype • Demo Application Only
        </p>
      </div>
    </div>
  );
};

export default Login;
