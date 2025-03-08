import os
import numpy as np
from typing import List, Dict, Any, Optional, Tuple, Union
from sentence_transformers import SentenceTransformer
import openai
from dotenv import load_dotenv
from sklearn.metrics.pairwise import cosine_similarity
import spacy

# Load environment variables
load_dotenv()

class EmbeddingModel:
    """Base class for embedding models"""
    
    def __init__(self):
        """Initialize the embedding model"""
        pass
    
    def get_embeddings(self, texts: List[str]) -> np.ndarray:
        """
        Generate embeddings for a list of texts
        
        Args:
            texts: List of texts to embed
            
        Returns:
            Array of embeddings (n_texts x embedding_dim)
        """
        raise NotImplementedError("Subclasses must implement get_embeddings()")
    
    def get_similarity(self, embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        """
        Calculate cosine similarity between two embeddings
        
        Args:
            embedding1: First embedding vector
            embedding2: Second embedding vector
            
        Returns:
            Cosine similarity score (0-1)
        """
        return float(cosine_similarity(embedding1.reshape(1, -1), embedding2.reshape(1, -1))[0][0])
    
    def get_pairwise_similarities(self, embeddings: np.ndarray) -> np.ndarray:
        """
        Calculate pairwise similarities between all embeddings
        
        Args:
            embeddings: Array of embeddings (n_texts x embedding_dim)
            
        Returns:
            Similarity matrix (n_texts x n_texts)
        """
        return cosine_similarity(embeddings)

    
class LocalEmbeddingModel(EmbeddingModel):
    """Local embedding model using Sentence Transformers"""
    
    def __init__(self, model_name_or_path: str = None):
        """
        Initialize the local embedding model
        
        Args:
            model_name_or_path: Model name or path (default: from env or 'all-MiniLM-L6-v2')
        """
        super().__init__()
        
        if model_name_or_path is None:
            model_name_or_path = os.getenv("EMBEDDING_MODEL_PATH", "all-MiniLM-L6-v2")
            
        self.model = SentenceTransformer(model_name_or_path)
    
    def get_embeddings(self, texts: List[str]) -> np.ndarray:
        """
        Generate embeddings for a list of texts
        
        Args:
            texts: List of texts to embed
            
        Returns:
            Array of embeddings (n_texts x embedding_dim)
        """
        return self.model.encode(texts)


class OpenAIEmbeddingModel(EmbeddingModel):
    """OpenAI API-based embedding model"""
    
    def __init__(self, model_name: str = "text-embedding-3-small"):
        """
        Initialize the OpenAI embedding model
        
        Args:
            model_name: OpenAI embedding model name
        """
        super().__init__()
        
        # Set API key from environment
        openai.api_key = os.getenv("OPENAI_API_KEY")
        
        if not openai.api_key:
            raise ValueError("OpenAI API key not found in environment variables")
            
        self.model_name = model_name
    
    def get_embeddings(self, texts: List[str]) -> np.ndarray:
        """
        Generate embeddings for a list of texts using OpenAI API
        
        Args:
            texts: List of texts to embed
            
        Returns:
            Array of embeddings (n_texts x embedding_dim)
        """
        # Batch the requests to avoid rate limits (max 20 per request)
        batch_size = 20
        all_embeddings = []
        
        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i:i+batch_size]
            
            response = openai.embeddings.create(
                input=batch_texts,
                model=self.model_name
            )
            
            # Extract embeddings from response
            batch_embeddings = [np.array(item.embedding) for item in response.data]
            all_embeddings.extend(batch_embeddings)
            
        # Convert list of embeddings to numpy array
        return np.array(all_embeddings)


class EntityExtractor:
    """Extract entities and keywords from text"""
    
    def __init__(self, model_name: str = "en_core_web_sm"):
        """
        Initialize the entity extractor
        
        Args:
            model_name: spaCy model name
        """
        # Load spaCy model
        try:
            self.nlp = spacy.load(model_name)
        except OSError:
            # Download the model if not installed
            import subprocess
            subprocess.run([
                "python", "-m", "spacy", "download", model_name
            ], check=True)
            self.nlp = spacy.load(model_name)
    
    def extract_entities(self, text: str) -> List[Dict[str, str]]:
        """
        Extract named entities from text
        
        Args:
            text: Text to extract entities from
            
        Returns:
            List of entities with type and text
        """
        doc = self.nlp(text)
        
        entities = []
        for ent in doc.ents:
            entities.append({
                "text": ent.text,
                "type": ent.label_,
                "start": ent.start_char,
                "end": ent.end_char
            })
            
        return entities
    
    def extract_keywords(self, text: str, n: int = 10) -> List[str]:
        """
        Extract important keywords from text
        
        Args:
            text: Text to extract keywords from
            n: Number of keywords to extract
            
        Returns:
            List of keywords
        """
        doc = self.nlp(text)
        
        # Extract nouns, proper nouns, and adjectives that aren't stopwords
        keywords = []
        for token in doc:
            if (token.pos_ in ["NOUN", "PROPN", "ADJ"] and 
                not token.is_stop and 
                len(token.text) > 1):
                keywords.append(token.lemma_)
                
        # Count frequency
        keyword_freq = {}
        for keyword in keywords:
            if keyword in keyword_freq:
                keyword_freq[keyword] += 1
            else:
                keyword_freq[keyword] = 1
                
        # Sort by frequency and take top n
        sorted_keywords = sorted(keyword_freq.items(), key=lambda x: x[1], reverse=True)
        return [k for k, _ in sorted_keywords[:n]]


class RelationshipExtractor:
    """Extract relationships between notes based on semantic similarity"""
    
    def __init__(self, embedding_model: EmbeddingModel, similarity_threshold: float = 0.6):
        """
        Initialize the relationship extractor
        
        Args:
            embedding_model: Model for generating embeddings
            similarity_threshold: Threshold for considering two notes related
        """
        self.embedding_model = embedding_model
        self.similarity_threshold = similarity_threshold
        self.entity_extractor = EntityExtractor()
    
    def extract_relationships(self, notes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Extract relationships between notes
        
        Args:
            notes: List of note dictionaries
            
        Returns:
            List of relationship dictionaries
        """
        if not notes:
            return []
        
        # Extract note contents and IDs
        note_ids = [note["id"] for note in notes]
        note_contents = [note["content"] for note in notes]
        
        # Generate embeddings
        embeddings = self.embedding_model.get_embeddings(note_contents)
        
        # Calculate pairwise similarities
        similarity_matrix = self.embedding_model.get_pairwise_similarities(embeddings)
        
        # Extract relationships above threshold
        relationships = []
        
        for i in range(len(notes)):
            for j in range(i+1, len(notes)):  # Only upper triangle to avoid duplicates
                similarity = similarity_matrix[i][j]
                
                if similarity >= self.similarity_threshold:
                    relationships.append({
                        "source_id": note_ids[i],
                        "target_id": note_ids[j],
                        "relationship_type": "semantic_similarity",
                        "strength": float(similarity),
                        "metadata": {}
                    })
        
        # Extract shared entities to enhance relationships
        self._enhance_with_entity_relationships(notes, relationships)
        
        return relationships
    
    def _enhance_with_entity_relationships(self, notes: List[Dict[str, Any]], 
                                          relationships: List[Dict[str, Any]]) -> None:
        """
        Enhance relationships with entity-based connections
        
        Args:
            notes: List of note dictionaries
            relationships: List of relationship dictionaries to update
        """
        # Extract entities for each note
        note_entities = {}
        for note in notes:
            entities = self.entity_extractor.extract_entities(note["content"])
            note_entities[note["id"]] = entities
        
        # Find shared entities between notes
        entity_relationships = []
        note_ids = [note["id"] for note in notes]
        
        for i in range(len(notes)):
            for j in range(i+1, len(notes)):  # Only upper triangle
                source_id = note_ids[i]
                target_id = note_ids[j]
                
                source_entities = {e["text"].lower() for e in note_entities[source_id]}
                target_entities = {e["text"].lower() for e in note_entities[target_id]}
                
                # Find shared entities
                shared_entities = source_entities.intersection(target_entities)
                
                if shared_entities:
                    # Check if this pair already has a relationship
                    existing = False
                    for rel in relationships:
                        if ((rel["source_id"] == source_id and rel["target_id"] == target_id) or
                            (rel["source_id"] == target_id and rel["target_id"] == source_id)):
                            # Update existing relationship
                            rel["metadata"]["shared_entities"] = list(shared_entities)
                            existing = True
                            break
                    
                    # Create new relationship if none exists
                    if not existing:
                        entity_relationships.append({
                            "source_id": source_id,
                            "target_id": target_id,
                            "relationship_type": "shared_entities",
                            "strength": min(1.0, len(shared_entities) / 5),  # Normalize strength
                            "metadata": {"shared_entities": list(shared_entities)}
                        })
        
        # Add new entity relationships
        relationships.extend(entity_relationships)


def get_embedding_model() -> EmbeddingModel:
    """
    Factory function to get the appropriate embedding model based on environment
    
    Returns:
        Embedding model instance
    """
    # Check if OpenAI API key is available
    if os.getenv("OPENAI_API_KEY"):
        try:
            return OpenAIEmbeddingModel()
        except Exception as e:
            print(f"Error initializing OpenAI model: {e}. Falling back to local model.")
    
    # Fall back to local model
    return LocalEmbeddingModel() 