'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Box, Card, CardContent, TextField, Button, Typography, 
  Tabs, Tab, Alert, CircularProgress, Select, MenuItem, InputLabel, FormControl, IconButton, InputAdornment, Checkbox, FormControlLabel
} from '@mui/material';
import { Visibility as EyeIcon, VisibilityOff as EyeOffIcon, Mail as MailIcon, Lock as LockIcon } from '@mui/icons-material';
import { api } from '@/services/api';

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  // Login State
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  
  // Register State
  const [regUser, setRegUser] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regRole, setRegRole] = useState('Sales Executive');
  
  // General State
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUser || !loginPass) {
      setErrorMsg('Please enter both email/username and password.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const formData = new URLSearchParams();
      formData.append('username', loginUser);
      formData.append('password', loginPass);

      const res = await api.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      
      const { access_token } = res.data;
      localStorage.setItem('token', access_token);
      
      const profileRes = await api.get('/auth/me');
      localStorage.setItem('user', JSON.stringify(profileRes.data));
      
      router.push('/companies');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUser || !regEmail || !regPass) {
      setErrorMsg('Please fill in all fields.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await api.post('/auth/register', {
        username: regUser,
        email: regEmail,
        password: regPass,
        role: regRole
      });
      setSuccessMsg('Account registered successfully! Please log in.');
      setActiveTab(0);
      setLoginUser(regUser);
      setLoginPass(regPass);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="canvas-bg text-on-surface min-h-screen overflow-x-hidden">
      <main className="min-h-screen flex flex-col md:flex-row overflow-hidden">
        
        {/* Left Hero Pane */}
        <section className="hidden md:flex md:w-1/2 lg:w-3/5 hero-gradient relative p-16 flex-col justify-between items-start text-white">
          <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden">
            <img 
              alt="Abstract Visualization" 
              className="w-full h-full object-cover mix-blend-overlay" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCq-uYed5QMnxTG_TwkWmFBFXVtsEtk-Q-yppXEu6VHzPzXz35WRUa0munICOnOg6TybmH2IBKQ4GM3MIy2PqjpjD6VpD66tJ9LZMBw2Xq72GHJ7_vhBlGL25yROQXPb2KAOMKXuf33jgsPhrQ9MPcQ43gi2XbmS7A_9Doi5dzGp95SWQsCEx37Mvbqr0P18tYWDdbe7R1WjqRptNLBWqrrrCAKd0ofrxOEb9TCZIgkguFTeEoTZlM6gRqBtcW2n42CT7ZWwkoRbq7J" 
            />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-12">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#004ac6] to-indigo-850 shadow-lg flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_60%)]"></div>
                <span className="material-symbols-outlined text-white text-3xl relative z-10">verified_user</span>
              </div>
              <span className="text-3xl font-extrabold text-white tracking-tight">AssureIQ</span>
            </div>
            
            <h1 className="font-display-lg text-4xl lg:text-5xl font-black text-white mb-6 max-w-xl leading-tight">
              Drive corporate underwriting to new heights.
            </h1>
            <p className="font-body-lg text-lg text-slate-200 max-w-lg leading-relaxed opacity-95">
              Analyze corporate files, assess liabilities, predict missing financial details, and calculate coverage opportunities at light-speed.
            </p>
          </div>

          <div className="relative z-10 mt-auto">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/95 backdrop-blur-md rounded-2xl flex items-center justify-center p-2 shadow-lg border border-white/20">
                <img src="/SHAREINDIA.png" alt="Share India Logo" className="w-full h-full object-contain" />
              </div>
              <span className="text-3xl font-extrabold text-white tracking-tight">Share India</span>
            </div>
          </div>
        </section>

        {/* Right Form Pane */}
        <section className="flex-1 flex flex-col min-h-screen p-8 bg-[#f8f9ff] dark:bg-[#0b1c30]">
          <div className="flex-1 flex flex-col justify-center items-center py-6">
            <div className="w-full max-w-[420px] space-y-8">
            <div className="flex flex-col items-center text-center">
              <div className="mb-3 w-16 h-16 rounded-2xl bg-gradient-to-br from-[#004ac6] to-indigo-850 shadow-md flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_60%)]"></div>
                <span className="material-symbols-outlined text-white text-4xl relative z-10">verified_user</span>
              </div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">AssureIQ</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Welcome back. Enter credentials to manage underwriting accounts.</p>
            </div>

            {/* Segmented Control Selector */}
            <div className="bg-slate-100 dark:bg-slate-900/50 p-1 rounded-xl flex mb-6 border border-slate-200/50 dark:border-slate-800">
              <button 
                type="button"
                onClick={() => {
                  setActiveTab(0);
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`flex-1 py-2 font-bold text-sm rounded-lg transition-all ${activeTab === 0 ? "text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                Sign In
              </button>
              <button 
                type="button"
                onClick={() => {
                  setActiveTab(1);
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`flex-1 py-2 font-bold text-sm rounded-lg transition-all ${activeTab === 1 ? "text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                Create Account
              </button>
            </div>

            {errorMsg && <Alert severity="error" className="mb-4 rounded-xl">{errorMsg}</Alert>}
            {successMsg && <Alert severity="success" className="mb-4 rounded-xl">{successMsg}</Alert>}

            {activeTab === 0 ? (
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 ml-1">Username / Email</label>
                  <TextField
                    variant="outlined"
                    fullWidth
                    placeholder="Username"
                    value={loginUser}
                    onChange={(e) => setLoginUser(e.target.value)}
                    sx={{
                      bgcolor: 'white',
                      borderRadius: '12px',
                      '& .MuiInputBase-input': { color: 'black' },
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: '#c3c6d7' }
                    }}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <MailIcon className="text-slate-400 text-sm" />
                          </InputAdornment>
                        )
                      }
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 ml-1">Password</label>
                  <TextField
                    variant="outlined"
                    fullWidth
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    sx={{
                      bgcolor: 'white',
                      borderRadius: '12px',
                      '& .MuiInputBase-input': { color: 'black' },
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: '#c3c6d7' }
                    }}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <LockIcon className="text-slate-400 text-sm" />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                            </IconButton>
                          </InputAdornment>
                        )
                      }
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <FormControlLabel
                    control={
                      <Checkbox 
                        checked={rememberMe} 
                        onChange={(e) => setRememberMe(e.target.checked)} 
                        size="small"
                      />
                    }
                    label={<span className="text-slate-500 hover:text-slate-800 font-medium">Remember me</span>}
                  />
                  <a className="font-semibold text-blue-600 dark:text-blue-400 hover:underline" href="#">Forgot Password?</a>
                </div>

                <Button 
                  type="submit" 
                  variant="contained" 
                  fullWidth 
                  size="large"
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-700 py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-600/20 active:scale-[0.99] transition-transform"
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 ml-1">Username</label>
                  <TextField
                    variant="outlined"
                    fullWidth
                    value={regUser}
                    onChange={(e) => setRegUser(e.target.value)}
                    sx={{
                      bgcolor: 'white',
                      borderRadius: '12px',
                      '& .MuiInputBase-input': { color: 'black' },
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: '#c3c6d7' }
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 ml-1">Email Address</label>
                  <TextField
                    variant="outlined"
                    fullWidth
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    sx={{
                      bgcolor: 'white',
                      borderRadius: '12px',
                      '& .MuiInputBase-input': { color: 'black' },
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: '#c3c6d7' }
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 ml-1">Password</label>
                  <TextField
                    variant="outlined"
                    fullWidth
                    type="password"
                    value={regPass}
                    onChange={(e) => setRegPass(e.target.value)}
                    sx={{
                      bgcolor: 'white',
                      borderRadius: '12px',
                      '& .MuiInputBase-input': { color: 'black' },
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: '#c3c6d7' }
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 ml-1">Enterprise Role</label>
                  <FormControl fullWidth>
                    <Select
                      value={regRole}
                      onChange={(e) => setRegRole(e.target.value)}
                      sx={{
                        bgcolor: 'white',
                        color: 'black',
                        borderRadius: '12px',
                        '& .MuiSelect-select': { color: 'black' },
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#c3c6d7' }
                      }}
                    >
                      <MenuItem value="Sales Executive">Sales Executive</MenuItem>
                      <MenuItem value="Admin">Admin</MenuItem>
                    </Select>
                  </FormControl>
                </div>
                <Button 
                  type="submit" 
                  variant="contained" 
                  fullWidth 
                  size="large"
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-700 py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-600/20 mt-4"
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'Register Account'}
                </Button>
              </form>
            )}
          </div>

          </div>
          {/* Footer inside login pane */}
          <footer className="w-full py-6 px-4 border-t border-slate-200/10 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 bg-transparent text-slate-500 text-xs mt-auto">
            <span>© 2026 Share India. All rights reserved.</span>
            <div className="flex gap-6">
              <a className="hover:text-slate-800 dark:hover:text-white underline underline-offset-4" href="#">Privacy Policy</a>
              <a className="hover:text-slate-800 dark:hover:text-white underline underline-offset-4" href="#">Terms of Service</a>
            </div>
          </footer>
        </section>
      </main>
    </div>
  );
}
