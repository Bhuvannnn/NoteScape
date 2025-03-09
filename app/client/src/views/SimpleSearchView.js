import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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
  ListItemText,
  Divider,
  Button,
  Container,
  Card,
  CardContent,
  Chip
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Home as HomeIcon
} from '@mui/icons-material';

const SimpleSearchView = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = (event) => {
    event.preventDefault();
    
    if (!searchTerm.trim()) {
      return;
    }
    
    setLoading(true);
    setError(null);
    setSearched(true);
    
    // Simulate search with timeout
    setTimeout(() => {
      try {
        // Generate mock results
        if (searchTerm.toLowerCase().includes('error')) {
          setError('Search failed. Please try again.');
          setResults([]);
        } else if (searchTerm.toLowerCase().includes('empty')) {
          setResults([]);
        } else {
          setResults([
            {
              id: '1',
              title: 'Introduction to Semantic Networks',
              content: 'Semantic networks are a form of knowledge representation where concepts are connected by meaningful relationships.',
              tags: ['semantics', 'networks', 'knowledge'],
              similarity: 0.92
            },
            {
              id: '2',
              title: 'Graph Theory Basics',
              content: 'Graph theory is the study of graphs, which are mathematical structures used to model pairwise relations between objects.',
              tags: ['mathematics', 'graphs', 'theory'],
              similarity: 0.85
            },
            {
              id: '3',
              title: 'Knowledge Representation',
              content: 'Knowledge representation is the field of artificial intelligence dedicated to representing information about the world in a form that a computer system can utilize.',
              tags: ['AI', 'knowledge', 'representation'],
              similarity: 0.78
            }
          ]);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error searching:', err);
        setError('An unexpected error occurred. Please try again.');
        setLoading(false);
      }
    }, 1500);
  };

  const handleClear = () => {
    setSearchTerm('');
    setResults([]);
    setSearched(false);
    setError(null);
  };

  const highlightMatches = (text, term) => {
    if (!term || !text) return text;
    
    // Simple highlighting - replace all occurrences with highlighted spans
    const regex = new RegExp(`(${term})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Semantic Search
        </Typography>
        <Button 
          variant="outlined" 
          component={Link} 
          to="/"
          startIcon={<HomeIcon />}
        >
          Home
        </Button>
      </Box>
      
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

      {searched && !loading && results.length === 0 && !error ? (
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
                <ListItem alignItems="flex-start">
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle1" fontWeight="medium">
                          {result.title}
                        </Typography>
                        <Chip 
                          label={`${Math.round(result.similarity * 100)}% Match`} 
                          size="small" 
                          color="primary"
                          sx={{ ml: 1 }}
                        />
                      </Box>
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
          <SearchIcon color="primary" fontSize="large" />
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
    </Container>
  );
};

export default SimpleSearchView; 