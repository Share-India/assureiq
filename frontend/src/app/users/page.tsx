'use client';
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Chip,
  IconButton,
  Collapse,
  Alert
} from '@mui/material';
import { 
  KeyboardArrowDown as KeyboardArrowDownIcon, 
  KeyboardArrowUp as KeyboardArrowUpIcon,
  Groups as GroupsIcon 
} from '@mui/icons-material';
import { api } from '../../services/api';




function UserRow({ user }: { user: any }) {
  const [open, setOpen] = useState(false);

  return (
    <React.Fragment>
      <TableRow sx={{ '& > *': { borderBottom: 'unset' } }} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
        <TableCell>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={() => setOpen(!open)}
          >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row" className="font-semibold text-slate-700 dark:text-slate-200">
          {user.username}
        </TableCell>
        <TableCell>{user.email}</TableCell>
        <TableCell>
          <Chip 
            label={user.role} 
            color={user.role === 'Admin' ? 'error' : 'primary'} 
            size="small" 
            className="font-bold text-[10px] uppercase tracking-wider" 
          />
        </TableCell>
        <TableCell align="center">
          <Chip label={user.documents?.length || 0} size="small" variant="outlined" />
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2 }} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <Typography variant="subtitle2" gutterBottom component="div" className="font-bold text-slate-600 dark:text-slate-300 mb-3">
                Document Upload History
              </Typography>
              {user.documents && user.documents.length > 0 ? (
                <Table size="small" aria-label="purchases">
                  <TableHead>
                    <TableRow>
                      <TableCell className="font-semibold">Date & Time</TableCell>
                      <TableCell className="font-semibold">Filename</TableCell>
                      <TableCell className="font-semibold">Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {user.documents.map((doc: any) => (
                      <TableRow key={doc.id}>
                        <TableCell className="text-slate-600 dark:text-slate-300">
                          {new Date(doc.uploaded_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-300">{doc.filename}</TableCell>
                        <TableCell>
                          <Chip 
                            label={doc.status} 
                            color={doc.status === 'Extracted' ? 'success' : doc.status === 'Failed' ? 'error' : 'warning'} 
                            size="small" 
                            className="font-bold text-[10px] uppercase"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Typography variant="body2" className="text-slate-500 italic">
                  No documents uploaded by this user yet.
                </Typography>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.get('/auth/users');
      setUsers(res.data);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to load team activity.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className="max-w-6xl mx-auto">
      <Box className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-[#004ac6] text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
          <GroupsIcon />
        </div>
        <div>
          <Typography variant="h4" className="font-black tracking-tight text-slate-800 dark:text-white">
            Team Activity
          </Typography>
          <Typography variant="body2" className="text-slate-500 font-medium">
            Monitor all Sales Executives and their document upload history.
          </Typography>
        </div>
      </Box>

      {errorMsg && (
        <Alert severity="error" className="mb-6 rounded-xl font-medium">
          {errorMsg}
        </Alert>
      )}

      <TableContainer component={Paper} className="rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white/50 dark:bg-[#0b1c30]/50 backdrop-blur-xl shadow-xl">
        <Table aria-label="collapsible table">
          <TableHead className="bg-slate-50 dark:bg-slate-800/80">
            <TableRow>
              <TableCell />
              <TableCell className="font-bold text-slate-700 dark:text-slate-300">Username</TableCell>
              <TableCell className="font-bold text-slate-700 dark:text-slate-300">Email</TableCell>
              <TableCell className="font-bold text-slate-700 dark:text-slate-300">Role</TableCell>
              <TableCell align="center" className="font-bold text-slate-700 dark:text-slate-300">Total Uploads</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <UserRow key={user.id} user={user} />
            ))}
            {users.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={5} align="center" className="py-8 text-slate-500">
                  No team activity found.
                </TableCell>
              </TableRow>
            )}
            {loading && (
              <TableRow>
                <TableCell colSpan={5} align="center" className="py-8 text-slate-500">
                  Loading team data...
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
