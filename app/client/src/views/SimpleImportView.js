import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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
  RadioGroup,
  FormControlLabel,
  Radio,
  Alert,
  Container
} from '@mui/material';
import {
  Upload as UploadIcon,
  Home as HomeIcon
} from '@mui/icons-material';
import axios from 'axios';

const steps = ['Select Source', 'Upload Files', 'Process Notes', 'View Results'];

const SimpleImportView = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [sourceType, setSourceType] = useState('file');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleNext = () => {
    if (activeStep === 1 && sourceType === 'direct' && !content.trim()) {
      setError('Please enter some content to import');
      return;
    }
    
    if (activeStep === 1 && sourceType === 'file' && !selectedFile) {
      setError('Please select a file to import');
      return;
    }
    
    setError(null);
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
    
    // If moving to process step, process the content
    if (activeStep === 1) {
      processContent();
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
    setError(null);
  };

  const handleSourceTypeChange = (event) => {
    setSourceType(event.target.value);
    setError(null);
    setSelectedFile(null);
  };

  const handleFileChange = (event) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const processContent = () => {
    setLoading(true);
    setError(null);
    
    if (sourceType === 'file' && selectedFile) {
      // Create a FormData object to send the file
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      // Send the file to the API
      axios.post('/api/import/text', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      .then(response => {
        // After importing, analyze to generate relationships
        return axios.post('/api/analyze');
      })
      .then(() => {
        // Get the graph data to see how many notes and relationships were created
        return axios.get('/api/graph');
      })
      .then(response => {
        setResults({
          importedCount: response.data.nodes.length,
          relationships: response.data.links.length
        });
        setLoading(false);
        setActiveStep(3); // Move to results step
      })
      .catch(err => {
        console.error('Error processing file:', err);
        setError('Error processing file: ' + (err.response?.data?.detail || err.message));
        setLoading(false);
      });
    } else if (sourceType === 'direct' && content) {
      // Create a note directly from the content
      axios.post('/api/notes/', {
        title: "Imported Note",
        content: content,
        tags: []
      })
      .then(() => {
        // After creating the note, analyze to generate relationships
        return axios.post('/api/analyze');
      })
      .then(() => {
        // Get the graph data to see how many notes and relationships were created
        return axios.get('/api/graph');
      })
      .then(response => {
        setResults({
          importedCount: response.data.nodes.length,
          relationships: response.data.links.length
        });
        setLoading(false);
        setActiveStep(3); // Move to results step
      })
      .catch(err => {
        console.error('Error processing content:', err);
        setError('Error processing content: ' + (err.response?.data?.detail || err.message));
        setLoading(false);
      });
    } else {
      setError('No content to process');
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
                  startIcon={<UploadIcon />}
                >
                  Select File
                  <input
                    type="file"
                    hidden
                    onChange={handleFileChange}
                    accept=".txt,.md,.csv,.json,.pdf,.html"
                  />
                </Button>
                {selectedFile && (
                  <Typography variant="body2" sx={{ mt: 2 }}>
                    Selected file: {selectedFile.name}
                  </Typography>
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
                <Paper variant="outlined" sx={{ p: 3, mb: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Import Summary
                  </Typography>
                  <Typography variant="body1">
                    • {results.importedCount} notes in your knowledge graph
                  </Typography>
                  <Typography variant="body1">
                    • {results.relationships} relationships discovered
                  </Typography>
                </Paper>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Button 
                    variant="outlined" 
                    onClick={() => {
                      setActiveStep(0);
                      setContent('');
                      setResults(null);
                      setError(null);
                      setSelectedFile(null);
                    }}
                  >
                    Import More
                  </Button>
                  <Button 
                    variant="contained" 
                    startIcon={<HomeIcon />}
                    component={Link}
                    to="/graph"
                  >
                    View Graph
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
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Import Notes
        </Typography>
        <Button 
          variant="outlined" 
          component={Link} 
          to="/"
          startIcon={<HomeIcon />}
        >
          Home
        </Button>
      </Box>

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
    </Container>
  );
};

export default SimpleImportView; 