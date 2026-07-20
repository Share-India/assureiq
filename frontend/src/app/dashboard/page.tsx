'use client';
import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Grid, Card, CardContent, FormControl, 
  InputLabel, Select, MenuItem, CircularProgress, Paper, Avatar, Tooltip as MuiTooltip 
} from '@mui/material';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, 
  Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area 
} from 'recharts';
import { api } from '@/services/api';

const COLORS = ['#004ac6', '#fd761a', '#2b6cb0', '#2f855a'];

const formatIndianShort = (num: any): string => {
  if (num === null || num === undefined || isNaN(Number(num))) return '-';
  const val = Number(num);
  if (val === 0) return '₹0';
  const absVal = Math.abs(val);
  const prefix = val < 0 ? '-₹' : '₹';
  
  if (absVal >= 10000000) {
    const cr = absVal / 10000000;
    const formatted = cr >= 1000 ? cr.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : (cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(2));
    return `${prefix}${formatted} Cr`;
  }
  if (absVal >= 100000) {
    const lakh = absVal / 100000;
    const formatted = lakh % 1 === 0 ? lakh.toFixed(0) : lakh.toFixed(2);
    return `${prefix}${formatted} Lakh`;
  }
  return `${prefix}${absVal.toLocaleString('en-IN')}`;
};

export default function DashboardPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    const fetchCompanies = async () => {
      try {
        const res = await api.get('/companies');
        setCompanies(res.data);
        if (res.data.length > 0) {
          setSelectedCompanyId(res.data[0].id.toString());
        }
      } catch (err) {
        console.error('Failed to load companies:', err);
      }
    };
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (!selectedCompanyId) return;
    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/companies/${selectedCompanyId}/dashboard`);
        setDashboardData(res.data);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [selectedCompanyId]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  if (!hasMounted) return null;

  return (
    <Box className="space-y-6 antialiased font-manrope">
      {/* Header and selector */}
      <Box className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Box>
          <Typography variant="h4" className="font-extrabold text-[#0b1c30] dark:text-white tracking-tight">
            Portfolio Analytics
          </Typography>
          <Typography variant="body2" className="text-slate-400 font-medium">
            Real-time underwriting opportunities and asset distributions.
          </Typography>
        </Box>
        <FormControl className="w-64">
          <InputLabel>Select Active Company</InputLabel>
          <Select
            value={selectedCompanyId}
            label="Select Active Company"
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="rounded-xl bg-white dark:bg-slate-900/50"
          >
            {companies.map((c) => (
              <MenuItem key={c.id} value={c.id.toString()}>
                {c.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {loading && (
        <Box className="flex items-center justify-center p-20">
          <CircularProgress />
        </Box>
      )}

      {!loading && !dashboardData && (
        <Paper className="p-12 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl bg-white/70 dark:bg-slate-900/50 backdrop-blur-2xl">
          <Typography className="text-slate-400 font-bold">
            Please register a company and upload a financial document to analyze data.
          </Typography>
        </Paper>
      )}

      {!loading && dashboardData && (
        <>
          {/* Key Metrics Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Assets */}
            <div>
              <Card className="rounded-2xl border border-white/40 dark:border-slate-800 shadow-xl bg-white/70 dark:bg-slate-900/50 backdrop-blur-2xl hover:translate-y-[-2px] transition-transform">
                <CardContent className="flex items-center gap-4 p-5">
                  <Avatar className="bg-blue-100 dark:bg-blue-900/20 text-[#004ac6] dark:text-[#b4c5ff] w-12 h-12 rounded-xl">
                    <span className="material-symbols-outlined">account_balance</span>
                  </Avatar>
                  <Box>
                    <Typography variant="caption" className="text-slate-400 font-extrabold uppercase tracking-wide">
                      TOTAL ASSETS
                    </Typography>
                    <Typography variant="h6" className="font-extrabold text-[#0b1c30] dark:text-white mt-0.5">
                      <MuiTooltip title={formatIndianShort(dashboardData.metrics.total_assets)} arrow><span className="cursor-help border-b border-dashed border-slate-300 dark:border-slate-700">{formatCurrency(dashboardData.metrics.total_assets)}</span></MuiTooltip>
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </div>

            {/* Total Liabilities */}
            <div>
              <Card className="rounded-2xl border border-white/40 dark:border-slate-800 shadow-xl bg-white/70 dark:bg-slate-900/50 backdrop-blur-2xl hover:translate-y-[-2px] transition-transform">
                <CardContent className="flex items-center gap-4 p-5">
                  <Avatar className="bg-red-100 dark:bg-red-900/20 text-red-600 w-12 h-12 rounded-xl">
                    <span className="material-symbols-outlined">warning</span>
                  </Avatar>
                  <Box>
                    <Typography variant="caption" className="text-slate-400 font-extrabold uppercase tracking-wide">
                      TOTAL LIABILITIES
                    </Typography>
                    <Typography variant="h6" className="font-extrabold text-[#0b1c30] dark:text-white mt-0.5">
                      <MuiTooltip title={formatIndianShort(dashboardData.metrics.total_liability)} arrow><span className="cursor-help border-b border-dashed border-slate-300 dark:border-slate-700">{formatCurrency(dashboardData.metrics.total_liability)}</span></MuiTooltip>
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </div>

            {/* Employee Benefits */}
            <div>
              <Card className="rounded-2xl border border-white/40 dark:border-slate-800 shadow-xl bg-white/70 dark:bg-slate-900/50 backdrop-blur-2xl hover:translate-y-[-2px] transition-transform">
                <CardContent className="flex items-center gap-4 p-5">
                  <Avatar className="bg-green-100 dark:bg-green-900/20 text-green-600 w-12 h-12 rounded-xl">
                    <span className="material-symbols-outlined">group</span>
                  </Avatar>
                  <Box>
                    <Typography variant="caption" className="text-slate-400 font-extrabold uppercase tracking-wide">
                      WORKFORCE EXPENSE
                    </Typography>
                    <Typography variant="h6" className="font-extrabold text-[#0b1c30] dark:text-white mt-0.5">
                      <MuiTooltip title={formatIndianShort(dashboardData.metrics.employee_benefits)} arrow><span className="cursor-help border-b border-dashed border-slate-300 dark:border-slate-700">{formatCurrency(dashboardData.metrics.employee_benefits)}</span></MuiTooltip>
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </div>

            {/* Risk Score */}
            <div>
              <Card className="rounded-2xl border border-white/40 dark:border-slate-800 shadow-xl bg-white/70 dark:bg-slate-900/50 backdrop-blur-2xl hover:translate-y-[-2px] transition-transform">
                <CardContent className="flex items-center gap-4 p-5">
                  <Avatar className="bg-amber-100 dark:bg-amber-900/20 text-amber-600 w-12 h-12 rounded-xl">
                    <span className="material-symbols-outlined">security</span>
                  </Avatar>
                  <Box>
                    <Typography variant="caption" className="text-slate-400 font-extrabold uppercase tracking-wide">
                      UNDERWRITING RISK
                    </Typography>
                    <Typography variant="h6" className="font-extrabold text-[#0b1c30] dark:text-white mt-0.5">
                      {dashboardData.metrics.risk_score.toFixed(1)}%
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Premium Opportunity Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
            <div className="col-span-1">
              <Card className="rounded-2xl border border-white/40 dark:border-slate-800 shadow-xl bg-gradient-to-br from-[#0b1c30] to-blue-950 text-white p-6">
                <Typography className="text-slate-400 text-xs font-extrabold tracking-wider uppercase">
                  ESTIMATED PREMIUM REVENUE
                </Typography>
                <Typography variant="h4" className="font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-emerald-300 mt-3">
                  <MuiTooltip title={formatIndianShort(dashboardData.metrics.total_premium_opportunity)} arrow><span className="cursor-help border-b border-dashed border-slate-300 dark:border-slate-700">{formatCurrency(dashboardData.metrics.total_premium_opportunity)}</span></MuiTooltip>
                </Typography>
                <Box className="mt-6 flex justify-between items-center text-xs border-t border-slate-700/50 pt-4">
                  <span className="text-slate-400 font-medium">Maximum Ceiling:</span>
                  <MuiTooltip title={formatIndianShort(dashboardData.metrics.max_premium_opportunity)} arrow><span className="font-bold text-amber-300 cursor-help border-b border-dashed border-amber-300/40">{formatCurrency(dashboardData.metrics.max_premium_opportunity)}</span></MuiTooltip>
                </Box>
                <Box className="mt-2 flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Insurance Penetration:</span>
                  <span className="font-bold text-teal-300">{dashboardData.metrics.insurance_penetration.toFixed(1)}%</span>
                </Box>
              </Card>
            </div>

            <div className="col-span-1 md:col-span-2">
              <Card className="rounded-2xl border border-white/40 dark:border-slate-800 shadow-xl bg-white/70 dark:bg-slate-900/50 backdrop-blur-2xl p-6">
                <Typography variant="h6" className="font-extrabold text-[#0b1c30] dark:text-white mb-4">
                  Premium Range Trend Line
                </Typography>
                <Box className="h-64">
                  {dashboardData.charts.trendChart.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dashboardData.charts.trendChart}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="product" tick={{ fontSize: 10 }} />
                        <YAxis tickFormatter={(v) => formatIndianShort(v)} width={80} />
                        <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                        <Legend />
                        <Area type="monotone" dataKey="Min Premium" stroke="#ED8936" fill="#FEEBC8" />
                        <Area type="monotone" dataKey="Estimated Premium" stroke="#3182CE" fill="#EBF8FF" />
                        <Area type="monotone" dataKey="Max Premium" stroke="#E53E3E" fill="#FED7D7" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <Box className="flex items-center justify-center h-full text-slate-400 text-sm">
                      No policy calculations available.
                    </Box>
                  )}
                </Box>
              </Card>
            </div>
          </div>

          {/* Double Chart Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
            {/* Pie Chart: Assets Distribution */}
            <div>
              <Card className="rounded-2xl border border-white/40 dark:border-slate-800 shadow-xl bg-white/70 dark:bg-slate-900/50 backdrop-blur-2xl p-6">
                <Typography variant="h6" className="font-extrabold text-[#0b1c30] dark:text-white mb-4">
                  Asset & Liability Allocation
                </Typography>
                <Box className="h-72 flex justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dashboardData.charts.pieChart}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {dashboardData.charts.pieChart.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </Card>
            </div>

            {/* Bar Chart: Estimated Premium vs Coverage */}
            <div>
              <Card className="rounded-2xl border border-white/40 dark:border-slate-800 shadow-xl bg-white/70 dark:bg-slate-900/50 backdrop-blur-2xl p-6">
                <Typography variant="h6" className="font-extrabold text-[#0b1c30] dark:text-white mb-4">
                  Estimated Premiums by Cover
                </Typography>
                <Box className="h-72">
                  {dashboardData.charts.barChart.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dashboardData.charts.barChart}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="product" tick={{ fontSize: 10 }} />
                        <YAxis tickFormatter={(v) => formatIndianShort(v)} width={80} />
                        <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                        <Legend />
                        <Bar dataKey="Estimated" fill="#004ac6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <Box className="flex items-center justify-center h-full text-slate-400 text-sm">
                      No calculated coverages found.
                    </Box>
                  )}
                </Box>
              </Card>
            </div>
          </div>
        </>
      )}
    </Box>
  );
}
