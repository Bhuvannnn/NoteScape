import React from 'react';
import { Box, Typography, Paper, Button, Alert } from '@mui/material';
import { Link } from 'react-router-dom';

const ApiErrorFallback = ({ error, resetErrorBoundary }) => {
  return (
    <Paper sx={{ p: 4, m: 2, maxWidth: '800px', mx: 'auto' }}>
      <Alert severity="error" sx={{ mb: 3 }}>
        API Connection Error
      </Alert>
      
      <Typography variant="h5" gutterBottom>
        Cannot connect to the backend server
      </Typography>
      
      <Typography variant="body1" paragraph>
        The application is unable to connect to the backend API server. This could be because:
      </Typography>
      
      <Box component="ul" sx={{ mb: 3 }}>
        <li>The backend server is not running</li>
        <li>There's a network issue</li>
        <li>The API endpoint URL is incorrect</li>
      </Box>
      
      <Typography variant="body1" paragraph>
        Please make sure the backend server is running on <strong>http://localhost:8000</strong> and try again.
      </Typography>
      
      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={resetErrorBoundary}
        >
          Try Again
        </Button>
        
        <Button 
          variant="outlined" 
          component={Link} 
          to="/settings"
        >
          Go to Settings
        </Button>
      </Box>
      
      <Box sx={{ mt: 4, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          To start the backend server:
        </Typography>
        <Box component="pre" sx={{ overflow: 'auto', fontSize: '0.8rem' }}>
          {`cd /path/to/project
python app/api/main.py`}
        </Box>
      </Box>
    </Paper>
  );
};

export default ApiErrorFallback; 