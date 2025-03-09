from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os
import json
from dotenv import load_dotenv
import sys
import uuid
from datetime import datetime
import re
from collections import Counter

# Add the parent directory to the path so we can import the db module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from db.graph_db import Neo4jConnector

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="NoteScape API",
    description="API for the NoteScape Semantic Note Graph Visualization System",
    version="0.1.0"
)

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data models
class Note(BaseModel):
    id: Optional[str] = None
    title: str
    content: str
    tags: Optional[List[str]] = []
    source: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = {}

class NoteRelationship(BaseModel):
    source_id: str
    target_id: str
    relationship_type: str
    strength: float
    metadata: Optional[Dict[str, Any]] = {}

class GraphData(BaseModel):
    nodes: List[Dict[str, Any]]
    links: List[Dict[str, Any]]

# Create Neo4j connector
neo4j_connector = Neo4jConnector()

# Routes
@app.get("/")
async def root():
    return {"message": "Welcome to the NoteScape API"}

@app.post("/notes/")
async def create_note(note: Note):
    """Create a new note"""
    try:
        # Generate ID if not provided
        if not note.id:
            note.id = f"note_{uuid.uuid4()}"
            
        # Set timestamps if not provided
        current_time = datetime.now().isoformat()
        if not note.created_at:
            note.created_at = current_time
        if not note.updated_at:
            note.updated_at = current_time
            
        # Create the note in Neo4j
        note_dict = note.dict()
        note_id = neo4j_connector.create_note(note_dict)
        
        # Try to store in vector database if available, but don't fail if it's not
        try:
            # Import vector DB connector
            import sys
            import os
            sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            from db.vector_db import get_vector_db
            
            # Get vector DB connector
            vector_db = get_vector_db()
            
            # Store note in vector DB
            vector_db.store_note(note_dict)
        except Exception as e:
            # Log error but continue - we can still use the note without vector embeddings
            print(f"Warning: Could not store note in vector database: {e}")
            print("Note was created in Neo4j but may not be available for semantic search.")
        
        return {"id": note_id, "message": "Note created successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/notes/")
async def get_notes():
    """Get all notes"""
    try:
        notes = neo4j_connector.get_all_notes()
        return notes
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/notes/{note_id}")
async def get_note(note_id: str):
    """Get a specific note by ID"""
    try:
        note = neo4j_connector.get_note(note_id)
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        return note
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/notes/{note_id}")
async def delete_note(note_id: str):
    """Delete a note by ID"""
    try:
        success = neo4j_connector.delete_note(note_id)
        if not success:
            raise HTTPException(status_code=404, detail="Note not found")
        return {"message": f"Note {note_id} deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/import/text")
async def import_text_notes(file: UploadFile = File(...), title: str = Form(None)):
    """Import notes from a text file"""
    try:
        content = await file.read()
        content_text = content.decode("utf-8")
        
        # Create a single note with the file content
        note = Note(
            title=title or file.filename,
            content=content_text,
            source=file.filename,
            created_at=datetime.now().isoformat()
        )
        created_note = await create_note(note)
        
        return {"message": f"Imported note from {file.filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze")
async def analyze_notes():
    """Analyze notes to extract relationships"""
    try:
        # Get all notes
        notes = neo4j_connector.get_all_notes()
        
        if not notes:
            return {"message": "No notes found to analyze"}
        
        # Enhanced keyword-based relationship extraction
        import re
        from collections import Counter
        
        # Extract keywords from each note
        note_keywords = {}
        for note in notes:
            # Convert to lowercase and remove punctuation
            text = re.sub(r'[^\w\s]', '', note["content"].lower())
            
            # Split into words
            words = text.split()
            
            # Remove common stop words
            stop_words = {
                'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been',
                'being', 'to', 'of', 'for', 'with', 'by', 'about', 'against', 'between', 'into',
                'through', 'during', 'before', 'after', 'above', 'below', 'from', 'up', 'down',
                'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once',
                'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each',
                'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only',
                'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just',
                'don', 'should', 'now', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves',
                'you', 'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself',
                'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their',
                'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this', 'that', 'these',
                'those', 'am', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing',
                'would', 'should', 'could', 'ought', 'i\'m', 'you\'re', 'he\'s', 'she\'s', 'it\'s',
                'we\'re', 'they\'re', 'i\'ve', 'you\'ve', 'we\'ve', 'they\'ve', 'i\'d', 'you\'d',
                'he\'d', 'she\'d', 'we\'d', 'they\'d', 'i\'ll', 'you\'ll', 'he\'ll', 'she\'ll',
                'we\'ll', 'they\'ll', 'isn\'t', 'aren\'t', 'wasn\'t', 'weren\'t', 'hasn\'t',
                'haven\'t', 'hadn\'t', 'doesn\'t', 'don\'t', 'didn\'t', 'won\'t', 'wouldn\'t',
                'shan\'t', 'shouldn\'t', 'can\'t', 'cannot', 'couldn\'t', 'mustn\'t', 'let\'s',
                'that\'s', 'who\'s', 'what\'s', 'here\'s', 'there\'s', 'when\'s', 'where\'s',
                'why\'s', 'how\'s'
            }
            
            # Filter out stop words and words with less than 3 characters
            filtered_words = [word for word in words if word not in stop_words and len(word) > 2]
            
            # Count word frequencies
            word_counts = Counter(filtered_words)
            
            # Get the top N keywords
            top_keywords = [word for word, count in word_counts.most_common(15)]
            note_keywords[note["id"]] = top_keywords
        
        # Find relationships based on shared keywords
        relationship_count = 0
        for i, note1 in enumerate(notes):
            for j, note2 in enumerate(notes):
                if i < j:  # Only process each pair once
                    # Get keywords for both notes
                    keywords1 = set(note_keywords[note1["id"]])
                    keywords2 = set(note_keywords[note2["id"]])
                    
                    # Find shared keywords
                    shared_keywords = keywords1.intersection(keywords2)
                    
                    # Create relationship if there are enough shared keywords
                    if len(shared_keywords) >= 2:  # At least 2 shared important keywords
                        # Calculate strength based on number of shared keywords
                        strength = min(0.9, len(shared_keywords) / 10)  # Cap at 0.9
                        
                        relationship = {
                            "source_id": note1["id"],
                            "target_id": note2["id"],
                            "relationship_type": "shared_topics",
                            "strength": strength,
                            "metadata": {"shared_keywords": list(shared_keywords)}
                        }
                        neo4j_connector.create_relationship(relationship)
                        relationship_count += 1
        
        return {"message": f"Notes analyzed successfully. Created {relationship_count} relationships."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/graph")
async def get_graph():
    """Get the note graph data for visualization"""
    try:
        # Get all notes
        notes = neo4j_connector.get_all_notes()
        
        # Create nodes
        nodes = []
        for note in notes:
            nodes.append({
                "id": note["id"],
                "label": note["title"],
                "content": note["content"],
                "tags": note["tags"],
                "group": 1  # All notes in the same group for now
            })
        
        # Get all relationships
        links = []
        for note in notes:
            relationships = neo4j_connector.get_note_relationships(note["id"])
            for rel in relationships:
                # Only add each relationship once (avoid duplicates)
                if rel["source_id"] < rel["target_id"]:
                    links.append({
                        "source": rel["source_id"],
                        "target": rel["target_id"],
                        "type": rel["relationship_type"],
                        "value": rel["strength"]
                    })
        
        graph_data = GraphData(
            nodes=nodes,
            links=links
        )
        return graph_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/search")
async def semantic_search(query: str = Form(...)):
    """Search notes based on semantic similarity"""
    # Simple text search for now
    try:
        notes = neo4j_connector.get_all_notes()
        results = []
        
        for note in notes:
            if query.lower() in note["content"].lower() or query.lower() in note["title"].lower():
                results.append(note)
        
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Run the API server
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("API_PORT", 8000))
    host = os.getenv("API_HOST", "0.0.0.0")
    uvicorn.run("main:app", host=host, port=port, reload=True) 