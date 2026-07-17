'use client';
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Box, Typography, Grid, Card, CardContent, Button, Paper, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  CircularProgress, Alert, Chip, Divider, Tab, Tabs, TextField, Tooltip, Collapse
} from '@mui/material';
import { api } from '@/services/api';

const formatIndianShort = (num: any): string => {
  if (num === null || num === undefined || isNaN(Number(num))) return '-';
  const val = Number(num);
  const absVal = Math.abs(val);
  if (absVal >= 10000000) {
    return `${(val / 10000000).toFixed(2).replace(/\.00$/, '').replace(/(\\.\\d)0$/, '$1')} Cr`;
  }
  if (absVal >= 100000) {
    return `${(val / 100000).toFixed(2).replace(/\.00$/, '').replace(/(\\.\\d)0$/, '$1')} L`;
  }
  if (absVal >= 1000) {
    return `${(val / 1000).toFixed(2).replace(/\.00$/, '').replace(/(\\.\\d)0$/, '$1')} K`;
  }
  return val.toLocaleString('en-IN');
};

export default function CompanyDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  
  // Data state
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [expandedRecId, setExpandedRecId] = useState<number | null>(null);
  
  // File upload state
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchCompanyDetail();
  }, [id]);

  const fetchCompanyDetail = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.get(`/companies/${id}`);
      setCompany(res.data);
    } catch (err: any) {
      setErrorMsg('Failed to load company detailed profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(e.target.files);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFiles || selectedFiles.length === 0) {
      alert('Please select files first.');
      return;
    }
    setUploading(true);
    setErrorMsg('');
    try {
      const formData = new FormData();
      for (let i = 0; i < selectedFiles.length; i++) {
        formData.append('files', selectedFiles[i]);
      }
      await api.post(`/companies/${id}/documents/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSelectedFiles(null);
      fetchCompanyDetail();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to upload files.');
    } finally {
      setUploading(false);
    }
  };

  const handleExtract = async () => {
    setExtracting(true);
    setErrorMsg('');
    try {
      await api.post(`/companies/${id}/extract`);
      fetchCompanyDetail();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Gemini extraction engine failed.');
    } finally {
      setExtracting(false);
    }
  };

  const handleRecalculate = async () => {
    setErrorMsg('');
    try {
      await api.post(`/companies/${id}/calculate`);
      fetchCompanyDetail();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Calculation engine failed.');
    }
  };

  const handleDownloadReport = async () => {
    try {
      const res = await api.get(`/companies/${id}/report`, {
        responseType: 'blob'
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `${company.name.replace(/\s+/g, '_')}_Risk_Report.pdf`;
      link.click();
    } catch (err) {
      alert('Failed to generate and download PDF report.');
    }
  };

  const formatCurrency = (val: any, isCount = false) => {
    if (val === null || val === undefined || isNaN(Number(val))) return '-';
    const num = Number(val);
    let formatted = "";
    if (isCount) {
      formatted = new Intl.NumberFormat('en-IN', {
        maximumFractionDigits: 0
      }).format(num);
    } else {
      formatted = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
      }).format(num);
    }
    return (
      <Tooltip title={formatIndianShort(num) + (isCount ? " Employees" : "")} arrow>
        <span className="cursor-help border-b border-dashed border-slate-300 dark:border-slate-700">{formatted}</span>
      </Tooltip>
    );
  };

  if (loading && !company) {
    return (
      <Box className="flex items-center justify-center p-20">
        <CircularProgress />
      </Box>
    );
  }

  if (!company) {
    return (
      <Box className="p-8">
        <Alert severity="error">Company details could not be retrieved.</Alert>
      </Box>
    );
  }

  const hasDocuments = company.documents?.length > 0;
  const hasExtractedData = company.extracted_data?.length > 0;

  return (
    <Box className="space-y-6 antialiased font-manrope">
      {/* Header Profile Title card */}
      <Box className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Box>
          <Typography variant="h4" className="font-extrabold text-[#0b1c30] dark:text-white tracking-tight">
            {company.name}
          </Typography>
          <Typography variant="body2" className="text-slate-400 font-medium mt-0.5">
            Corporate Profile & Strategic Underwriting Assessment Workspace
          </Typography>
        </Box>
        <Box className="flex gap-2">
          {hasExtractedData && (
            <Button 
              variant="contained" 
              onClick={handleDownloadReport}
              className="bg-emerald-600 hover:bg-emerald-700 py-3 px-6 rounded-xl font-bold shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform flex items-center gap-2 text-white"
            >
              <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
              Export Risk PDF
            </Button>
          )}
          <Button 
            variant="outlined" 
            onClick={fetchCompanyDetail}
            className="border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-300 hover:bg-slate-50/50 rounded-xl px-5 py-2.5 font-bold flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">sync</span>
            Refresh
          </Button>
        </Box>
      </Box>

      {errorMsg && <Alert severity="error" className="rounded-xl">{errorMsg}</Alert>}

      {/* Tabs Segmented Control Layout */}
      <div className="bg-slate-100 dark:bg-slate-900/50 p-1 rounded-xl flex max-w-lg border border-slate-200/50 dark:border-slate-800">
        <button 
          type="button"
          onClick={() => setActiveTab(0)}
          className={`flex-1 py-2.5 font-bold text-sm rounded-lg transition-all ${
            activeTab === 0 
              ? 'bg-white dark:bg-slate-800 text-[#0b1c30] dark:text-white shadow-sm' 
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Company Profile
        </button>
        <button 
          type="button"
          onClick={() => setActiveTab(1)}
          className={`flex-1 py-2.5 font-bold text-sm rounded-lg transition-all ${
            activeTab === 1 
              ? 'bg-white dark:bg-slate-800 text-[#0b1c30] dark:text-white shadow-sm' 
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Extracted Financials
        </button>
        <button 
          type="button"
          onClick={() => setActiveTab(2)}
          className={`flex-1 py-2.5 font-bold text-sm rounded-lg transition-all ${
            activeTab === 2 
              ? 'bg-white dark:bg-slate-800 text-[#0b1c30] dark:text-white shadow-sm' 
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Underwriting Matches
        </button>
      </div>

      {/* Tab 0: Company Profile & Document Uploads */}
      {activeTab === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Card className="rounded-2xl border border-white/40 dark:border-slate-800 shadow-xl bg-white/70 dark:bg-slate-900/50 backdrop-blur-2xl p-6 space-y-4">
              <Typography variant="h6" className="font-extrabold text-[#0b1c30] dark:text-white">
                Corporate Credentials
              </Typography>
              <Divider />
              <div className="grid grid-cols-3 gap-y-3 gap-x-2 text-sm">
                <div className="font-bold text-slate-500 col-span-1">Industry:</div>
                <div className="font-medium text-slate-800 dark:text-slate-200 col-span-2">{company.industry || '-'}</div>

                <div className="font-bold text-slate-500 col-span-1">Annual Turnover:</div>
                <div className="font-bold text-emerald-600 col-span-2">{formatCurrency(company.turnover)}</div>

                <div className="font-bold text-slate-500 col-span-1">Employee Count:</div>
                <div className="font-medium text-slate-800 dark:text-slate-200 col-span-2">{company.employee_count || '-'}</div>

                <div className="font-bold text-slate-500 col-span-1">PAN Number:</div>
                <div className="font-mono text-slate-800 dark:text-slate-200 col-span-2">{company.pan || '-'}</div>

                <div className="font-bold text-slate-500 col-span-1">GSTIN Number:</div>
                <div className="font-mono text-slate-800 dark:text-slate-200 col-span-2">{company.gst || '-'}</div>

                <div className="font-bold text-slate-500 col-span-1">CIN Number:</div>
                <div className="font-mono text-slate-800 dark:text-slate-200 col-span-2">{company.cin || '-'}</div>

                <div className="font-bold text-slate-500 col-span-1">Credit Rating:</div>
                <div className="font-bold text-blue-600 dark:text-blue-450 col-span-2">{company.credit_rating || '-'}</div>

                <div className="font-bold text-slate-500 col-span-1">Address:</div>
                <div className="font-medium text-slate-800 dark:text-slate-200 col-span-2">{company.address || '-'}</div>
              </div>
            </Card>
          </div>

          {/* Document Upload Area */}
          <div>
            <Card className="rounded-2xl border border-white/40 dark:border-slate-800 shadow-xl bg-white/70 dark:bg-slate-900/50 backdrop-blur-2xl p-6 space-y-4">
              <Typography variant="h6" className="font-extrabold text-[#0b1c30] dark:text-white">
                Upload Financial Documents
              </Typography>
              <Divider />
              
              <form onSubmit={handleUpload} className="space-y-4">
                <Box className="border-2 border-dashed border-blue-300 dark:border-slate-700 rounded-2xl p-8 text-center bg-blue-50/20 dark:bg-slate-900/20">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg"
                    id="doc-upload-file"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <label htmlFor="doc-upload-file" className="cursor-pointer space-y-2 block">
                    <span className="material-symbols-outlined text-4xl text-blue-500/80">cloud_upload</span>
                    <Typography className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      Click to select files
                    </Typography>
                    <Typography variant="caption" className="text-slate-400 block mt-1">
                      Supported: PDF, Excel, CSV, PNG, JPG, JPEG
                    </Typography>
                  </label>
                  {selectedFiles && (
                    <Box className="mt-4 text-xs font-bold text-blue-600 dark:text-blue-400">
                      Selected {selectedFiles.length} files to upload.
                    </Box>
                  )}
                </Box>
                <Button 
                  type="submit" 
                  variant="contained" 
                  fullWidth 
                  disabled={uploading || !selectedFiles}
                  className="bg-[#004ac6] hover:bg-[#0053db] py-3 rounded-xl font-bold text-white shadow-md shadow-blue-500/10"
                >
                  {uploading ? <CircularProgress size={24} color="inherit" /> : 'Upload Files'}
                </Button>
              </form>

              {/* Uploaded History List */}
              <Box className="space-y-2 mt-4">
                <Typography variant="subtitle2" className="font-extrabold text-slate-700 dark:text-slate-300">
                  Document Processing History
                </Typography>
                {company.documents?.length === 0 ? (
                  <Typography variant="caption" className="text-slate-400 block italic">
                    No documents uploaded yet.
                  </Typography>
                ) : (
                  <Box className="max-h-40 overflow-y-auto space-y-2 pr-1">
                    {company.documents.map((doc: any) => (
                      <Box key={doc.id} className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-800">
                        <Box className="flex flex-col truncate max-w-[180px]">
                          <span className="font-semibold text-slate-750 dark:text-slate-200 truncate">{doc.filename}</span>
                          <span className="text-[10px] text-slate-400 font-medium mt-0.5">By: {doc.uploaded_by_username || 'System'}</span>
                        </Box>
                        <Box className="flex items-center gap-2">
                          <Chip 
                            label={doc.status} 
                            color={doc.status === 'Extracted' ? 'success' : doc.status === 'Processing' ? 'warning' : doc.status === 'Failed' ? 'error' : 'default'} 
                            size="small" 
                            className="text-[10px] font-bold"
                          />
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>

              {hasDocuments && (
                <Button 
                  variant="contained" 
                  color="secondary" 
                  fullWidth 
                  disabled={extracting}
                  onClick={handleExtract}
                  className="bg-purple-600 hover:bg-purple-700 py-3 rounded-xl font-bold text-white shadow-md mt-4 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">cognition</span>
                  {extracting ? <CircularProgress size={24} color="inherit" /> : 'Trigger Gemini Extraction Pipeline'}
                </Button>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Tab 1: Extracted & Predicted Financials Table */}
      {activeTab === 1 && (
        <Box className="space-y-6">
          {company.predicted_values?.length > 0 && (
            <Alert severity="warning" className="rounded-2xl border border-amber-200/40 bg-amber-500/10 text-amber-800 dark:text-amber-300 font-medium">
              <Typography variant="subtitle2" className="font-bold">Missing Values Estimated by Gemini AI</Typography>
              Critical indicators were missing in the filings. Calculated values using sector averages are shown in the predictive estimates table below.
            </Alert>
          )}

          <Card className="rounded-2xl border border-white/40 dark:border-slate-800 shadow-xl bg-white/70 dark:bg-slate-900/50 backdrop-blur-2xl p-6 space-y-4">
            <Typography variant="h6" className="font-extrabold text-[#0b1c30] dark:text-white">
              Extracted Financial Indicators
            </Typography>
            <TableContainer component={Paper} className="shadow-none border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <Table size="small">
                <TableHead className="bg-slate-50/50 dark:bg-slate-950/20">
                  <TableRow>
                    <TableCell className="font-bold">Field Name</TableCell>
                    <TableCell className="font-bold">Category</TableCell>
                    <TableCell className="font-bold">Extracted Value</TableCell>
                    <TableCell className="font-bold">Confidence Score</TableCell>
                    <TableCell className="font-bold">Source Location</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {!hasExtractedData ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center p-8 text-slate-400">
                        No financial data has been extracted yet. Please upload files and trigger Gemini.
                      </TableCell>
                    </TableRow>
                  ) : (
                    company.extracted_data.map((rec: any) => {
                      if (rec.field_name === 'risk_factors') return null;
                      const isNum = rec.numeric_value !== null;
                      return (
                        <TableRow key={rec.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/10">
                          <TableCell className="font-bold text-slate-700 dark:text-slate-300">{rec.field_name.replace(/_/g, ' ').toUpperCase()}</TableCell>
                          <TableCell><Chip label={rec.field_category} size="small" className="text-[10px] font-bold" /></TableCell>
                          <TableCell className={isNum ? 'font-bold text-slate-800 dark:text-slate-100' : ''}>
                            {isNum ? formatCurrency(rec.numeric_value) : rec.extracted_value}
                          </TableCell>
                          <TableCell className="font-semibold text-slate-500">{(rec.confidence * 100).toFixed(1)}%</TableCell>
                          <TableCell className="text-slate-500">{rec.source_page || '-'}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>

          {/* Predicted Values Table */}
          {company.predicted_values?.length > 0 && (
            <Card className="rounded-2xl border border-rose-200/40 dark:border-rose-950/20 bg-rose-50/5 dark:bg-rose-950/5 shadow-xl p-6 space-y-4">
              <Typography variant="h6" className="font-extrabold text-rose-800 dark:text-rose-300">
                Gemini Model Estimates (Ratios-based Predictions)
              </Typography>
              <TableContainer component={Paper} className="shadow-none border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <Table size="small">
                  <TableHead className="bg-rose-50/50 dark:bg-rose-950/20">
                    <TableRow>
                      <TableCell className="font-bold text-rose-900 dark:text-rose-200">Indicator</TableCell>
                      <TableCell className="font-bold text-rose-900 dark:text-rose-200">Lower Estimate (Min)</TableCell>
                      <TableCell className="font-bold text-rose-900 dark:text-rose-200">Likely Estimate (Expected)</TableCell>
                      <TableCell className="font-bold text-rose-900 dark:text-rose-200">Upper Estimate (Max)</TableCell>
                      <TableCell className="font-bold text-rose-900 dark:text-rose-200">Estimation Confidence</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {company.predicted_values.map((pred: any) => {
                      const isCount = pred.field_name.toLowerCase().includes('count') || pred.field_name.toLowerCase().includes('employee');
                      return (
                        <TableRow key={pred.id} className="hover:bg-rose-50/10">
                          <TableCell className="font-bold text-slate-800 dark:text-slate-200">{pred.field_name.replace(/_/g, ' ').toUpperCase()}</TableCell>
                          <TableCell className="text-slate-600 dark:text-slate-400">{formatCurrency(pred.min_value, isCount)}</TableCell>
                          <TableCell className="font-bold text-rose-600 dark:text-rose-400">{formatCurrency(pred.expected_value, isCount)}</TableCell>
                          <TableCell className="text-slate-600 dark:text-slate-400">{formatCurrency(pred.max_value, isCount)}</TableCell>
                          <TableCell className="font-semibold text-slate-500">{(pred.confidence * 100).toFixed(1)}%</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          )}
        </Box>
      )}

      {/* Tab 2: Recommendations and Premiums */}
      {activeTab === 2 && (
        <Box className="space-y-6">
          <Box className="flex justify-between items-center">
            <Typography variant="h6" className="font-extrabold text-[#0b1c30] dark:text-white">
              Insurance Risk Opportunities
            </Typography>
            {hasExtractedData && (
              <Button 
                variant="outlined" 
                onClick={handleRecalculate}
                className="border-slate-200 text-slate-600 hover:bg-slate-100/50 rounded-xl px-4 py-2 font-bold flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">calculate</span>
                Recalculate Premiums
              </Button>
            )}
          </Box>

          {company.recommendations?.length === 0 ? (
            <Paper className="p-12 text-center border border-dashed border-slate-300 dark:border-slate-700">
              <Typography className="text-slate-500 dark:text-slate-400 font-medium">
                No active recommendations. Please extract financial data to run the recommendations model.
              </Typography>
            </Paper>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {company.recommendations.map((rec: any) => {
                const calc = rec.premium_calculations?.[0];
                return (
                  <div key={rec.id}>
                    <Card className="rounded-2xl border border-white/40 dark:border-slate-800 shadow-xl bg-white/70 dark:bg-slate-900/50 backdrop-blur-2xl flex flex-col h-full hover:shadow-2xl transition-all">
                      <CardContent className="p-6 flex-1 space-y-4">
                        <Box className="flex justify-between items-start gap-4">
                          <Box>
                            <Typography variant="h6" className="font-extrabold text-[#0b1c30] dark:text-white">
                              {rec.product_name}
                            </Typography>
                            <Typography variant="caption" className="text-slate-400 font-medium block mt-0.5">
                              {rec.product_description || 'Corporate liability insurance coverage'}
                            </Typography>
                          </Box>
                          <Chip 
                            label={rec.priority} 
                            color={rec.priority === 'High' ? 'error' : rec.priority === 'Medium' ? 'warning' : 'default'}
                            size="small" 
                            className="font-bold text-[10px]"
                          />
                        </Box>
                        <Divider />

                        <Box className="space-y-3 text-xs">
                          <Box>
                            <strong className="text-slate-500 font-bold block mb-1">Risk Exposure:</strong>
                            <span className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">{rec.risk_description || 'Physical damage/lawsuit risk.'}</span>
                          </Box>
                          <Box>
                            <strong className="text-slate-500 font-bold block mb-1">Recommendation Reason:</strong>
                            <span className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">{rec.recommendation_reason}</span>
                          </Box>
                          <Box>
                            <strong className="text-slate-500 font-bold block mb-1">Business Operational Impact:</strong>
                            <span className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">{rec.business_impact}</span>
                          </Box>
                        </Box>
                        
                        <Divider />

                        {calc ? (
                          <Box className="bg-blue-50/50 dark:bg-slate-900/40 p-4 rounded-xl space-y-2 border border-blue-100/50 dark:border-slate-800">
                            <Box className="flex justify-between items-center text-xs text-slate-500 font-semibold">
                              <span>Recommended Cover:</span>
                              <strong className="text-[#0b1c30] dark:text-white font-bold">{formatCurrency(rec.coverage_amount)}</strong>
                            </Box>
                            <Box className="flex justify-between items-center text-sm font-bold border-t border-slate-200/50 dark:border-slate-800 pt-2 text-[#004ac6] dark:text-[#b4c5ff]">
                              <span>Estimated Premium:</span>
                              <span>{formatCurrency(calc.estimated_premium)}</span>
                            </Box>
                            <Box className="flex justify-between items-center text-[10px] text-slate-400 pt-1 font-medium">
                              <span>Min Premium: {formatCurrency(calc.min_premium)}</span>
                              <span>Max Premium: {formatCurrency(calc.max_premium)}</span>
                            </Box>
                            <Box className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-200/50 dark:border-slate-800/60">
                              Formula: {calc.calculation_formula}
                            </Box>

                            {/* Subcategories Expandable panel */}
                            {rec.sub_categories && rec.sub_categories.length > 0 && (
                              <Box className="mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-800/60">
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => setExpandedRecId(expandedRecId === rec.id ? null : rec.id)}
                                  className="text-[11px] font-bold py-1 px-3 border-blue-200/50 hover:bg-blue-50/50 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-lg flex items-center gap-1"
                                  style={{ textTransform: 'none' }}
                                >
                                  <span className="material-symbols-outlined text-[14px]">
                                    {expandedRecId === rec.id ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
                                  </span>
                                  {expandedRecId === rec.id ? 'Hide Sub-Categories' : 'View Sub-Categories'}
                                </Button>
                                
                                <Collapse in={expandedRecId === rec.id} className="mt-3">
                                  <TableContainer component={Paper} className="shadow-none border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/40 dark:bg-slate-950/20">
                                    <Table size="small">
                                      <TableHead className="bg-slate-100/50 dark:bg-slate-800/30">
                                        <TableRow>
                                          <TableCell className="text-[9px] font-extrabold uppercase py-1 px-2 text-slate-500">Sub-category</TableCell>
                                          <TableCell className="text-[9px] font-extrabold uppercase py-1 px-2 text-slate-500">Cover</TableCell>
                                          <TableCell className="text-[9px] font-extrabold uppercase py-1 px-2 text-slate-500">Premium</TableCell>
                                          <TableCell className="text-[9px] font-extrabold uppercase py-1 px-2 text-slate-500">Rate</TableCell>
                                        </TableRow>
                                      </TableHead>
                                      <TableBody>
                                        {rec.sub_categories.map((sub: any, idx: number) => (
                                          <TableRow key={idx} className="hover:bg-slate-100/30 dark:hover:bg-slate-800/20">
                                            <TableCell className="text-[10px] font-bold text-slate-700 dark:text-slate-300 py-1 px-2">{sub.sub_category_name}</TableCell>
                                            <TableCell className="text-[10px] font-semibold py-1 px-2">{formatCurrency(sub.coverage_amount)}</TableCell>
                                            <TableCell className="text-[10px] font-bold text-blue-600 dark:text-blue-400 py-1 px-2">{formatCurrency(sub.estimated_premium)}</TableCell>
                                            <TableCell className="text-[10px] text-slate-500 py-1 px-2">
                                              <Tooltip title={sub.formula} arrow>
                                                <span className="cursor-help underline decoration-dotted">{sub.rate} ({sub.unit})</span>
                                              </Tooltip>
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </TableContainer>
                                </Collapse>
                              </Box>
                            )}
                          </Box>
                        ) : (
                          <Typography variant="caption" className="text-amber-500 font-semibold block">
                            Calculation error or base rate missing.
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          )}
        </Box>
      )}
    </Box>
  );
}
