import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error("React Error Boundary caught an error:", error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <Paper sx={{ p: 4, m: 2, maxWidth: '800px', mx: 'auto' }}>
          <Typography variant="h4" color="error" gutterBottom>
            Something went wrong
          </Typography>
          <Typography variant="body1" paragraph>
            The application encountered an error. Please try refreshing the page.
          </Typography>
          <Box sx={{ mb: 3 }}>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>
          </Box>
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6">Error Details (for developers):</Typography>
            <Box 
              component="pre" 
              sx={{ 
                p: 2, 
                mt: 2, 
                bgcolor: '#f5f5f5', 
                borderRadius: 1,
                overflow: 'auto',
                maxHeight: '300px',
                fontSize: '0.8rem'
              }}
            >
              {this.state.error && this.state.error.toString()}
              <br />
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </Box>
          </Box>
        </Paper>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 