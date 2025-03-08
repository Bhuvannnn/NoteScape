import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ForceGraph2D from 'react-force-graph';
import { Box, Paper, Typography, CircularProgress, Alert, Button } from '@mui/material';
import axios from 'axios';

const GraphView = ({ setSelectedNote }) => {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const graphRef = useRef();
  const navigate = useNavigate();

  // Load graph data
  useEffect(() => {
    const fetchGraphData = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/graph');
        setGraphData(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load graph data. Please try again later.');
        setLoading(false);
        console.error('Error fetching graph data:', err);
      }
    };

    fetchGraphData();
  }, []);

  // Handle node click
  const handleNodeClick = (node) => {
    // Fetch the note details
    axios.get(`/api/notes/${node.id}`)
      .then(response => {
        setSelectedNote(response.data);
        navigate(`/note/${node.id}`);
      })
      .catch(err => {
        console.error('Error fetching note details:', err);
      });
  };

  // Customize node appearance
  const nodeCanvasObject = (node, ctx, globalScale) => {
    const label = node.label || '';
    const fontSize = 16/globalScale;
    ctx.font = `${fontSize}px Sans-Serif`;
    const textWidth = ctx.measureText(label).width;
    const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.8);

    // Node background
    ctx.fillStyle = node.color || '#1976d2';
    ctx.beginPath();
    ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI, false);
    ctx.fill();

    // Node label background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillRect(
      node.x - bckgDimensions[0] / 2,
      node.y - bckgDimensions[1] / 2,
      bckgDimensions[0],
      bckgDimensions[1]
    );

    // Node label text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000';
    ctx.fillText(label, node.x, node.y);

    // Keep track of rendered node
    node.__bckgDimensions = bckgDimensions;
  };

  // Handle zoom to fit
  const handleZoomToFit = () => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(400);
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Knowledge Graph
        </Typography>
        <Button 
          variant="contained" 
          onClick={handleZoomToFit}
          disabled={loading || graphData.nodes.length === 0}
        >
          Zoom to Fit
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : graphData.nodes.length === 0 ? (
        <Paper 
          sx={{ 
            p: 4, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            height: '100%' 
          }}
        >
          <Typography variant="h6" sx={{ mb: 2 }}>
            No notes found in your knowledge graph
          </Typography>
          <Typography variant="body1" sx={{ mb: 3, textAlign: 'center' }}>
            Start by importing your notes or creating new ones to see your knowledge graph visualization.
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => navigate('/import')}
          >
            Import Notes
          </Button>
        </Paper>
      ) : (
        <Paper sx={{ flexGrow: 1, overflow: 'hidden', borderRadius: 2 }}>
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            nodeLabel="label"
            nodeCanvasObject={nodeCanvasObject}
            linkDirectionalParticles={2}
            linkDirectionalParticleSpeed={0.005}
            linkWidth={link => link.value * 2} // Scale link width by relationship strength
            linkColor={() => '#999'}
            onNodeClick={handleNodeClick}
            cooldownTicks={100}
            onEngineStop={() => handleZoomToFit()}
          />
        </Paper>
      )}
    </Box>
  );
};

export default GraphView; 