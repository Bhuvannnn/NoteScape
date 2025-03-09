import React, { useState, useEffect } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  Typography,
  Divider,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Collapse,
  TextField,
  InputAdornment,
  Tooltip,
} from '@mui/material';
import {
  ChevronRight as ChevronRightIcon,
  ExpandMore as ExpandMoreIcon,
  Note as NoteIcon,
  Search as SearchIcon,
  Label as LabelIcon,
  Add as AddIcon,
  Hub as HubIcon,
  Folder as FolderIcon,
  Upload as UploadIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import axios from 'axios';

const drawerWidth = 240;

function Sidebar({ open, selectedNote, setSelectedNote }) {
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    recents: true,
    tags: false,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [tags, setTags] = useState([]);
  
  // Fetch notes
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/notes');
        setNotes(response.data);
        
        // Extract unique tags
        const allTags = response.data.reduce((acc, note) => {
          if (note.tags && Array.isArray(note.tags)) {
            note.tags.forEach(tag => {
              if (!acc.includes(tag)) {
                acc.push(tag);
              }
            });
          }
          return acc;
        }, []);
        
        setTags(allTags);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching notes:', err);
        setLoading(false);
      }
    };

    fetchNotes();
  }, []);

  const toggleSection = (section) => {
    setExpandedSections({
      ...expandedSections,
      [section]: !expandedSections[section],
    });
  };

  // Filter notes based on search term
  const filteredNotes = notes.filter(note => 
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    note.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort notes by updated_at (most recent first)
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (!a.updated_at) return 1;
    if (!b.updated_at) return -1;
    return new Date(b.updated_at) - new Date(a.updated_at);
  });

  // Recent notes (top 5)
  const recentNotes = sortedNotes.slice(0, 5);

  return (
    <Drawer
      variant="persistent"
      anchor="left"
      open={open}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          top: '64px',
          height: 'calc(100% - 64px)',
        },
      }}
    >
      <Box sx={{ overflow: 'auto', p: 1 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Search notes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ mb: 2, mt: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1 }}>
          <Typography variant="body2" color="text.secondary">
            QUICK ACTIONS
          </Typography>
        </Box>
        
        <List dense>
          <ListItem disablePadding>
            <ListItemButton component={RouterLink} to="/">
              <ListItemIcon>
                <HubIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Home" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton component={RouterLink} to="/graph">
              <ListItemIcon>
                <HubIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Graph View" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton component={RouterLink} to="/import">
              <ListItemIcon>
                <UploadIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Import Notes" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton>
              <ListItemIcon>
                <AddIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="New Note" />
            </ListItemButton>
          </ListItem>
        </List>
        
        <Divider sx={{ my: 1 }} />
        
        <ListItem
          secondaryAction={
            <IconButton edge="end" onClick={() => toggleSection('recents')}>
              {expandedSections.recents ? <ExpandMoreIcon /> : <ChevronRightIcon />}
            </IconButton>
          }
          sx={{ px: 1 }}
        >
          <Typography variant="body2" color="text.secondary">
            RECENT NOTES
          </Typography>
        </ListItem>
        
        <Collapse in={expandedSections.recents} timeout="auto" unmountOnExit>
          <List dense>
            {loading ? (
              <ListItem>
                <ListItemText primary="Loading..." />
              </ListItem>
            ) : recentNotes.length === 0 ? (
              <ListItem>
                <ListItemText primary="No notes found" />
              </ListItem>
            ) : (
              recentNotes.map((note) => (
                <ListItem 
                  key={note.id} 
                  disablePadding
                  secondaryAction={
                    <Tooltip title="View relationships">
                      <IconButton 
                        edge="end" 
                        onClick={() => navigate('/')}
                        size="small"
                      >
                        <ArrowForwardIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  }
                >
                  <ListItemButton 
                    selected={selectedNote && selectedNote.id === note.id}
                    onClick={() => {
                      setSelectedNote(note);
                      navigate(`/note/${note.id}`);
                    }}
                  >
                    <ListItemIcon>
                      <NoteIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={note.title} 
                      primaryTypographyProps={{ 
                        noWrap: true,
                        style: { maxWidth: '130px' }
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))
            )}
          </List>
        </Collapse>
        
        <Divider sx={{ my: 1 }} />
        
        <ListItem
          secondaryAction={
            <IconButton edge="end" onClick={() => toggleSection('tags')}>
              {expandedSections.tags ? <ExpandMoreIcon /> : <ChevronRightIcon />}
            </IconButton>
          }
          sx={{ px: 1 }}
        >
          <Typography variant="body2" color="text.secondary">
            TAGS
          </Typography>
        </ListItem>
        
        <Collapse in={expandedSections.tags} timeout="auto" unmountOnExit>
          <List dense>
            {tags.length === 0 ? (
              <ListItem>
                <ListItemText primary="No tags found" />
              </ListItem>
            ) : (
              tags.map((tag) => (
                <ListItem key={tag} disablePadding>
                  <ListItemButton>
                    <ListItemIcon>
                      <LabelIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={tag} />
                  </ListItemButton>
                </ListItem>
              ))
            )}
          </List>
        </Collapse>
        
        <Divider sx={{ my: 1 }} />
        
        <ListItem sx={{ px: 1 }}>
          <Typography variant="body2" color="text.secondary">
            COLLECTIONS
          </Typography>
        </ListItem>
        
        <List dense>
          <ListItem disablePadding>
            <ListItemButton>
              <ListItemIcon>
                <FolderIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Personal" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton>
              <ListItemIcon>
                <FolderIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Work" />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>
    </Drawer>
  );
}

export default Sidebar; 