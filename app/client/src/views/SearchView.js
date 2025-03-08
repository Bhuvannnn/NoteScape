import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  TextField,
  InputAdornment,
  IconButton,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Divider,
  Button,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Note as NoteIcon,
  AutoGraph as AutoGraphIcon,
} from '@mui/icons-material';
import axios from 'axios';

const SearchView = ({ setSelectedNote }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (event) => {
    event.preventDefault();
    
    if (!searchTerm.trim()) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSearched(true);
      
      const formData = new FormData();
      formData.append('query', searchTerm);
      
      const response = await axios.post('/api/search', formData);
      setResults(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error searching notes:', err);
      setError('Failed to search notes. Please try again.');
      setLoading(false);
    }
  };

  const handleClear = () => {
    setSearchTerm('');
    setResults([]);
    setSearched(false);
    setError(null);
  };

  const handleNoteClick = (note) => {
    setSelectedNote(note);
    navigate(`/note/${note.id}`);
  };

  const highlightMatches = (text, term) => {
    if (!term || !text) return text;
    
    // Simple highlighting - replace all occurrences with highlighted spans
    // In a real app, you'd want a more sophisticated approach
    const regex = new RegExp(`(${term})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  };

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Semantic Search
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <form onSubmit={handleSearch}>
          <TextField
            fullWidth
            label="Search notes"
            placeholder="Enter search terms or a question about your notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  {searchTerm && (
                    <IconButton onClick={handleClear} edge="end">
                      <ClearIcon />
                    </IconButton>
                  )}
                </InputAdornment>
              ),
            }}
            variant="outlined"
            autoFocus
            sx={{ mb: 2 }}
          />
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="submit"
              variant="contained"
              disabled={!searchTerm.trim() || loading}
              startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
            >
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </Box>
        </form>
      </Paper>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {searched && !loading && results.length === 0 ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          No results found for "{searchTerm}". Try different keywords or check your spelling.
        </Alert>
      ) : null}
      
      {results.length > 0 && (
        <Paper sx={{ mb: 3 }}>
          <Box sx={{ p: 2, backgroundColor: 'primary.main', color: 'primary.contrastText' }}>
            <Typography variant="h6">
              Search Results ({results.length})
            </Typography>
          </Box>
          
          <List sx={{ width: '100%' }}>
            {results.map((result, index) => (
              <React.Fragment key={result.id}>
                <ListItem disablePadding>
                  <ListItemButton onClick={() => handleNoteClick(result)}>
                    <ListItemAvatar>
                      <Avatar>
                        <NoteIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="subtitle1" fontWeight="medium">
                          {result.title}
                          {result.similarity && (
                            <Chip 
                              label={`${Math.round(result.similarity * 100)}% Match`} 
                              size="small" 
                              color="primary"
                              sx={{ ml: 1 }}
                            />
                          )}
                        </Typography>
                      }
                      secondary={
                        <>
                          <Box sx={{ mb: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {result.tags && result.tags.map((tag, idx) => (
                              <Chip key={idx} label={tag} size="small" />
                            ))}
                          </Box>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                              '& mark': {
                                backgroundColor: 'yellow',
                                color: 'black'
                              }
                            }}
                            dangerouslySetInnerHTML={{
                              __html: highlightMatches(result.content, searchTerm)
                            }}
                          />
                        </>
                      }
                    />
                  </ListItemButton>
                </ListItem>
                {index < results.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}
      
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          About Semantic Search
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <AutoGraphIcon color="primary" fontSize="large" />
          <Box>
            <Typography variant="body1" paragraph>
              Unlike traditional keyword search, semantic search understands the meaning behind your query, not just the words.
            </Typography>
            <Typography variant="body1" paragraph>
              You can search using natural language questions or statements, and the system will find notes with similar meanings, even if they don't contain the exact words.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Example: Searching for "machine learning applications" might also return notes about "AI use cases" or "neural network implementations".
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default SearchView; 