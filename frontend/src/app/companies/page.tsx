'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Box, Typography, Button, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, TablePagination, TextField, 
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, IconButton, Tooltip, Alert, CircularProgress, Card
} from '@mui/material';
import { api } from '@/services/api';

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

export default function CompaniesPage() {
  const router = useRouter();
  
  // Data State
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Filter State
  const [searchName, setSearchName] = useState('');
  const [searchIndustry, setSearchIndustry] = useState('');
  
  // Pagination State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Dialog Form State
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formName, setFormName] = useState('');
  const [formIndustry, setFormIndustry] = useState('');
  const [formTurnover, setFormTurnover] = useState('');
  const [formEmployees, setFormEmployees] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formPan, setFormPan] = useState('');
  const [formGst, setFormGst] = useState('');
  const [formCin, setFormCin] = useState('');
  const [formCreditRating, setFormCreditRating] = useState('');
  
  // Role Access check
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setCurrentUser(JSON.parse(storedUser));
      }
    }
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.get('/companies', {
        params: {
          name: searchName || undefined,
          industry: searchIndustry || undefined
        }
      });
      setCompanies(res.data);
    } catch (err: any) {
      setErrorMsg('Failed to load companies database.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCompanies();
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormName('');
    setFormIndustry('');
    setFormTurnover('');
    setFormEmployees('');
    setFormAddress('');
    setFormPan('');
    setFormGst('');
    setFormCin('');
    setFormCreditRating('');
    setErrorMsg('');
    setOpenDialog(true);
  };

  const handleOpenEdit = (c: any) => {
    setEditingId(c.id);
    setFormName(c.name);
    setFormIndustry(c.industry || '');
    setFormTurnover(c.turnover ? c.turnover.toString() : '');
    setFormEmployees(c.employee_count ? c.employee_count.toString() : '');
    setFormAddress(c.address || '');
    setFormPan(c.pan || '');
    setFormGst(c.gst || '');
    setFormCin(c.cin || '');
    setFormCreditRating(c.credit_rating || '');
    setErrorMsg('');
    setOpenDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName) {
      setErrorMsg('Company Name is required.');
      return;
    }
    
    const payload = {
      name: formName,
      industry: formIndustry || null,
      turnover: formTurnover ? parseFloat(formTurnover) : null,
      employee_count: formEmployees ? parseInt(formEmployees) : null,
      address: formAddress || null,
      pan: formPan || null,
      gst: formGst || null,
      cin: formCin || null,
      credit_rating: formCreditRating || null
    };

    try {
      if (editingId) {
        await api.put(`/companies/${editingId}`, payload);
      } else {
        await api.post('/companies', payload);
      }
      setOpenDialog(false);
      fetchCompanies();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to save company information.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this company? All documents and analytics will be removed.')) {
      return;
    }
    try {
      await api.delete(`/companies/${id}`);
      fetchCompanies();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete company.');
    }
  };

  const isManagerOrAbove = currentUser?.role === 'Admin';
  const isAdmin = currentUser?.role === 'Admin';

  return (
    <Box className="space-y-6 antialiased font-manrope">
      {/* Header section */}
      <Box className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Box>
          <Typography variant="h4" className="font-extrabold text-[#0b1c30] dark:text-white tracking-tight">
            Companies Database
          </Typography>
          <Typography variant="body2" className="text-slate-400 font-medium">
            Registered corporate clients and active underwriting pipelines.
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          onClick={handleOpenCreate}
          className="bg-[#004ac6] hover:bg-[#0053db] py-3 px-6 rounded-xl font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-transform flex items-center gap-2 text-white"
        >
          <span className="material-symbols-outlined text-md">add</span>
          Add Company
        </Button>
      </Box>

      {/* Filter and Search Panel */}
      <Card className="rounded-2xl border border-white/40 dark:border-slate-800 shadow-xl bg-white/70 dark:bg-slate-900/50 backdrop-blur-2xl p-6">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 items-end">
          <TextField
            label="Search by Name"
            size="small"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="flex-1"
            sx={{
              bgcolor: 'white',
              borderRadius: '12px',
              '& .MuiInputBase-input': { color: 'black' },
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#c3c6d7' }
            }}
          />
          <TextField
            label="Filter by Industry"
            size="small"
            value={searchIndustry}
            onChange={(e) => setSearchIndustry(e.target.value)}
            className="flex-1"
            sx={{
              bgcolor: 'white',
              borderRadius: '12px',
              '& .MuiInputBase-input': { color: 'black' },
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#c3c6d7' }
            }}
          />
          <Button 
            type="submit" 
            variant="outlined" 
            className="font-bold border-[#004ac6] text-[#004ac6] dark:text-[#b4c5ff] hover:bg-blue-50/50 dark:hover:bg-slate-800 rounded-xl py-2 px-6 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">search</span>
            Search
          </Button>
        </form>
      </Card>

      {errorMsg && <Alert severity="error" className="rounded-xl">{errorMsg}</Alert>}

      {/* Corporate Table View */}
      <TableContainer component={Paper} className="rounded-2xl border border-white/40 dark:border-slate-800 shadow-xl bg-white/70 dark:bg-slate-900/50 backdrop-blur-2xl overflow-hidden">
        <Table>
          <TableHead className="bg-slate-50/50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800">
            <TableRow>
              <TableCell className="font-bold text-[#0b1c30] dark:text-[#eeefff]">Company Name</TableCell>
              <TableCell className="font-bold text-[#0b1c30] dark:text-[#eeefff]">Industry</TableCell>
              <TableCell className="font-bold text-[#0b1c30] dark:text-[#eeefff]">Turnover (INR)</TableCell>
              <TableCell className="font-bold text-[#0b1c30] dark:text-[#eeefff]">Employees</TableCell>
              <TableCell className="font-bold text-[#0b1c30] dark:text-[#eeefff]">Credit Rating</TableCell>
              <TableCell className="font-bold text-[#0b1c30] dark:text-[#eeefff]">PAN / GST</TableCell>
              <TableCell className="font-bold text-[#0b1c30] dark:text-[#eeefff]">Registered By</TableCell>
              <TableCell className="font-bold text-[#0b1c30] dark:text-[#eeefff] text-center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center p-12">
                  <CircularProgress size={30} />
                </TableCell>
              </TableRow>
            ) : companies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center p-12 text-slate-400">
                  No registered companies matching search criteria.
                </TableCell>
              </TableRow>
            ) : (
              companies.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((c) => (
                <TableRow key={c.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/10">
                  <TableCell className="font-bold text-[#004ac6] dark:text-[#b4c5ff] cursor-pointer hover:underline" onClick={() => router.push(`/companies/${c.id}`)}>
                    {c.name}
                  </TableCell>
                  <TableCell>{c.industry || '-'}</TableCell>
                  <TableCell className="font-semibold">
                    {c.turnover ? (
                      <Tooltip title={formatIndianShort(c.turnover)} arrow>
                        <span className="cursor-help border-b border-dashed border-slate-300 dark:border-slate-700">
                          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(c.turnover)}
                        </span>
                      </Tooltip>
                    ) : '-'}
                  </TableCell>
                  <TableCell>{c.employee_count || '-'}</TableCell>
                  <TableCell className="font-bold text-blue-600 dark:text-blue-450">{c.credit_rating || '-'}</TableCell>
                  <TableCell>{c.pan || '-'} / {c.gst || '-'}</TableCell>
                  <TableCell className="font-semibold text-slate-600 dark:text-slate-350">{c.created_by_username || 'System'}</TableCell>
                  <TableCell className="text-center">
                    <Box className="flex justify-center gap-1">
                      <Tooltip title="View Detailed Risk Assessment">
                        <IconButton onClick={() => router.push(`/companies/${c.id}`)} color="primary" size="small">
                          <span className="material-symbols-outlined">visibility</span>
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title={isManagerOrAbove ? "Edit Profile" : "Requires Admin role"}>
                        <span>
                          <IconButton 
                            onClick={() => handleOpenEdit(c)} 
                            color="secondary" 
                            size="small"
                            disabled={!isManagerOrAbove}
                          >
                            <span className="material-symbols-outlined">edit</span>
                          </IconButton>
                        </span>
                      </Tooltip>

                      <Tooltip title={isAdmin ? "Delete Company" : "Requires Admin role"}>
                        <span>
                          <IconButton 
                            onClick={() => handleDelete(c.id)} 
                            color="error" 
                            size="small"
                            disabled={!isAdmin}
                          >
                            <span className="material-symbols-outlined">delete</span>
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={companies.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, val) => setPage(val)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </TableContainer>

      {/* Create / Edit Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth slotProps={{ paper: { className: "rounded-2xl border border-white/40 dark:border-slate-800 shadow-xl bg-white dark:bg-[#152b48]" } }}>
        <DialogTitle className="font-extrabold text-[#0b1c30] dark:text-white text-xl">
          {editingId ? 'Edit Company Profile' : 'Register New Corporate Client'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent className="divide-y divide-slate-100 dark:divide-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
              <div>
                <TextField
                  label="Company Name"
                  fullWidth
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  slotProps={{ input: { className: "rounded-xl text-slate-900 dark:text-white" } }}
                />
              </div>
              <div>
                <TextField
                  label="Industry / Sector"
                  fullWidth
                  value={formIndustry}
                  onChange={(e) => setFormIndustry(e.target.value)}
                  slotProps={{ input: { className: "rounded-xl text-slate-900 dark:text-white" } }}
                />
              </div>
              <div>
                <TextField
                  label="Annual Turnover (INR)"
                  type="number"
                  fullWidth
                  value={formTurnover}
                  onChange={(e) => setFormTurnover(e.target.value)}
                  slotProps={{ input: { className: "rounded-xl text-slate-900 dark:text-white" } }}
                />
              </div>
              <div>
                <TextField
                  label="Workforce Size (Employee Count)"
                  type="number"
                  fullWidth
                  value={formEmployees}
                  onChange={(e) => setFormEmployees(e.target.value)}
                  slotProps={{ input: { className: "rounded-xl text-slate-900 dark:text-white" } }}
                />
              </div>
              <div>
                <TextField
                  label="Credit Rating"
                  fullWidth
                  value={formCreditRating}
                  onChange={(e) => setFormCreditRating(e.target.value)}
                  placeholder="e.g. AAA, AA+, A-, BBB"
                  slotProps={{ input: { className: "rounded-xl text-slate-900 dark:text-white" } }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4">
              <div>
                <TextField
                  label="PAN Card Number"
                  fullWidth
                  value={formPan}
                  onChange={(e) => setFormPan(e.target.value)}
                  slotProps={{ htmlInput: { maxLength: 10 }, input: { className: "rounded-xl text-slate-900 dark:text-white" } }}
                />
              </div>
              <div>
                <TextField
                  label="GSTIN Number"
                  fullWidth
                  value={formGst}
                  onChange={(e) => setFormGst(e.target.value)}
                  slotProps={{ htmlInput: { maxLength: 15 }, input: { className: "rounded-xl text-slate-900 dark:text-white" } }}
                />
              </div>
              <div>
                <TextField
                  label="CIN Number"
                  fullWidth
                  value={formCin}
                  onChange={(e) => setFormCin(e.target.value)}
                  slotProps={{ htmlInput: { maxLength: 21 }, input: { className: "rounded-xl text-slate-900 dark:text-white" } }}
                />
              </div>
              <div className="col-span-1 sm:col-span-3">
                <TextField
                  label="Business Registered Address"
                  multiline
                  rows={2}
                  fullWidth
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  slotProps={{ input: { className: "rounded-xl text-slate-900 dark:text-white" } }}
                />
              </div>
            </div>
          </DialogContent>
          <DialogActions className="p-4 border-t border-slate-100 dark:border-slate-800">
            <Button onClick={() => setOpenDialog(false)} color="inherit" className="font-bold">
              Cancel
            </Button>
            <Button type="submit" variant="contained" className="bg-[#004ac6] hover:bg-[#0053db] font-bold text-white rounded-xl py-2 px-6">
              Save Client Profile
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
