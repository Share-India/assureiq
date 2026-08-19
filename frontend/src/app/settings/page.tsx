'use client';
import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, TextField, Button, Alert, Divider
} from '@mui/material';
import { SettingsSuggest as SettingsIcon, Save as SaveIcon } from '@mui/icons-material';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const api = axios.create({ baseURL: API_URL });
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token && config.headers) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const DEFAULT_RULES = [
  { key: 'fire_default_rate', value: '0.001', label: 'Fire Insurance Default Rate (Multiplier)' },
  { key: 'liability_turnover_mult', value: '0.2', label: 'Liability Turnover Multiplier' },
  { key: 'liability_default_rate', value: '0.001', label: 'Liability Default Rate (Multiplier)' },
  { key: 'employee_base_coverage', value: '500000', label: 'Employee Base Coverage (Amount)' },
  { key: 'employee_default_rate', value: '1000', label: 'Employee Default Rate (Flat)' },
  { key: 'marine_turnover_mult', value: '0.3', label: 'Marine Turnover Multiplier' },
  { key: 'marine_default_rate', value: '0.0005', label: 'Marine Default Rate (Multiplier)' },
  { key: 'special_asset_mult', value: '0.8', label: 'Special Asset Multiplier' },
  { key: 'special_default_rate', value: '0.001', label: 'Special Default Rate (Multiplier)' },
  { key: 'profit_turnover_mult', value: '0.5', label: 'Profit Turnover Multiplier' },
  { key: 'profit_default_rate', value: '0.001', label: 'Profit Default Rate (Multiplier)' }
];

export default function RulesEnginePage() {
  const [rules, setRules] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/rules');
      const loadedRules = res.data;
      const rulesMap: any = {};
      loadedRules.forEach((r: any) => { rulesMap[r.key] = r.value; });
      setRules(rulesMap);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed to load dynamic rules: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: string, val: string) => {
    setRules({ ...rules, [key]: val });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    setErrorMsg('');
    try {
      const payload = DEFAULT_RULES.map(dr => ({
        key: dr.key,
        value: rules[dr.key] !== undefined && rules[dr.key] !== '' ? rules[dr.key] : dr.value,
        description: dr.label
      }));
      
      await api.put('/admin/rules', { rules: payload });
      setMessage('Rules successfully updated. Future calculations will use these rates.');
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed to save rules.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box className="max-w-4xl mx-auto">
      <Box className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-500/30">
          <SettingsIcon />
        </div>
        <div>
          <Typography variant="h4" className="font-black tracking-tight text-slate-800 dark:text-white">
            Admin Rules Engine
          </Typography>
          <Typography variant="body2" className="text-slate-500 font-medium">
            Dynamically tune premium calculation base rates and risk multipliers.
          </Typography>
        </div>
      </Box>

      {errorMsg && (
        <Alert severity="error" className="mb-6 rounded-xl font-medium">
          {errorMsg}
        </Alert>
      )}
      {message && (
        <Alert severity="success" className="mb-6 rounded-xl font-medium">
          {message}
        </Alert>
      )}

      <Paper className="p-8 rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white/50 dark:bg-[#0b1c30]/50 backdrop-blur-xl shadow-xl">
        <Typography variant="h6" className="font-bold text-slate-700 dark:text-slate-200 mb-6">
          Global Risk & Coverage Variables
        </Typography>
        
        {loading ? (
          <Typography className="text-slate-500">Loading current configuration...</Typography>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {DEFAULT_RULES.map((rule) => (
              <div key={rule.key}>
                <TextField
                  fullWidth
                  label={rule.label}
                  value={rules[rule.key] !== undefined ? rules[rule.key] : rule.value}
                  onChange={(e) => handleChange(rule.key, e.target.value)}
                  variant="outlined"
                  size="small"
                  
                />
              </div>
            ))}
          </div>
        )}

        <Divider className="my-8" />
        
        <Box className="flex justify-end">
          <Button 
            variant="contained" 
            color="primary"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={saving || loading}
            sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 'bold' }}
            size="large"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
