import React from 'react';
import { Link } from 'react-router-dom';
import { Box, Typography, Paper, Button, Grid, Container } from '@mui/material';
import { 
  Hub as HubIcon, 
  Upload as UploadIcon, 
  Search as SearchIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';

const WelcomePage = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Welcome to NoteScape
      </Typography>
      
      <Typography variant="body1" paragraph>
        NoteScape is a semantic note graph visualization system that helps you discover connections between your ideas.
      </Typography>
      
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <HubIcon color="primary" sx={{ mr: 1, fontSize: 28 }} />
              <Typography variant="h6">Knowledge Graph</Typography>
            </Box>
            <Typography variant="body2" paragraph>
              Visualize your notes as an interactive graph where related ideas are connected.
            </Typography>
            <Box sx={{ mt: 'auto', pt: 2 }}>
              <Button 
                variant="contained" 
                startIcon={<HubIcon />}
                component={Link}
                to="/graph"
                fullWidth
              >
                View Graph
              </Button>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <UploadIcon color="primary" sx={{ mr: 1, fontSize: 28 }} />
              <Typography variant="h6">Import Notes</Typography>
            </Box>
            <Typography variant="body2" paragraph>
              Import notes from various sources including text files, markdown, PDFs, and more.
            </Typography>
            <Box sx={{ mt: 'auto', pt: 2 }}>
              <Button 
                variant="contained" 
                startIcon={<UploadIcon />}
                component={Link}
                to="/import"
                fullWidth
              >
                Import Notes
              </Button>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <SearchIcon color="primary" sx={{ mr: 1, fontSize: 28 }} />
              <Typography variant="h6">Semantic Search</Typography>
            </Box>
            <Typography variant="body2" paragraph>
              Search your notes based on meaning, not just keywords. Find related concepts even if they use different terminology.
            </Typography>
            <Box sx={{ mt: 'auto', pt: 2 }}>
              <Button 
                variant="contained" 
                startIcon={<SearchIcon />}
                component={Link}
                to="/search"
                fullWidth
              >
                Search Notes
              </Button>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <SettingsIcon color="primary" sx={{ mr: 1, fontSize: 28 }} />
              <Typography variant="h6">Settings</Typography>
            </Box>
            <Typography variant="body2" paragraph>
              Configure your NoteScape experience, including graph visualization, semantic analysis, and more.
            </Typography>
            <Box sx={{ mt: 'auto', pt: 2 }}>
              <Button 
                variant="contained" 
                startIcon={<SettingsIcon />}
                component={Link}
                to="/settings"
                fullWidth
              >
                Open Settings
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default WelcomePage; 