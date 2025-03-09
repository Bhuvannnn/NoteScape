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
            
        # Convert to dictionary for the connector
        note_dict = note.dict()
        
        # Create note in Neo4j
        note_id = neo4j_connector.create_note(note_dict)
        note.id = note_id
        
        return note
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
async def import_text_notes(file: UploadFile = File(...)):
    """Import notes from a text file"""
    try:
        content = await file.read()
        content_text = content.decode("utf-8")
        
        # Simple parsing - each line is a separate note
        lines = content_text.split("\n")
        notes = []
        
        for i, line in enumerate(lines):
            if line.strip():
                note = Note(
                    title=f"Note {i+1}",
                    content=line.strip(),
                    source=file.filename,
                    created_at=datetime.now().isoformat()
                )
                created_note = await create_note(note)
                notes.append(created_note)
        
        return {"message": f"Imported {len(notes)} notes from {file.filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze")
async def analyze_notes():
    """Analyze notes to extract relationships"""
    try:
        # Get all notes
        notes = neo4j_connector.get_all_notes()
        
        # Simple relationship creation - connect notes with similar words
        for i, note1 in enumerate(notes):
            for j, note2 in enumerate(notes):
                if i != j:  # Don't connect a note to itself
                    # Simple similarity - count common words
                    words1 = set(note1["content"].lower().split())
                    words2 = set(note2["content"].lower().split())
                    common_words = words1.intersection(words2)
                    
                    if len(common_words) > 0:
                        # Create relationship
                        strength = len(common_words) / max(len(words1), len(words2))
                        relationship = {
                            "source_id": note1["id"],
                            "target_id": note2["id"],
                            "relationship_type": "similar",
                            "strength": strength,
                            "metadata": {"common_words": list(common_words)}
                        }
                        neo4j_connector.create_relationship(relationship)
        
        return {"message": "Notes analyzed successfully"}
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