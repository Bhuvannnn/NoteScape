import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Alert, 
  CircularProgress,
  Container
} from '@mui/material';
import { 
  Hub as HubIcon,
  Refresh as RefreshIcon,
  Home as HomeIcon,
  Add as AddIcon
} from '@mui/icons-material';
import axios from 'axios';

const SimpleGraphView = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [apiError, setApiError] = useState(false);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });

  // Load graph data on component mount
  useEffect(() => {
    loadGraphData();
  }, []);

  // Function to load graph data from the API
  const loadGraphData = () => {
    setLoading(true);
    setError(null);
    setApiError(false);
    
    axios.get('/api/graph')
      .then(response => {
        setGraphData(response.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading graph data:', err);
        if (err.code === 'ERR_NETWORK') {
          setApiError(true);
          setError('Cannot connect to the backend server. Please make sure it is running.');
        } else {
          setError('Failed to load graph data: ' + (err.response?.data?.detail || err.message));
        }
        setLoading(false);
      });
  };

  // Function to create a sample note
  const createSampleNote = () => {
    setLoading(true);
    setError(null);
    
    // Create a sample note
    axios.post('/api/notes/', {
      title: `Sample Note ${Math.floor(Math.random() * 1000)}`,
      content: "This is a sample note created to test the graph visualization. It contains some keywords like knowledge, graph, and visualization to help establish relationships with other notes.",
      tags: ["sample", "test", "graph"]
    })
    .then(() => {
      // After creating the note, analyze to generate relationships
      return axios.post('/api/analyze');
    })
    .then(() => {
      // After analysis, reload the graph
      loadGraphData();
    })
    .catch(err => {
      console.error('Error creating sample note:', err);
      setError('Failed to create sample note: ' + (err.response?.data?.detail || err.message));
      setLoading(false);
    });
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Knowledge Graph
        </Typography>
        <Box>
          <Button 
            variant="outlined" 
            component={Link} 
            to="/"
            startIcon={<HomeIcon />}
            sx={{ mr: 1 }}
          >
            Home
          </Button>
          <Button 
            variant="contained" 
            onClick={loadGraphData}
            disabled={loading}
            startIcon={<RefreshIcon />}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          <Button 
            variant="contained" 
            onClick={createSampleNote}
            disabled={loading}
            startIcon={<AddIcon />}
            color="secondary"
          >
            Add Sample Note
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={loadGraphData}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      ) : graphData.nodes.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <HubIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            No notes found in your knowledge graph
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Start by importing your notes or creating new ones to see your knowledge graph visualization.
          </Typography>
          <Box sx={{ mt: 3 }}>
            <Button 
              variant="contained" 
              component={Link}
              to="/import"
              sx={{ mr: 2 }}
            >
              Import Notes
            </Button>
            <Button 
              variant="contained" 
              onClick={createSampleNote}
              color="secondary"
            >
              Create Sample Note
            </Button>
          </Box>
        </Paper>
      ) : (
        <Paper sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom>Graph Data</Typography>
          <Typography variant="body1" paragraph>
            Found {graphData.nodes.length} nodes and {graphData.links.length} connections.
          </Typography>
          
          <Typography variant="h6" gutterBottom>Nodes:</Typography>
          <Box component="ul" sx={{ mb: 3, maxHeight: '200px', overflow: 'auto' }}>
            {graphData.nodes.map((node, index) => (
              <li key={index}>
                <strong>{node.label || node.id}</strong>
                {node.tags && node.tags.length > 0 && (
                  <span> - Tags: {node.tags.join(', ')}</span>
                )}
              </li>
            ))}
          </Box>
          
          <Typography variant="h6" gutterBottom>Connections:</Typography>
          <Box component="ul" sx={{ maxHeight: '200px', overflow: 'auto' }}>
            {graphData.links.map((link, index) => (
              <li key={index}>
                {link.source} → {link.target} 
                {link.type && <span> ({link.type})</span>}
                {link.value && <span> - Strength: {Math.round(link.value * 100)}%</span>}
              </li>
            ))}
          </Box>
        </Paper>
      )}
    </Container>
  );
};

export default SimpleGraphView; 