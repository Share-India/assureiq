'use client';
import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ThemeProvider, CssBaseline, Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, AppBar, Toolbar, Typography, IconButton, Avatar, Chip } from '@mui/material';
import { Dashboard as DashboardIcon, Business as BusinessIcon, ExitToApp as LogoutIcon, Brightness4 as DarkModeIcon, Brightness7 as LightModeIcon } from '@mui/icons-material';
import { lightTheme, darkTheme } from './theme';
import '@/app/globals.css';

const DRAWER_WIDTH = 260;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
    } else if (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
    }
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      } else {
        setUser(null);
        if (pathname !== '/login' && pathname !== '/') {
          router.push('/login');
        }
      }
    }
  }, [pathname, router]);

  const toggleTheme = () => {
    const nextMode = !darkMode;
    setDarkMode(nextMode);
    localStorage.setItem('theme', nextMode ? 'dark' : 'light');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    router.push('/login');
  };

  const isLoginPage = pathname === '/login' || pathname === '/';
  const theme = darkMode ? darkTheme : lightTheme;

  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />
      </head>
      <body>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {isLoginPage ? (
            <Box className="w-full h-full min-h-screen">
              {children}
            </Box>
          ) : (
            <Box sx={{ display: 'flex', minHeight: 'screen' }} className="canvas-bg">
              {/* Header AppBar */}
              <AppBar
                position="fixed"
                sx={{
                  width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
                  ml: { sm: `${DRAWER_WIDTH}px` },
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(11, 28, 48, 0.75)' : 'rgba(255, 255, 255, 0.75)',
                  backdropFilter: 'blur(20px)',
                  color: theme.palette.text.primary,
                  boxShadow: 'none',
                  borderBottom: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
                }}
              >
                <Toolbar className="flex justify-between">
                  <Typography variant="h6" noWrap component="div" className="font-extrabold text-lg tracking-tight">
                    Corporate Underwriting Panel
                  </Typography>
                  <Box className="flex items-center gap-4">
                    {user && (
                      <Box className="flex items-center gap-2">
                        <Chip 
                          label={user.role} 
                          color="primary" 
                          size="small" 
                          className="font-bold text-[10px] uppercase tracking-wider" 
                        />
                        <Typography variant="body2" className="font-semibold text-slate-700 dark:text-slate-200">
                          {user.username}
                        </Typography>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: theme.palette.primary.main, fontSize: 13, fontWeight: 'bold' }}>
                          {user.username[0].toUpperCase()}
                        </Avatar>
                      </Box>
                    )}
                    <IconButton onClick={toggleTheme} color="inherit">
                      {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
                    </IconButton>
                  </Box>
                </Toolbar>
              </AppBar>

              {/* Sidebar Navigation Drawer */}
              <Box
                component="nav"
                sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}
              >
                <Drawer
                  variant="permanent"
                  sx={{
                    display: { xs: 'none', sm: 'block' },
                    '& .MuiDrawer-paper': {
                      boxSizing: 'border-box',
                      width: DRAWER_WIDTH,
                      background: theme.palette.mode === 'dark' ? 'rgba(11, 28, 48, 0.85)' : 'rgba(255, 255, 255, 0.75)',
                      backdropFilter: 'blur(20px)',
                      color: theme.palette.mode === 'dark' ? '#eeefff' : '#0b1c30',
                      borderRight: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
                      boxShadow: '0 4px 30px rgba(0, 0, 0, 0.03)'
                    },
                  }}
                  open
                >
                  <div className="p-6 border-b border-slate-200/50 dark:border-slate-800 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#004ac6] to-indigo-850 shadow-md flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_60%)]"></div>
                      <span className="material-symbols-outlined text-white text-2xl relative z-10">verified_user</span>
                    </div>
                    <div>
                      <h1 className="text-md font-black text-[#004ac6] dark:text-[#b4c5ff] leading-none">AssureIQ</h1>
                      <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mt-1">Underwriting CRM</p>
                    </div>
                  </div>
                  
                  <List className="flex-1 mt-6 px-3 space-y-1">
                    <ListItem disablePadding>
                      <ListItemButton 
                        onClick={() => router.push('/dashboard')}
                        selected={pathname === '/dashboard'}
                        sx={{
                          borderRadius: '12px',
                          '&.Mui-selected': { 
                            bgcolor: 'rgba(37,99,235,0.1)', 
                            color: '#004ac6',
                            boxShadow: '0 4px 15px rgba(37,99,235,0.05)'
                          },
                          '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' }
                        }}
                      >
                        <ListItemIcon sx={{ color: pathname === '/dashboard' ? '#004ac6' : '#737686' }}>
                          <span className="material-symbols-outlined">dashboard</span>
                        </ListItemIcon>
                        <ListItemText primary={<span className="font-bold text-sm">Dashboard</span>} />
                      </ListItemButton>
                    </ListItem>

                    <ListItem disablePadding>
                      <ListItemButton 
                        onClick={() => router.push('/companies')}
                        selected={pathname.startsWith('/companies')}
                        sx={{
                          borderRadius: '12px',
                          '&.Mui-selected': { 
                            bgcolor: 'rgba(37,99,235,0.1)', 
                            color: '#004ac6',
                            boxShadow: '0 4px 15px rgba(37,99,235,0.05)'
                          },
                          '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' }
                        }}
                      >
                        <ListItemIcon sx={{ color: pathname.startsWith('/companies') ? '#004ac6' : '#737686' }}>
                          <span className="material-symbols-outlined">account_tree</span>
                        </ListItemIcon>
                        <ListItemText primary={<span className="font-bold text-sm">Companies</span>} />
                      </ListItemButton>
                    </ListItem>
                  </List>
                  
                  <Box className="p-4 border-t border-slate-200/50 dark:border-slate-800">
                    <ListItemButton 
                      onClick={handleLogout}
                      sx={{
                        borderRadius: '12px',
                        color: '#F56565',
                        '&:hover': { bgcolor: 'rgba(245,101,101,0.08)' }
                      }}
                    >
                      <ListItemIcon sx={{ color: '#F56565' }}>
                        <span className="material-symbols-outlined">logout</span>
                      </ListItemIcon>
                      <ListItemText primary={<span className="font-bold text-sm">Log Out</span>} />
                    </ListItemButton>
                  </Box>
                </Drawer>
              </Box>

              {/* Main Content Area */}
              <Box
                component="main"
                sx={{
                  flexGrow: 1,
                  p: 4,
                  width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
                  mt: '64px',
                  bgcolor: 'transparent',
                }}
              >
                {children}
              </Box>
            </Box>
          )}
        </ThemeProvider>
      </body>
    </html>
  );
}
