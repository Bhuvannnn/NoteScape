import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Divider,
  Chip,
  IconButton,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  CardActionArea,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import ReactMarkdown from 'react-markdown';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Hub as HubIcon,
  ArrowBack as ArrowBackIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import axios from 'axios';

const NoteView = ({ selectedNote, setSelectedNote }) => {
  const { noteId } = useParams();
  const navigate = useNavigate();
  
  const [note, setNote] = useState(selectedNote || null);
  const [relatedNotes, setRelatedNotes] = useState([]);
  const [loading, setLoading] = useState(!selectedNote);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editedNote, setEditedNote] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Use useCallback to memoize the fetchNote function
  const fetchNote = useCallback(async (id) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/notes/${id}`);
      setNote(response.data);
      setSelectedNote(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching note:', err);
      setError('Failed to load note. It may have been deleted or not exist.');
      setLoading(false);
    }
  }, [setSelectedNote]);

  // Fetch the note if not provided via props
  useEffect(() => {
    if (selectedNote && selectedNote.id === noteId) {
      setNote(selectedNote);
      setLoading(false);
    } else {
      fetchNote(noteId);
    }
  }, [noteId, selectedNote, fetchNote]);
  
  // Use useCallback for fetchRelatedNotes as well
  const fetchRelatedNotes = useCallback(async (id) => {
    try {
      const response = await axios.get(`/api/notes/${id}/related`);
      setRelatedNotes(response.data);
    } catch (err) {
      console.error('Error fetching related notes:', err);
    }
  }, []);

  // Fetch related notes whenever the note changes
  useEffect(() => {
    if (note) {
      fetchRelatedNotes(note.id);
    }
  }, [note, fetchRelatedNotes]);

  const handleEdit = () => {
    setEditedNote({
      ...note,
    });
    setEditing(true);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setEditedNote(null);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const response = await axios.put(`/api/notes/${noteId}`, editedNote);
      setNote(response.data);
      setSelectedNote(response.data);
      setEditing(false);
      setEditedNote(null);
      setLoading(false);
    } catch (err) {
      console.error('Error updating note:', err);
      setError('Failed to update note. Please try again.');
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      await axios.delete(`/api/notes/${noteId}`);
      setDeleteConfirmOpen(false);
      navigate('/');
    } catch (err) {
      console.error('Error deleting note:', err);
      setError('Failed to delete note. Please try again.');
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setEditedNote({
      ...editedNote,
      [field]: value,
    });
  };

  const handleTagsChange = (e) => {
    const tagsString = e.target.value;
    const tagsArray = tagsString
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
    
    setEditedNote({
      ...editedNote,
      tags: tagsArray,
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/')}
          variant="outlined"
        >
          Back to Graph
        </Button>
      </Box>
    );
  }

  if (!note) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Note not found. It may have been deleted or not exist.
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/')}
          variant="outlined"
        >
          Back to Graph
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton
            onClick={() => navigate('/')}
            sx={{ mr: 1 }}
            aria-label="back to graph"
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1">
            {editing ? 'Edit Note' : 'Note Details'}
          </Typography>
        </Box>
        
        <Box>
          {editing ? (
            <>
              <Button
                variant="outlined"
                startIcon={<CancelIcon />}
                onClick={handleCancelEdit}
                sx={{ mr: 1 }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
              >
                Save
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outlined"
                startIcon={<DeleteIcon />}
                onClick={() => setDeleteConfirmOpen(true)}
                sx={{ mr: 1 }}
                color="error"
              >
                Delete
              </Button>
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={handleEdit}
              >
                Edit
              </Button>
            </>
          )}
        </Box>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        {editing ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Title"
              fullWidth
              value={editedNote.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              variant="outlined"
            />
            
            <TextField
              label="Tags (comma-separated)"
              fullWidth
              value={editedNote.tags.join(', ')}
              onChange={handleTagsChange}
              variant="outlined"
            />
            
            <TextField
              label="Content"
              multiline
              rows={15}
              fullWidth
              value={editedNote.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              variant="outlined"
            />
          </Box>
        ) : (
          <>
            <Typography variant="h5" gutterBottom>
              {note.title}
            </Typography>
            
            {note.tags && note.tags.length > 0 && (
              <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {note.tags.map((tag, index) => (
                  <Chip 
                    key={index} 
                    label={tag} 
                    size="small" 
                    color="primary" 
                    variant="outlined" 
                  />
                ))}
              </Box>
            )}
            
            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ 
              p: 2, 
              backgroundColor: 'background.default', 
              borderRadius: 1,
              '& p': { my: 1 },
              '& h1, & h2, & h3, & h4, & h5, & h6': { mt: 2, mb: 1 },
              '& ul, & ol': { pl: 4 },
              '& code': { 
                backgroundColor: 'rgba(0, 0, 0, 0.05)',
                padding: '2px 4px',
                borderRadius: 1,
                fontFamily: 'monospace'
              }
            }}>
              <ReactMarkdown>
                {note.content}
              </ReactMarkdown>
            </Box>
            
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                {note.source ? `Source: ${note.source}` : ''}
              </Typography>
              
              <Typography variant="caption" color="text.secondary">
                {note.updated_at ? `Last updated: ${new Date(note.updated_at).toLocaleString()}` : ''}
              </Typography>
            </Box>
          </>
        )}
      </Paper>

      <Typography variant="h6" gutterBottom>
        Related Notes
      </Typography>
      {relatedNotes.length === 0 ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          No related notes found. This note exists in isolation.
        </Alert>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 3, mb: 3 }}>
          {relatedNotes.map((relatedNote) => (
            <Card key={relatedNote.id} variant="outlined">
              <CardActionArea onClick={() => navigate(`/note/${relatedNote.id}`)}>
                <CardContent>
                  <Typography variant="h6" noWrap>
                    {relatedNote.title}
                  </Typography>
                  <Box sx={{ mb: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {relatedNote.tags && relatedNote.tags.map((tag, index) => (
                      <Chip key={index} label={tag} size="small" />
                    ))}
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ 
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {relatedNote.content}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      )}

      <Button
        variant="outlined"
        startIcon={<HubIcon />}
        onClick={() => navigate('/')}
      >
        View in Graph
      </Button>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this note?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NoteView; 