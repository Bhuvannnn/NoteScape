import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Divider,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Alert,
  Card,
  CardContent,
  Stack,
  Chip,
} from '@mui/material';
import {
  FileUpload as FileUploadIcon,
  DataObject as DataObjectIcon,
  AutoGraph as AutoGraphIcon,
  Hub as HubIcon,
} from '@mui/icons-material';
import axios from 'axios';

const steps = ['Select Source', 'Upload Files', 'Process Notes', 'View Results'];

const ImportView = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [sourceType, setSourceType] = useState('file');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [content, setContent] = useState('');

  const handleNext = () => {
    if (activeStep === 1 && sourceType === 'direct' && !content.trim()) {
      setError('Please enter some content to import');
      return;
    }
    
    if (activeStep === 1 && sourceType === 'file' && files.length === 0) {
      setError('Please select at least one file to import');
      return;
    }
    
    setError(null);
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
    
    // If moving to process step, start processing
    if (activeStep === 1) {
      processFiles();
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
    setError(null);
  };

  const handleFileChange = (event) => {
    setFiles(Array.from(event.target.files));
    setError(null);
  };

  const handleSourceTypeChange = (event) => {
    setSourceType(event.target.value);
    setError(null);
    // Reset files or content when changing source type
    if (event.target.value === 'file') {
      setContent('');
    } else {
      setFiles([]);
    }
  };

  const processFiles = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (sourceType === 'file') {
        // Create a FormData object to send files
        const formData = new FormData();
        files.forEach(file => {
          formData.append('files', file);
        });
        
        // Upload files
        const response = await axios.post('/api/import/text', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        
        setResults(response.data);
      } else {
        // Direct content
        const response = await axios.post('/api/import/direct', {
          content: content,
        });
        
        setResults(response.data);
      }
      
      // Move to the results step
      setTimeout(() => {
        setLoading(false);
        setActiveStep(3);
      }, 1500);
    } catch (err) {
      console.error('Error processing files:', err);
      setError(err.response?.data?.detail || 'Error processing files. Please try again.');
      setLoading(false);
    }
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Choose Import Source
            </Typography>
            <FormControl component="fieldset">
              <RadioGroup
                aria-label="source-type"
                name="source-type"
                value={sourceType}
                onChange={handleSourceTypeChange}
              >
                <FormControlLabel 
                  value="file" 
                  control={<Radio />} 
                  label="Import from files (txt, md, csv, json, pdf, html)" 
                />
                <FormControlLabel 
                  value="direct" 
                  control={<Radio />} 
                  label="Paste text directly" 
                />
              </RadioGroup>
            </FormControl>
          </Box>
        );
      case 1:
        return (
          <Box>
            {sourceType === 'file' ? (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Upload Files
                </Typography>
                <Button
                  variant="contained"
                  component="label"
                  startIcon={<FileUploadIcon />}
                >
                  Select Files
                  <input
                    type="file"
                    multiple
                    hidden
                    onChange={handleFileChange}
                    accept=".txt,.md,.csv,.json,.pdf,.html"
                  />
                </Button>
                {files.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Selected Files:
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {files.map((file, index) => (
                        <Chip 
                          key={index} 
                          label={file.name} 
                          variant="outlined" 
                        />
                      ))}
                    </Stack>
                  </Box>
                )}
              </Box>
            ) : (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Enter Content
                </Typography>
                <TextField
                  label="Paste your notes here"
                  multiline
                  rows={10}
                  fullWidth
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  variant="outlined"
                />
              </Box>
            )}
          </Box>
        );
      case 2:
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress size={60} />
            <Typography variant="h6" sx={{ mt: 2 }}>
              Processing your notes...
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              We're analyzing your content and extracting relationships between notes.
            </Typography>
          </Box>
        );
      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Import Results
            </Typography>
            {results ? (
              <Box>
                <Alert severity="success" sx={{ mb: 2 }}>
                  Successfully imported notes!
                </Alert>
                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Import Summary
                    </Typography>
                    <Typography variant="body2">
                      • {results.importedCount || 'Unknown number of'} notes imported
                    </Typography>
                    <Typography variant="body2">
                      • {results.relationships || 'Unknown number of'} relationships discovered
                    </Typography>
                  </CardContent>
                </Card>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Button 
                    variant="outlined" 
                    onClick={() => {
                      setActiveStep(0);
                      setFiles([]);
                      setContent('');
                      setResults(null);
                      setError(null);
                    }}
                  >
                    Import More
                  </Button>
                  <Button 
                    variant="contained" 
                    startIcon={<HubIcon />}
                    onClick={() => navigate('/')}
                  >
                    View Knowledge Graph
                  </Button>
                </Box>
              </Box>
            ) : (
              <Alert severity="warning">
                No results available. Something went wrong during processing.
              </Alert>
            )}
          </Box>
        );
      default:
        return 'Unknown step';
    }
  };

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Import Notes
      </Typography>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        <Divider sx={{ mb: 3 }} />
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {getStepContent(activeStep)}
        
        {activeStep !== 2 && activeStep !== 3 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              variant="outlined"
            >
              Back
            </Button>
            <Button 
              variant="contained" 
              onClick={handleNext}
              disabled={loading}
            >
              {activeStep === steps.length - 2 ? 'Process' : 'Next'}
            </Button>
          </Box>
        )}
      </Paper>
      
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          About Importing Notes
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <FileUploadIcon color="primary" />
            <Box>
              <Typography variant="subtitle1">Supported Formats</Typography>
              <Typography variant="body2">
                Import notes from .txt, .md, .csv, .json, .pdf, and .html files. Each file will be analyzed and split into notes based on its structure.
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <DataObjectIcon color="primary" />
            <Box>
              <Typography variant="subtitle1">Metadata Extraction</Typography>
              <Typography variant="body2">
                The system will automatically extract titles, tags, and dates from your imported content when available.
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <AutoGraphIcon color="primary" />
            <Box>
              <Typography variant="subtitle1">Relationship Analysis</Typography>
              <Typography variant="body2">
                After import, notes will be analyzed to find semantic relationships and connections between different ideas.
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default ImportView; 