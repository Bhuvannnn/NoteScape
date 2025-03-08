import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';

// Import components
import AppHeader from './components/AppHeader';
import Sidebar from './components/Sidebar';
import GraphView from './views/GraphView';
import NoteView from './views/NoteView';
import ImportView from './views/ImportView';
import SearchView from './views/SearchView';
import SettingsView from './views/SettingsView';

// Create theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#9c27b0',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
});

function App() {
  const [openSidebar, setOpenSidebar] = React.useState(true);
  const [selectedNote, setSelectedNote] = React.useState(null);

  const toggleSidebar = () => {
    setOpenSidebar(!openSidebar);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ display: 'flex', height: '100vh' }}>
          <AppHeader 
            toggleSidebar={toggleSidebar} 
            open={openSidebar}
          />
          <Sidebar 
            open={openSidebar} 
            selectedNote={selectedNote}
            setSelectedNote={setSelectedNote}
          />
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              p: 3,
              width: { sm: `calc(100% - ${openSidebar ? 240 : 0}px)` },
              ml: { sm: `${openSidebar ? 240 : 0}px` },
              mt: '64px',
              height: 'calc(100vh - 64px)',
              overflow: 'auto',
              transition: theme => theme.transitions.create(['width', 'margin'], {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.leavingScreen,
              }),
            }}
          >
            <Routes>
              <Route path="/" element={<GraphView setSelectedNote={setSelectedNote} />} />
              <Route path="/note/:noteId" element={<NoteView selectedNote={selectedNote} setSelectedNote={setSelectedNote} />} />
              <Route path="/import" element={<ImportView />} />
              <Route path="/search" element={<SearchView setSelectedNote={setSelectedNote} />} />
              <Route path="/settings" element={<SettingsView />} />
            </Routes>
          </Box>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App; 