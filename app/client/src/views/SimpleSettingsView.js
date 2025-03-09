import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Divider,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Snackbar,
  Alert,
  Slider,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Container
} from '@mui/material';
import {
  Home as HomeIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

const SimpleSettingsView = () => {
  const [settings, setSettings] = useState({
    // Graph settings
    nodeSize: 5,
    fontSize: 16,
    graphLayout: 'force-directed',
    showLabels: true,
    
    // Semantic analysis settings
    similarityThreshold: 0.6,
    embeddingModel: 'openai',
    
    // General settings
    darkMode: false,
    autoSave: true,
  });
  
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  const handleSettingChange = (setting, value) => {
    setSettings({
      ...settings,
      [setting]: value,
    });
  };

  const handleSliderChange = (setting) => (event, newValue) => {
    handleSettingChange(setting, newValue);
  };

  const handleSwitchChange = (setting) => (event) => {
    handleSettingChange(setting, event.target.checked);
  };

  const handleInputChange = (setting) => (event) => {
    handleSettingChange(setting, event.target.value);
  };

  const handleSaveSettings = () => {
    // In a real app, this would save to a backend or localStorage
    setSnackbar({
      open: true,
      message: 'Settings saved successfully',
      severity: 'success',
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false,
    });
  };

  const handleReset = () => {
    // Reset to default settings
    setSettings({
      // Graph settings
      nodeSize: 5,
      fontSize: 16,
      graphLayout: 'force-directed',
      showLabels: true,
      
      // Semantic analysis settings
      similarityThreshold: 0.6,
      embeddingModel: 'openai',
      
      // General settings
      darkMode: false,
      autoSave: true,
    });
    
    setSnackbar({
      open: true,
      message: 'Settings reset to defaults',
      severity: 'info',
    });
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Settings
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
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            Graph Visualization
          </Typography>
          <Box>
            <Button 
              variant="outlined" 
              onClick={handleReset}
              startIcon={<RefreshIcon />}
              sx={{ mr: 1 }}
              size="small"
            >
              Reset
            </Button>
            <Button 
              variant="contained" 
              onClick={handleSaveSettings}
              startIcon={<SaveIcon />}
              size="small"
            >
              Save
            </Button>
          </Box>
        </Box>
        <Divider sx={{ mb: 2 }} />
        
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
          <Box>
            <Typography id="node-size-slider" gutterBottom>
              Node Size: {settings.nodeSize}
            </Typography>
            <Slider
              value={settings.nodeSize}
              onChange={handleSliderChange('nodeSize')}
              aria-labelledby="node-size-slider"
              valueLabelDisplay="auto"
              step={1}
              min={1}
              max={10}
            />
          </Box>
          
          <Box>
            <Typography id="font-size-slider" gutterBottom>
              Font Size: {settings.fontSize}px
            </Typography>
            <Slider
              value={settings.fontSize}
              onChange={handleSliderChange('fontSize')}
              aria-labelledby="font-size-slider"
              valueLabelDisplay="auto"
              step={1}
              min={10}
              max={24}
            />
          </Box>
          
          <FormControl fullWidth>
            <InputLabel id="graph-layout-label">Graph Layout</InputLabel>
            <Select
              labelId="graph-layout-label"
              id="graph-layout"
              value={settings.graphLayout}
              label="Graph Layout"
              onChange={handleInputChange('graphLayout')}
            >
              <MenuItem value="force-directed">Force Directed</MenuItem>
              <MenuItem value="hierarchical">Hierarchical</MenuItem>
              <MenuItem value="radial">Radial</MenuItem>
              <MenuItem value="grid">Grid</MenuItem>
            </Select>
          </FormControl>
          
          <FormControlLabel
            control={
              <Switch
                checked={settings.showLabels}
                onChange={handleSwitchChange('showLabels')}
              />
            }
            label="Show Node Labels"
          />
        </Box>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Semantic Analysis
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
          <Box>
            <Typography id="similarity-threshold-slider" gutterBottom>
              Similarity Threshold: {settings.similarityThreshold}
            </Typography>
            <Slider
              value={settings.similarityThreshold}
              onChange={handleSliderChange('similarityThreshold')}
              aria-labelledby="similarity-threshold-slider"
              valueLabelDisplay="auto"
              step={0.05}
              min={0.1}
              max={0.95}
            />
          </Box>
          
          <FormControl fullWidth>
            <InputLabel id="embedding-model-label">Embedding Model</InputLabel>
            <Select
              labelId="embedding-model-label"
              id="embedding-model"
              value={settings.embeddingModel}
              label="Embedding Model"
              onChange={handleInputChange('embeddingModel')}
            >
              <MenuItem value="openai">OpenAI (Requires API Key)</MenuItem>
              <MenuItem value="sentence-transformers">Sentence Transformers (Local)</MenuItem>
              <MenuItem value="huggingface">Hugging Face Transformers</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>
      
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          General Settings
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
          <FormControlLabel
            control={
              <Switch
                checked={settings.darkMode}
                onChange={handleSwitchChange('darkMode')}
              />
            }
            label="Dark Mode"
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={settings.autoSave}
                onChange={handleSwitchChange('autoSave')}
              />
            }
            label="Auto-save notes"
          />
          
          <FormControl fullWidth>
            <TextField
              label="OpenAI API Key"
              type="password"
              placeholder="Enter API key"
              variant="outlined"
              size="small"
            />
          </FormControl>
        </Box>
      </Paper>
      
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default SimpleSettingsView; 