import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Box, Typography, AppBar, Toolbar, Button } from '@mui/material';

// Import simplified components
import WelcomePage from './views/WelcomePage';
import SimpleGraphView from './views/SimpleGraphView';
import SimpleImportView from './views/SimpleImportView';
import SimpleSearchView from './views/SimpleSearchView';
import SimpleSettingsView from './views/SimpleSettingsView';

function App() {
  return (
    <Router>
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component={Link} to="/" sx={{ flexGrow: 1, textDecoration: 'none', color: 'white' }}>
              NoteScape
            </Typography>
            <Button color="inherit" component={Link} to="/graph">Graph</Button>
            <Button color="inherit" component={Link} to="/import">Import</Button>
            <Button color="inherit" component={Link} to="/search">Search</Button>
            <Button color="inherit" component={Link} to="/settings">Settings</Button>
          </Toolbar>
        </AppBar>
        
        <Box sx={{ flexGrow: 1 }}>
          <Routes>
            <Route path="/" element={<WelcomePage />} />
            <Route path="/graph" element={<SimpleGraphView />} />
            <Route path="/import" element={<SimpleImportView />} />
            <Route path="/search" element={<SimpleSearchView />} />
            <Route path="/settings" element={<SimpleSettingsView />} />
          </Routes>
        </Box>
      </Box>
    </Router>
  );
}

export default App; 