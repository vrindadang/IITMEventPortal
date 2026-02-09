
import React, { useState } from 'react';
import { User } from '../types';
import { USERS } from '../constants';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!selectedUserId) {
      setError('Please select your profile');
      return;
    }

    setIsLoading(true);

    // Simulated short delay for realism
    setTimeout(() => {
      const user = USERS.find(u => u.id === selectedUserId);
      if (user && user.password === password) {
        onLogin(user);
      } else {
        setError('Incorrect password. Please try again.');
        setIsLoading(false);
      }
    }, 600);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
        <div className="p-8 bg-indigo-900 text-white text-center">
          <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-4">
            🏛️
          </div>
          <h1 className="text-2xl font-bold">IIT-M Event Portal</h1>
          <p className="text-indigo-200 text-sm mt-2">10/03/2026 • Management Suite</p>
        </div>
        
        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="user-select" className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">
                Select Your Profile
              </label>
              <select
                id="user-select"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="" disabled>Choose your name...</option>
                {USERS.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.id === '8' ? user.name : `${user.name} (${user.department})`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="password-input" className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">
                Password
              </label>
              <input
                id="password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-lg border border-red-100 animate-pulse text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`
                w-full py-4 rounded-xl font-bold text-white transition-all shadow-lg
                ${isLoading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'}
              `}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                  Verifying...
                </div>
              ) : (
                'Log In to Dashboard'
              )}
            </button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-400 font-medium">
              Authorized Personnel Only. <br/> 
              Default password is <code className="bg-slate-100 px-1 rounded text-slate-600">password123</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
