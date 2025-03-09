import os
from typing import List, Dict, Any, Optional
import json
from neo4j import GraphDatabase
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Neo4jConnector:
    """Connector for Neo4j graph database"""
    
    def __init__(self):
        """Initialize Neo4j connection"""
        uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
        user = os.getenv("NEO4J_USER", "neo4j")
        password = os.getenv("NEO4J_PASSWORD", "password")
        
        self.driver = GraphDatabase.driver(uri, auth=(user, password))
    
    def close(self):
        """Close the Neo4j connection"""
        self.driver.close()
    
    def create_note(self, note: Dict[str, Any]) -> str:
        """
        Create a note in the database
        
        Args:
            note: Note dictionary
            
        Returns:
            Note ID
        """
        with self.driver.session() as session:
            result = session.execute_write(self._create_note_tx, note)
            return result
    
    def _create_note_tx(self, tx, note: Dict[str, Any]) -> str:
        """Transaction function for creating a note"""
        # Convert any nested dictionaries to JSON strings
        note_data = note.copy()
        if "metadata" in note_data and isinstance(note_data["metadata"], dict):
            note_data["metadata"] = json.dumps(note_data["metadata"])
        
        # Create the note
        query = """
        CREATE (n:Note {
            id: $id,
            title: $title,
            content: $content,
            tags: $tags,
            source: $source,
            created_at: $created_at,
            updated_at: $updated_at,
            metadata: $metadata
        })
        RETURN n.id as id
        """
        
        # Generate ID if not provided
        if "id" not in note_data or not note_data["id"]:
            import uuid
            note_data["id"] = f"note_{uuid.uuid4()}"
            
        # Ensure all fields are present
        note_data.setdefault("title", "Untitled Note")
        note_data.setdefault("content", "")
        note_data.setdefault("tags", [])
        note_data.setdefault("source", None)
        note_data.setdefault("created_at", None)
        note_data.setdefault("updated_at", None)
        note_data.setdefault("metadata", "{}")
        
        result = tx.run(
            query,
            id=note_data["id"],
            title=note_data["title"],
            content=note_data["content"],
            tags=note_data["tags"],
            source=note_data["source"],
            created_at=note_data["created_at"],
            updated_at=note_data["updated_at"],
            metadata=note_data["metadata"]
        )
        
        record = result.single()
        return record["id"]
    
    def delete_note(self, note_id: str) -> bool:
        """
        Delete a note and all its relationships
        
        Args:
            note_id: Note ID
            
        Returns:
            True if the note was deleted, False if not found
        """
        with self.driver.session() as session:
            result = session.execute_write(self._delete_note_tx, note_id)
            return result
    
    def _delete_note_tx(self, tx, note_id: str) -> bool:
        """Transaction function for deleting a note"""
        # First, delete all relationships involving this note
        delete_relationships_query = """
        MATCH (n:Note {id: $id})-[r]-()
        DELETE r
        """
        tx.run(delete_relationships_query, id=note_id)
        
        # Then, delete the note itself
        delete_note_query = """
        MATCH (n:Note {id: $id})
        DELETE n
        RETURN count(n) as deleted_count
        """
        
        result = tx.run(delete_note_query, id=note_id)
        record = result.single()
        
        # Return True if a note was deleted, False otherwise
        return record["deleted_count"] > 0
    
    def get_note(self, note_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a note by ID
        
        Args:
            note_id: Note ID
            
        Returns:
            Note dictionary or None if not found
        """
        with self.driver.session() as session:
            result = session.execute_read(self._get_note_tx, note_id)
            return result
    
    def _get_note_tx(self, tx, note_id: str) -> Optional[Dict[str, Any]]:
        """Transaction function for getting a note"""
        query = """
        MATCH (n:Note {id: $id})
        RETURN n
        """
        
        result = tx.run(query, id=note_id)
        record = result.single()
        
        if not record:
            return None
            
        node = record["n"]
        note = dict(node.items())
        
        # Parse metadata JSON
        if "metadata" in note and isinstance(note["metadata"], str):
            try:
                note["metadata"] = json.loads(note["metadata"])
            except json.JSONDecodeError:
                note["metadata"] = {}
                
        return note
    
    def get_all_notes(self) -> List[Dict[str, Any]]:
        """
        Get all notes
        
        Returns:
            List of note dictionaries
        """
        with self.driver.session() as session:
            result = session.execute_read(self._get_all_notes_tx)
            return result
    
    def _get_all_notes_tx(self, tx) -> List[Dict[str, Any]]:
        """Transaction function for getting all notes"""
        query = """
        MATCH (n:Note)
        RETURN n
        """
        
        result = tx.run(query)
        notes = []
        
        for record in result:
            node = record["n"]
            note = dict(node.items())
            
            # Parse metadata JSON
            if "metadata" in note and isinstance(note["metadata"], str):
                try:
                    note["metadata"] = json.loads(note["metadata"])
                except json.JSONDecodeError:
                    note["metadata"] = {}
                    
            notes.append(note)
            
        return notes
    
    def create_relationship(self, relationship: Dict[str, Any]) -> str:
        """
        Create a relationship between two notes
        
        Args:
            relationship: Relationship dictionary
            
        Returns:
            Relationship ID
        """
        with self.driver.session() as session:
            result = session.execute_write(self._create_relationship_tx, relationship)
            return result
    
    def _create_relationship_tx(self, tx, relationship: Dict[str, Any]) -> str:
        """Transaction function for creating a relationship"""
        # Convert any nested dictionaries to JSON strings
        rel_data = relationship.copy()
        if "metadata" in rel_data and isinstance(rel_data["metadata"], dict):
            rel_data["metadata"] = json.dumps(rel_data["metadata"])
        
        # Create the relationship
        query = """
        MATCH (source:Note {id: $source_id})
        MATCH (target:Note {id: $target_id})
        CREATE (source)-[r:RELATED_TO {
            type: $relationship_type,
            strength: $strength,
            metadata: $metadata
        }]->(target)
        RETURN id(r) as id
        """
        
        # Ensure all fields are present
        rel_data.setdefault("relationship_type", "related")
        rel_data.setdefault("strength", 0.5)
        rel_data.setdefault("metadata", "{}")
        
        result = tx.run(
            query,
            source_id=rel_data["source_id"],
            target_id=rel_data["target_id"],
            relationship_type=rel_data["relationship_type"],
            strength=rel_data["strength"],
            metadata=rel_data["metadata"]
        )
        
        record = result.single()
        return str(record["id"])
    
    def get_note_relationships(self, note_id: str) -> List[Dict[str, Any]]:
        """
        Get all relationships for a note
        
        Args:
            note_id: Note ID
            
        Returns:
            List of relationship dictionaries
        """
        with self.driver.session() as session:
            result = session.execute_read(self._get_note_relationships_tx, note_id)
            return result
    
    def _get_note_relationships_tx(self, tx, note_id: str) -> List[Dict[str, Any]]:
        """Transaction function for getting note relationships"""
        query = """
        MATCH (source:Note {id: $id})-[r:RELATED_TO]->(target:Note)
        RETURN source.id as source_id, target.id as target_id, r.type as relationship_type, 
               r.strength as strength, r.metadata as metadata
        UNION
        MATCH (source:Note)-[r:RELATED_TO]->(target:Note {id: $id})
        RETURN source.id as source_id, target.id as target_id, r.type as relationship_type, 
               r.strength as strength, r.metadata as metadata
        """
        
        result = tx.run(query, id=note_id)
        relationships = []
        
        for record in result:
            rel = {
                "source_id": record["source_id"],
                "target_id": record["target_id"],
                "relationship_type": record["relationship_type"],
                "strength": record["strength"]
            }
            
            # Parse metadata JSON
            metadata = record["metadata"]
            if metadata and isinstance(metadata, str):
                try:
                    rel["metadata"] = json.loads(metadata)
                except json.JSONDecodeError:
                    rel["metadata"] = {}
            else:
                rel["metadata"] = {}
                
            relationships.append(rel)
            
        return relationships
    
    def get_graph_data(self) -> Dict[str, Any]:
        """
        Get graph data for visualization
        
        Returns:
            Dictionary with nodes and links
        """
        with self.driver.session() as session:
            result = session.execute_read(self._get_graph_data_tx)
            return result
    
    def _get_graph_data_tx(self, tx) -> Dict[str, Any]:
        """Transaction function for getting graph data"""
        # Get nodes
        nodes_query = """
        MATCH (n:Note)
        RETURN n.id as id, n.title as title, n.tags as tags
        """
        
        nodes_result = tx.run(nodes_query)
        nodes = []
        
        for record in nodes_result:
            nodes.append({
                "id": record["id"],
                "label": record["title"],
                "tags": record["tags"]
            })
        
        # Get links
        links_query = """
        MATCH (source:Note)-[r:RELATED_TO]->(target:Note)
        RETURN source.id as source, target.id as target, r.type as type, r.strength as value
        """
        
        links_result = tx.run(links_query)
        links = []
        
        for record in links_result:
            links.append({
                "source": record["source"],
                "target": record["target"],
                "type": record["type"],
                "value": record["value"]
            })
        
        return {
            "nodes": nodes,
            "links": links
        }
    
    def search_notes(self, query: str) -> List[Dict[str, Any]]:
        """
        Search notes by title or content
        
        Args:
            query: Search query
            
        Returns:
            List of matching note dictionaries
        """
        with self.driver.session() as session:
            result = session.execute_read(self._search_notes_tx, query)
            return result
    
    def _search_notes_tx(self, tx, query: str) -> List[Dict[str, Any]]:
        """Transaction function for searching notes"""
        # Create case-insensitive pattern
        pattern = f"(?i).*{query}.*"
        
        search_query = """
        MATCH (n:Note)
        WHERE n.title =~ $pattern OR n.content =~ $pattern
        RETURN n
        """
        
        result = tx.run(search_query, pattern=pattern)
        notes = []
        
        for record in result:
            node = record["n"]
            note = dict(node.items())
            
            # Parse metadata JSON
            if "metadata" in note and isinstance(note["metadata"], str):
                try:
                    note["metadata"] = json.loads(note["metadata"])
                except json.JSONDecodeError:
                    note["metadata"] = {}
                    
            notes.append(note)
            
        return notes 