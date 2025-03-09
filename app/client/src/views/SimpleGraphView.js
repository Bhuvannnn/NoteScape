import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Alert, 
  CircularProgress,
  Container,
  Tooltip,
  IconButton,
  Card,
  CardContent,
  CardActions,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Divider
} from '@mui/material';
import { 
  Hub as HubIcon,
  Refresh as RefreshIcon,
  Home as HomeIcon,
  Add as AddIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Info as InfoIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import axios from 'axios';
// Import Network from react-vis-network-graph
import Network from 'react-vis-network-graph';

const SimpleGraphView = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [apiError, setApiError] = useState(false);
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [graphWidth, setGraphWidth] = useState(800);
  const [graphHeight] = useState(600); // Fixed height
  const [selectedNode, setSelectedNode] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [nodeToDelete, setNodeToDelete] = useState(null);
  const [networkScale, setNetworkScale] = useState(1.0);
  const [newNote, setNewNote] = useState({ title: '', content: '', tags: 'sample, note' });
  const [createNoteOpen, setCreateNoteOpen] = useState(false);
  
  // Reference to the network instance
  const networkRef = useRef(null);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setGraphWidth(Math.min(window.innerWidth - 400, 800)); // Leave space for details panel
    };
    
    handleResize(); // Set initial size
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load graph data on component mount
  useEffect(() => {
    loadGraphData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Function to load graph data from the API
  const loadGraphData = () => {
    setLoading(true);
    setError(null);
    setApiError(false);
    setSelectedNode(null);
    
    axios.get('/api/graph')
      .then(response => {
        console.log('Graph data received:', response.data);
        // Process the data for the graph
        const processedData = processGraphData(response.data);
        setGraphData(processedData);
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

  // Process graph data to make it compatible with vis-network
  const processGraphData = (data) => {
    // Format nodes for vis-network
    const nodes = data.nodes.map(node => {
      // Create a label that includes the title
      const nodeLabel = node.label || node.id;
      
      return {
        id: node.id,
        label: nodeLabel,
        title: `<div style="max-width: 300px; padding: 10px;">
                <h3 style="margin-top: 0;">${node.label || node.id}</h3>
                <p style="white-space: pre-wrap;">${node.content || ''}</p>
                ${node.tags && node.tags.length > 0 ? 
                  `<p><strong>Tags:</strong> ${node.tags.join(', ')}</p>` : ''}
                </div>`,
        color: {
          background: '#ffffff',
          border: '#000000',
          highlight: {
            background: '#f5f5f5',
            border: '#000000'
          },
          hover: {
            background: '#f5f5f5',
            border: '#000000'
          }
        },
        font: {
          multi: 'html',
          size: 12,
          color: '#000000',
          face: 'Arial'
        },
        shape: 'circle',
        size: 25 + Math.min((node.content?.length || 0) / 100, 15), // Size based on content length
        shadow: true,
        // Store original data for reference
        originalData: node
      };
    });

    // Format edges (links) for vis-network
    const edges = data.links.map((link, index) => {
      // Convert source and target to strings if they're not already
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      
      // Calculate edge width based on relationship strength
      const width = 1 + (link.value || 0.5) * 5;
      
      return {
        id: `e${index}`,
        from: sourceId,
        to: targetId,
        width: width,
        color: {
          color: '#000000',
          opacity: 0.6,
          highlight: '#555555'
        },
        arrows: {
          to: {
            enabled: true,
            scaleFactor: 0.5
          }
        },
        smooth: {
          type: 'continuous',
          roundness: 0.5
        },
        // Store original data for reference
        originalData: link
      };
    });

    return { nodes, edges };
  };

  // Get color for node based on its properties
  const getNodeColor = (node) => {
    // Using black and white theme now
    return '#ffffff'; // White background for all nodes
  };

  // Get color for link based on relationship strength
  const getLinkColor = (strength) => {
    // Using black and white theme now
    const opacity = 0.3 + (strength * 0.7);
    return `rgba(0, 0, 0, ${opacity})`;
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

  // Function to create a custom note
  const createCustomNote = () => {
    setLoading(true);
    setError(null);
    
    // Parse tags from comma-separated string
    const tags = newNote.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    
    // Create a note with user-provided data
    axios.post('/api/notes/', {
      title: newNote.title,
      content: newNote.content,
      tags: tags
    })
    .then(() => {
      // After creating the note, analyze to generate relationships
      return axios.post('/api/analyze');
    })
    .then(() => {
      // After analysis, reload the graph
      loadGraphData();
      // Reset form and close dialog
      setNewNote({ title: '', content: '', tags: 'sample, note' });
      setCreateNoteOpen(false);
    })
    .catch(err => {
      console.error('Error creating note:', err);
      setError('Failed to create note: ' + (err.response?.data?.detail || err.message));
      setLoading(false);
    });
  };

  // Handle node click
  const handleNodeClick = useCallback((params) => {
    if (params.nodes && params.nodes.length > 0) {
      const nodeId = params.nodes[0];
      const node = graphData.nodes.find(n => n.id === nodeId);
      if (node) {
        setSelectedNode(node.originalData);
      }
    }
  }, [graphData.nodes]);

  // Handle node right-click (for delete option)
  const handleNodeRightClick = useCallback((params) => {
    if (params.nodes && params.nodes.length > 0) {
      const nodeId = params.nodes[0];
      const node = graphData.nodes.find(n => n.id === nodeId);
      if (node) {
        setNodeToDelete(node.originalData);
        setDeleteDialogOpen(true);
      }
    }
  }, [graphData.nodes]);

  // Delete a note
  const deleteNote = () => {
    if (!nodeToDelete) return;
    
    setLoading(true);
    setError(null);
    
    axios.delete(`/api/notes/${nodeToDelete.id}`)
      .then(() => {
        // After deleting, reload the graph
        loadGraphData();
        setDeleteDialogOpen(false);
        setNodeToDelete(null);
        if (selectedNode && selectedNode.id === nodeToDelete.id) {
          setSelectedNode(null);
        }
      })
      .catch(err => {
        console.error('Error deleting note:', err);
        setError('Failed to delete note: ' + (err.response?.data?.detail || err.message));
        setLoading(false);
        setDeleteDialogOpen(false);
      });
  };

  // Zoom in on the graph
  const zoomIn = () => {
    try {
      if (networkRef.current && networkRef.current.network) {
        const newScale = networkScale * 1.2;
        networkRef.current.network.moveTo({
          scale: newScale
        });
        setNetworkScale(newScale);
      }
    } catch (error) {
      console.error("Error during zoom in:", error);
    }
  };

  // Zoom out on the graph
  const zoomOut = () => {
    try {
      if (networkRef.current && networkRef.current.network) {
        const newScale = networkScale / 1.2;
        networkRef.current.network.moveTo({
          scale: newScale
        });
        setNetworkScale(newScale);
      }
    } catch (error) {
      console.error("Error during zoom out:", error);
    }
  };

  // Focus on a specific node
  const focusOnNode = (nodeId) => {
    try {
      if (networkRef.current && networkRef.current.network) {
        networkRef.current.network.focus(nodeId, {
          scale: 1.5,
          animation: true
        });
      }
    } catch (error) {
      console.error("Error focusing on node:", error);
    }
  };

  // Network options for vis-network
  const options = {
    nodes: {
      shape: 'circle',
      size: 30,
      font: {
        size: 12,
        color: '#000000',
        face: 'Arial',
        multi: 'html'
      },
      borderWidth: 1,
      shadow: true,
      color: {
        background: '#ffffff',
        border: '#000000',
        highlight: {
          background: '#f5f5f5',
          border: '#000000'
        },
        hover: {
          background: '#f5f5f5',
          border: '#000000'
        }
      },
      scaling: {
        min: 10,
        max: 30,
        label: {
          enabled: true,
          min: 8,
          max: 20
        }
      }
    },
    edges: {
      width: 1,
      color: {
        color: '#000000',
        opacity: 0.6,
        highlight: '#555555'
      },
      arrows: {
        to: {
          enabled: true,
          scaleFactor: 0.5
        }
      },
      smooth: {
        type: 'continuous',
        roundness: 0.5
      },
      shadow: true
    },
    physics: {
      stabilization: {
        enabled: true,
        iterations: 1000
      },
      barnesHut: {
        gravitationalConstant: -2000,
        centralGravity: 0.3,
        springLength: 150,
        springConstant: 0.04,
        damping: 0.09
      }
    },
    interaction: {
      hover: true,
      tooltipDelay: 200,
      zoomView: true,
      dragView: true,
      hideEdgesOnDrag: true,
      hideEdgesOnZoom: true
    },
    height: `${graphHeight}px`,
    width: `${graphWidth}px`,
    layout: {
      improvedLayout: true,
      hierarchical: {
        enabled: false
      }
    }
  };

  // Network events
  const events = {
    click: handleNodeClick,
    oncontext: handleNodeRightClick,
    // Store network reference when initialized
    afterDrawing: (network) => {
      if (!networkRef.current) {
        networkRef.current = { network };
      }
    },
    // Scale font size based on zoom level
    hoverNode: (params) => {
      try {
        if (networkRef.current && networkRef.current.network) {
          const nodeId = params.node;
          const node = graphData.nodes.find(n => n.id === nodeId);
          if (node) {
            // Temporarily increase the node size on hover
            networkRef.current.network.body.nodes[nodeId].options.size = 40;
            networkRef.current.network.body.nodes[nodeId].options.font.size = 16;
            networkRef.current.network.redraw();
          }
        }
      } catch (error) {
        console.error("Error during node hover:", error);
      }
    },
    blurNode: (params) => {
      try {
        if (networkRef.current && networkRef.current.network) {
          const nodeId = params.node;
          const node = graphData.nodes.find(n => n.id === nodeId);
          if (node) {
            // Reset the node size when not hovering
            networkRef.current.network.body.nodes[nodeId].options.size = 
              25 + Math.min((node.originalData.content?.length || 0) / 100, 15);
            networkRef.current.network.body.nodes[nodeId].options.font.size = 12;
            networkRef.current.network.redraw();
          }
        }
      } catch (error) {
        console.error("Error during node blur:", error);
      }
    }
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
            onClick={() => setCreateNoteOpen(true)}
            disabled={loading}
            startIcon={<AddIcon />}
            color="secondary"
            sx={{ mr: 1 }}
          >
            Add Note
          </Button>
          <Button 
            variant="outlined" 
            onClick={createSampleNote}
            disabled={loading}
            startIcon={<AddIcon />}
          >
            Add Sample
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
              onClick={() => setCreateNoteOpen(true)}
              color="secondary"
              sx={{ mr: 2 }}
            >
              Create Note
            </Button>
            <Button 
              variant="outlined" 
              onClick={createSampleNote}
            >
              Add Sample
            </Button>
          </Box>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', gap: 2 }}>
          {/* Graph visualization */}
          <Paper sx={{ p: 2, position: 'relative', flexGrow: 1 }}>
            <Box sx={{ position: 'absolute', top: 10, right: 10, zIndex: 10, display: 'flex', gap: 1 }}>
              <Tooltip title="Zoom In">
                <IconButton onClick={zoomIn} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.8)' }}>
                  <ZoomInIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Zoom Out">
                <IconButton onClick={zoomOut} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.8)' }}>
                  <ZoomOutIcon />
                </IconButton>
              </Tooltip>
            </Box>
            
            <Typography variant="h5" gutterBottom>
              Graph Visualization
            </Typography>
            <Typography variant="body2" paragraph>
              Found {graphData.nodes.length} nodes and {graphData.edges.length} connections.
            </Typography>
            
            <Box sx={{ height: graphHeight, width: graphWidth, margin: '0 auto', position: 'relative' }}>
              {graphData.nodes.length > 0 && (
                <div style={{ height: graphHeight, width: graphWidth }}>
                  <Network
                    graph={graphData}
                    options={options}
                    events={events}
                    getNetwork={network => {
                      // Store network reference
                      if (!networkRef.current) {
                        networkRef.current = { network };
                      }
                    }}
                  />
                </div>
              )}
            </Box>
          </Paper>
          
          {/* Node details panel */}
          <Paper sx={{ p: 2, width: '300px', height: graphHeight, overflow: 'auto' }}>
            {selectedNode ? (
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" component="h2" gutterBottom>
                      {selectedNode.label || selectedNode.id}
                    </Typography>
                    <IconButton 
                      size="small" 
                      onClick={() => setSelectedNode(null)}
                      aria-label="close"
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  
                  {selectedNode.tags && selectedNode.tags.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>Tags:</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selectedNode.tags.map((tag, index) => (
                          <Chip key={index} label={tag} size="small" />
                        ))}
                      </Box>
                    </Box>
                  )}
                  
                  {selectedNode.content && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>Content:</Typography>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {selectedNode.content}
                      </Typography>
                    </Box>
                  )}
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>Connections:</Typography>
                    <Typography variant="body2">
                      {graphData.edges.filter(edge => 
                        edge.from === selectedNode.id || edge.to === selectedNode.id
                      ).length} connections
                    </Typography>
                  </Box>
                </CardContent>
                <CardActions>
                  <Button 
                    size="small" 
                    startIcon={<DeleteIcon />}
                    color="error"
                    onClick={() => {
                      setNodeToDelete(selectedNode);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    Delete
                  </Button>
                  <Button 
                    size="small" 
                    startIcon={<InfoIcon />}
                    onClick={() => focusOnNode(selectedNode.id)}
                  >
                    Focus
                  </Button>
                </CardActions>
              </Card>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <InfoIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 2 }} />
                <Typography variant="body1" color="text.secondary">
                  Click on a node to view details
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Right-click to delete a node
                </Typography>
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1">
                    Graph Statistics
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Nodes: {graphData.nodes.length}
                  </Typography>
                  <Typography variant="body2">
                    Connections: {graphData.edges.length}
                  </Typography>
                </Box>
              </Box>
            )}
          </Paper>
        </Box>
      )}
      
      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Note</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{nodeToDelete?.label || nodeToDelete?.id}"?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={deleteNote} color="error">Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Create note dialog */}
      <Dialog
        open={createNoteOpen}
        onClose={() => setCreateNoteOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create New Note</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Note Title"
                variant="outlined"
                fullWidth
                value={newNote.title}
                onChange={(e) => setNewNote({...newNote, title: e.target.value})}
                placeholder="Enter a title for your note"
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Note Content"
                variant="outlined"
                fullWidth
                multiline
                rows={6}
                value={newNote.content}
                onChange={(e) => setNewNote({...newNote, content: e.target.value})}
                placeholder="Enter the content of your note"
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Tags (comma-separated)"
                variant="outlined"
                fullWidth
                value={newNote.tags}
                onChange={(e) => setNewNote({...newNote, tags: e.target.value})}
                placeholder="Enter tags separated by commas (e.g., sample, note, important)"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateNoteOpen(false)}>Cancel</Button>
          <Button 
            onClick={createCustomNote} 
            color="primary" 
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={!newNote.title || !newNote.content}
          >
            Create Note
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SimpleGraphView; 