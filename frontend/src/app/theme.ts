'use client';
import { createTheme } from '@mui/material/styles';

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#004ac6', // Royal blue
    },
    secondary: {
      main: '#2563eb', // Slate blue
    },
    background: {
      default: '#f8f9ff', // Light slate canvas
      paper: '#ffffff',
    },
    text: {
      primary: '#0b1c30', // Navy
      secondary: '#434655', // Charcoal outline
    },
  },
  typography: {
    fontFamily: '"Manrope", sans-serif',
  },
});

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#b4c5ff', // Dim blue
    },
    secondary: {
      main: '#6bd8cb',
    },
    background: {
      default: '#0b1c30', // Navy dark background
      paper: '#152b48',
    },
    text: {
      primary: '#eeefff',
      secondary: '#c3c6d7',
    },
  },
  typography: {
    fontFamily: '"Manrope", sans-serif',
  },
});
