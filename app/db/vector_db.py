import os
from typing import List, Dict, Any, Optional
import json
import numpy as np
from dotenv import load_dotenv
import pinecone
import weaviate
from app.ml.embedding import get_embedding_model, EmbeddingModel

# Load environment variables
load_dotenv()

class VectorDBConnector:
    """Base class for vector database connectors"""
    
    def __init__(self, embedding_model: Optional[EmbeddingModel] = None):
        """
        Initialize vector database connector
        
        Args:
            embedding_model: Model for generating embeddings
        """
        self.embedding_model = embedding_model or get_embedding_model()
    
    def store_note(self, note: Dict[str, Any]) -> str:
        """
        Store a note in the vector database
        
        Args:
            note: Note dictionary
            
        Returns:
            Note ID
        """
        raise NotImplementedError("Subclasses must implement store_note()")
    
    def delete_note(self, note_id: str) -> None:
        """
        Delete a note from the vector database
        
        Args:
            note_id: Note ID
        """
        raise NotImplementedError("Subclasses must implement delete_note()")
    
    def update_note(self, note: Dict[str, Any]) -> None:
        """
        Update a note in the vector database
        
        Args:
            note: Note dictionary
        """
        raise NotImplementedError("Subclasses must implement update_note()")
    
    def search(self, query: str, top_k: int = 10) -> List[Dict[str, Any]]:
        """
        Search for notes similar to the query
        
        Args:
            query: Search query
            top_k: Number of results to return
            
        Returns:
            List of note dictionaries with similarity scores
        """
        raise NotImplementedError("Subclasses must implement search()")


class PineconeConnector(VectorDBConnector):
    """Connector for Pinecone vector database"""
    
    def __init__(self, embedding_model: Optional[EmbeddingModel] = None):
        """
        Initialize Pinecone connector
        
        Args:
            embedding_model: Model for generating embeddings
        """
        super().__init__(embedding_model)
        
        # Initialize Pinecone
        api_key = os.getenv("PINECONE_API_KEY")
        environment = os.getenv("PINECONE_ENVIRONMENT")
        
        if not api_key or not environment:
            raise ValueError("Pinecone API key and environment must be set")
            
        pinecone.init(api_key=api_key, environment=environment)
        
        # Create or get index
        index_name = "notescape"
        dimension = 384  # Dimension of embedding model output
        
        if index_name not in pinecone.list_indexes():
            pinecone.create_index(name=index_name, dimension=dimension, metric="cosine")
            
        self.index = pinecone.Index(index_name)
    
    def store_note(self, note: Dict[str, Any]) -> str:
        """
        Store a note in Pinecone
        
        Args:
            note: Note dictionary
            
        Returns:
            Note ID
        """
        # Generate embedding
        embedding = self.embedding_model.get_embeddings([note["content"]])[0]
        
        # Create metadata
        metadata = {
            "title": note["title"],
            "content": note["content"][:1000],  # Limit content size for metadata
            "tags": note["tags"] if isinstance(note["tags"], list) else [],
            "source": note["source"] if note.get("source") else "",
            "created_at": note.get("created_at", ""),
            "updated_at": note.get("updated_at", "")
        }
        
        # Store in Pinecone
        self.index.upsert(
            vectors=[(note["id"], embedding.tolist(), metadata)]
        )
        
        return note["id"]
    
    def delete_note(self, note_id: str) -> None:
        """
        Delete a note from Pinecone
        
        Args:
            note_id: Note ID
        """
        self.index.delete(ids=[note_id])
    
    def update_note(self, note: Dict[str, Any]) -> None:
        """
        Update a note in Pinecone
        
        Args:
            note: Note dictionary
        """
        # For Pinecone, update is the same as store
        self.store_note(note)
    
    def search(self, query: str, top_k: int = 10) -> List[Dict[str, Any]]:
        """
        Search for notes similar to the query
        
        Args:
            query: Search query
            top_k: Number of results to return
            
        Returns:
            List of note dictionaries with similarity scores
        """
        # Generate query embedding
        query_embedding = self.embedding_model.get_embeddings([query])[0]
        
        # Search in Pinecone
        results = self.index.query(
            vector=query_embedding.tolist(),
            top_k=top_k,
            include_metadata=True
        )
        
        # Format results
        notes = []
        
        for match in results["matches"]:
            note = {
                "id": match["id"],
                "title": match["metadata"].get("title", ""),
                "content": match["metadata"].get("content", ""),
                "tags": match["metadata"].get("tags", []),
                "source": match["metadata"].get("source", ""),
                "created_at": match["metadata"].get("created_at", ""),
                "updated_at": match["metadata"].get("updated_at", ""),
                "similarity": match["score"]
            }
            
            notes.append(note)
            
        return notes


class WeaviateConnector(VectorDBConnector):
    """Connector for Weaviate vector database"""
    
    def __init__(self, embedding_model: Optional[EmbeddingModel] = None):
        """
        Initialize Weaviate connector
        
        Args:
            embedding_model: Model for generating embeddings
        """
        super().__init__(embedding_model)
        
        # Initialize Weaviate
        url = os.getenv("WEAVIATE_URL")
        api_key = os.getenv("WEAVIATE_API_KEY")
        
        if not url:
            raise ValueError("Weaviate URL must be set")
            
        auth_config = weaviate.auth.AuthApiKey(api_key=api_key) if api_key else None
        
        self.client = weaviate.Client(
            url=url,
            auth_client_secret=auth_config
        )
        
        # Create schema if it doesn't exist
        if not self.client.schema.get()["classes"]:
            self._create_schema()
    
    def _create_schema(self) -> None:
        """Create the Weaviate schema for notes"""
        note_class = {
            "class": "Note",
            "vectorizer": "none",  # We'll provide our own vectors
            "properties": [
                {"name": "title", "dataType": ["text"]},
                {"name": "content", "dataType": ["text"]},
                {"name": "tags", "dataType": ["text[]"]},
                {"name": "source", "dataType": ["text"]},
                {"name": "created_at", "dataType": ["date"]},
                {"name": "updated_at", "dataType": ["date"]}
            ]
        }
        
        self.client.schema.create_class(note_class)
    
    def store_note(self, note: Dict[str, Any]) -> str:
        """
        Store a note in Weaviate
        
        Args:
            note: Note dictionary
            
        Returns:
            Note ID
        """
        # Generate embedding
        embedding = self.embedding_model.get_embeddings([note["content"]])[0]
        
        # Create data object
        data_object = {
            "title": note["title"],
            "content": note["content"],
            "tags": note["tags"] if isinstance(note["tags"], list) else [],
            "source": note["source"] if note.get("source") else "",
            "created_at": note.get("created_at", ""),
            "updated_at": note.get("updated_at", "")
        }
        
        # Store in Weaviate
        with self.client.batch as batch:
            # Use provided ID or let Weaviate generate one
            weaviate_id = note["id"] if "id" in note else None
            batch.add_data_object(
                data_object=data_object,
                class_name="Note",
                uuid=weaviate_id,
                vector=embedding.tolist()
            )
            
        return note["id"]
    
    def delete_note(self, note_id: str) -> None:
        """
        Delete a note from Weaviate
        
        Args:
            note_id: Note ID
        """
        self.client.data_object.delete(
            uuid=note_id,
            class_name="Note"
        )
    
    def update_note(self, note: Dict[str, Any]) -> None:
        """
        Update a note in Weaviate
        
        Args:
            note: Note dictionary
        """
        # For Weaviate, update is the same as store
        self.store_note(note)
    
    def search(self, query: str, top_k: int = 10) -> List[Dict[str, Any]]:
        """
        Search for notes similar to the query
        
        Args:
            query: Search query
            top_k: Number of results to return
            
        Returns:
            List of note dictionaries with similarity scores
        """
        # Generate query embedding
        query_embedding = self.embedding_model.get_embeddings([query])[0]
        
        # Search in Weaviate
        results = (
            self.client.query
            .get("Note", ["id", "title", "content", "tags", "source", "created_at", "updated_at"])
            .with_near_vector({"vector": query_embedding.tolist()})
            .with_limit(top_k)
            .with_additional(["certainty"])
            .do()
        )
        
        # Format results
        notes = []
        
        if "data" in results and "Get" in results["data"] and "Note" in results["data"]["Get"]:
            for obj in results["data"]["Get"]["Note"]:
                note = {
                    "id": obj["id"],
                    "title": obj.get("title", ""),
                    "content": obj.get("content", ""),
                    "tags": obj.get("tags", []),
                    "source": obj.get("source", ""),
                    "created_at": obj.get("created_at", ""),
                    "updated_at": obj.get("updated_at", ""),
                    "similarity": obj["_additional"]["certainty"]
                }
                
                notes.append(note)
                
        return notes


def get_vector_db_connector() -> VectorDBConnector:
    """
    Factory function to get the appropriate vector database connector based on environment
    
    Returns:
        Vector database connector instance
    """
    # Check if Pinecone credentials are available
    if os.getenv("PINECONE_API_KEY") and os.getenv("PINECONE_ENVIRONMENT"):
        try:
            return PineconeConnector()
        except Exception as e:
            print(f"Error initializing Pinecone: {e}. Trying Weaviate...")
    
    # Check if Weaviate credentials are available
    if os.getenv("WEAVIATE_URL"):
        try:
            return WeaviateConnector()
        except Exception as e:
            print(f"Error initializing Weaviate: {e}.")
    
    # No vector database available
    raise ValueError("No vector database configured. Please set environment variables for Pinecone or Weaviate.") 