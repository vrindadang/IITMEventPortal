
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { User } from '../types.ts';

interface LoginProps {
  onLogin: (user: User) => void;
  users: User[];
}

const Login: React.FC<LoginProps> = ({ onLogin, users }) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Custom Dropdown State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedUser = useMemo(() => 
    users.find(u => u.id === selectedUserId), 
    [selectedUserId, users]
  );

  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      u.department.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [users, searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      const user = users.find(u => u.id === selectedUserId);
      if (user && user.password === password) {
        onLogin(user);
      } else {
        setError('Incorrect password. Please try again.');
        setIsLoading(false);
      }
    }, 600);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-[#805ad5] via-[#4361ee] to-[#4338ca] p-4 md:p-6 no-scrollbar overflow-hidden">
      <div className="max-w-[420px] w-full bg-[#f4f5f7] rounded-[2.5rem] md:rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.3)] border border-white/10 relative transition-all duration-300">
        
        {/* Header Section */}
        <div className="p-8 md:p-12 bg-[#24285b] text-white text-center relative overflow-hidden rounded-t-[2.5rem] md:rounded-t-[3rem]">
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-14 h-14 md:w-20 md:h-20 bg-white/10 backdrop-blur-md rounded-[1.25rem] md:rounded-[1.5rem] flex items-center justify-center text-3xl md:text-4xl mb-4 md:mb-6 border border-white/20 shadow-inner">
              🏛️
            </div>
            <h1 className="font-classy-serif text-[1.8rem] md:text-[2.4rem] leading-tight tracking-tight mb-2">IIT-M Event Portal</h1>
            <p className="text-indigo-300 text-[9px] md:text-[11px] font-black uppercase tracking-[0.2em] opacity-80">10/03/2026 • Management Suite</p>
          </div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] -translate-y-1/2"></div>
        </div>
        
        {/* Form Section */}
        <div className="p-8 md:p-12 space-y-6 md:space-y-8 rounded-b-[2.5rem] md:rounded-b-[3rem]">
          <form onSubmit={handleLogin} className="space-y-6 md:space-y-8">
            
            {/* Custom User Dropdown Container */}
            <div className="space-y-2 md:space-y-3" ref={dropdownRef}>
              <label className="block text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.25em]">
                Select Your Profile
              </label>
              <div className="relative">
                <div 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={`
                    w-full px-5 md:px-6 py-3.5 md:py-4 rounded-xl md:rounded-2xl bg-white border transition-all cursor-pointer flex items-center justify-between shadow-sm
                    ${isDropdownOpen ? 'border-indigo-400 ring-2 ring-indigo-100 opacity-0' : 'border-slate-200 hover:border-slate-300'}
                  `}
                >
                  <span className={`text-sm font-bold truncate pr-4 ${selectedUser ? 'text-slate-800' : 'text-slate-400'}`}>
                    {selectedUser ? selectedUser.name : 'Choose your name...'}
                  </span>
                  <span className="text-indigo-400 text-xs">
                    ▼
                  </span>
                </div>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute top-0 left-0 right-0 bg-white rounded-xl md:rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.25)] border-2 border-indigo-400 z-[110] overflow-hidden animate-slideUp">
                    {/* Header Style Match */}
                    <div 
                      className="bg-[#eef2ff] px-5 md:px-6 py-3.5 md:py-4 flex justify-between items-center cursor-pointer border-b border-indigo-100"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <span className="text-indigo-600 font-bold text-sm">Choose your name...</span>
                      <span className="text-indigo-600 text-xs">▲</span>
                    </div>

                    <div className="p-3 md:p-4 border-b border-slate-50 bg-white">
                      <div className="relative">
                        <input 
                          type="text" 
                          placeholder="Search profiles..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full px-4 py-2.5 md:py-3 bg-white border border-indigo-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all shadow-sm"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                    
                    <div className="max-h-[220px] md:max-h-[300px] overflow-y-auto custom-scrollbar bg-white overscroll-contain">
                      {filteredUsers.length > 0 ? filteredUsers.map((user) => (
                        <div 
                          key={user.id} 
                          onClick={() => {
                            setSelectedUserId(user.id);
                            setIsDropdownOpen(false);
                            setSearchQuery('');
                          }}
                          className={`
                            px-5 md:px-6 py-3 md:py-4 cursor-pointer transition-colors border-b border-slate-50 last:border-0 hover:bg-indigo-50
                            ${selectedUserId === user.id ? 'bg-indigo-50/50' : ''}
                          `}
                        >
                          <p className="font-bold text-slate-800 text-[13px] md:text-[14px] leading-tight mb-0.5">{user.name}</p>
                          <p className="text-[10px] md:text-[11px] text-slate-400 font-medium">{user.department}</p>
                        </div>
                      )) : (
                        <div className="p-8 text-center text-slate-400 italic text-xs">No matching profiles</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2 md:space-y-3">
              <label className="block text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.25em]">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-5 md:px-6 py-3.5 md:py-4 rounded-xl md:rounded-2xl bg-white border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm font-medium shadow-sm placeholder:text-slate-300"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="p-3 md:p-4 bg-red-50 text-red-600 text-[10px] md:text-[11px] font-black uppercase tracking-widest rounded-xl md:rounded-2xl border border-red-100 animate-pulse text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`
                w-full py-4 md:py-5 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm text-white transition-all shadow-xl active:scale-[0.98] border-b-4
                ${isLoading 
                  ? 'bg-slate-400 border-slate-500 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-[#4361ee] to-[#8a2be2] border-indigo-800 hover:shadow-indigo-500/20'}
              `}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2 md:mr-3"></div>
                  Verifying...
                </div>
              ) : (
                'Log In to Dashboard'
              )}
            </button>
          </form>
          
          <div className="text-center pt-2 md:pt-4">
            <p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-[0.1em] leading-relaxed">
              Authorized Personnel Only. <br/> 
              Default: <code className="bg-slate-200 px-1 rounded text-slate-600 lowercase font-mono">password123</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
