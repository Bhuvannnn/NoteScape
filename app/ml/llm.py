import os
from typing import List, Dict, Any, Optional
import json
from dotenv import load_dotenv
import openai
from anthropic import Anthropic, HUMAN_PROMPT, AI_PROMPT

# Load environment variables
load_dotenv()

class LLMInterface:
    """Base class for LLM integration"""
    
    def __init__(self, model_name: str = None):
        """
        Initialize the LLM interface
        
        Args:
            model_name: Name of the LLM model
        """
        self.model_name = model_name
    
    def generate_response(self, prompt: str, system_prompt: str = None, 
                          temperature: float = 0.7, max_tokens: int = 1000) -> str:
        """
        Generate a response from the LLM
        
        Args:
            prompt: User prompt/query
            system_prompt: System instructions
            temperature: Controls randomness (0.0 to 1.0)
            max_tokens: Maximum number of tokens to generate
            
        Returns:
            LLM response text
        """
        raise NotImplementedError("Subclasses must implement generate_response()")
    
    def analyze_note(self, note: Dict[str, Any], 
                    related_notes: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Analyze a note and provide insights
        
        Args:
            note: Note dictionary
            related_notes: List of related notes
            
        Returns:
            Dictionary with analysis results
        """
        system_prompt = """
        You are an intelligent assistant helping analyze notes. Provide insights about the 
        given note, including main topics, key concepts, and suggestions for expanding or 
        clarifying the content. If related notes are provided, identify connections and 
        potential gaps in knowledge.
        
        Return your analysis as a structured JSON with the following fields:
        - main_topics: List of main topics detected in the note
        - key_concepts: List of key concepts with brief descriptions
        - suggestions: List of suggestions for expanding or improving the note
        - connections: List of connections to related notes (if provided)
        - questions: List of questions that could be explored based on this note
        """
        
        # Prepare prompt with note content
        note_prompt = f"""
        # Note: {note.get('title', 'Untitled')}
        
        {note.get('content', '')}
        
        """
        
        # Add related notes if available
        if related_notes:
            note_prompt += "\n\n# Related Notes:\n"
            for i, related_note in enumerate(related_notes):
                note_prompt += f"\n## {i+1}. {related_note.get('title', 'Untitled')}\n"
                # Include a snippet of the related note
                content = related_note.get('content', '')
                note_prompt += f"{content[:300]}{'...' if len(content) > 300 else ''}\n"
        
        # Generate analysis
        response = self.generate_response(
            prompt=note_prompt,
            system_prompt=system_prompt,
            temperature=0.3,  # Lower temperature for more factual response
            max_tokens=1500
        )
        
        # Parse JSON response
        try:
            # Extract JSON from response (in case the model adds extra text)
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            if json_start != -1 and json_end != -1:
                json_str = response[json_start:json_end]
                return json.loads(json_str)
            return json.loads(response)
        except json.JSONDecodeError:
            # If JSON parsing fails, return a formatted dict with the raw response
            return {
                'main_topics': [],
                'key_concepts': [],
                'suggestions': [],
                'connections': [],
                'questions': [],
                'raw_response': response
            }
    
    def generate_graph_insights(self, notes: List[Dict[str, Any]], 
                              relationships: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Generate insights about the knowledge graph
        
        Args:
            notes: List of notes
            relationships: List of relationships
            
        Returns:
            Dictionary with insights
        """
        system_prompt = """
        You are an intelligent assistant analyzing a knowledge graph of notes. Provide insights 
        about the overall structure, identify clusters of related topics, knowledge gaps, and 
        suggestions for further exploration.
        
        Return your analysis as a structured JSON with the following fields:
        - topic_clusters: List of identified topic clusters with constituent notes
        - central_notes: List of central notes that connect many others
        - knowledge_gaps: Identified gaps or areas that could be expanded
        - exploration_paths: Suggested paths through the knowledge graph for exploration
        - recommendations: Suggestions for new notes or areas to develop
        """
        
        # Prepare prompt with graph summary
        graph_prompt = f"""
        # Knowledge Graph Summary
        
        Number of notes: {len(notes)}
        Number of relationships: {len(relationships)}
        
        ## Sample Notes:
        """
        
        # Include sample of notes (up to 10)
        for i, note in enumerate(notes[:10]):
            graph_prompt += f"\n{i+1}. {note.get('title', 'Untitled')}"
        
        # Generate analysis
        response = self.generate_response(
            prompt=graph_prompt,
            system_prompt=system_prompt,
            temperature=0.5,
            max_tokens=2000
        )
        
        # Parse JSON response
        try:
            # Extract JSON from response (in case the model adds extra text)
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            if json_start != -1 and json_end != -1:
                json_str = response[json_start:json_end]
                return json.loads(json_str)
            return json.loads(response)
        except json.JSONDecodeError:
            # If JSON parsing fails, return a formatted dict with the raw response
            return {
                'topic_clusters': [],
                'central_notes': [],
                'knowledge_gaps': [],
                'exploration_paths': [],
                'recommendations': [],
                'raw_response': response
            }
    
    def answer_question(self, question: str, 
                      relevant_notes: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Answer a question based on the knowledge graph
        
        Args:
            question: User question
            relevant_notes: Relevant notes from the knowledge graph
            
        Returns:
            Dictionary with answer and citations
        """
        system_prompt = """
        You are a knowledgeable assistant answering questions based on a collection of notes. 
        Provide accurate and helpful answers based only on the information in the provided notes. 
        If the notes don't contain sufficient information to answer the question, acknowledge that.
        
        Include citations to specific notes when providing information from them, using the format [Note: Title].
        
        Return your answer as a structured JSON with the following fields:
        - answer: Your comprehensive answer to the question
        - citations: List of notes cited in your answer (with titles and IDs)
        - confidence: Your confidence level in the answer (high, medium, low)
        - missing_info: Any missing information that would help provide a better answer
        """
        
        # Prepare prompt with question and relevant notes
        qa_prompt = f"""
        # Question:
        {question}
        
        # Relevant Notes:
        """
        
        # Include relevant notes
        for i, note in enumerate(relevant_notes):
            qa_prompt += f"\n## {i+1}. {note.get('title', 'Untitled')} (ID: {note.get('id', '')})\n"
            qa_prompt += f"{note.get('content', '')}\n"
        
        # Generate answer
        response = self.generate_response(
            prompt=qa_prompt,
            system_prompt=system_prompt,
            temperature=0.3,  # Lower temperature for more factual response
            max_tokens=1500
        )
        
        # Parse JSON response
        try:
            # Extract JSON from response (in case the model adds extra text)
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            if json_start != -1 and json_end != -1:
                json_str = response[json_start:json_end]
                return json.loads(json_str)
            return json.loads(response)
        except json.JSONDecodeError:
            # If JSON parsing fails, return a formatted dict with the raw response
            return {
                'answer': response,
                'citations': [],
                'confidence': 'medium',
                'missing_info': 'Unable to parse structured response'
            }


class OpenAIInterface(LLMInterface):
    """Interface for OpenAI LLMs"""
    
    def __init__(self, model_name: str = "gpt-4"):
        """
        Initialize the OpenAI interface
        
        Args:
            model_name: OpenAI model name
        """
        super().__init__(model_name)
        
        # Set API key from environment
        openai.api_key = os.getenv("OPENAI_API_KEY")
        
        if not openai.api_key:
            raise ValueError("OpenAI API key not found in environment variables")
    
    def generate_response(self, prompt: str, system_prompt: str = None, 
                          temperature: float = 0.7, max_tokens: int = 1000) -> str:
        """
        Generate a response from the OpenAI LLM
        
        Args:
            prompt: User prompt/query
            system_prompt: System instructions
            temperature: Controls randomness (0.0 to 1.0)
            max_tokens: Maximum number of tokens to generate
            
        Returns:
            LLM response text
        """
        messages = []
        
        # Add system message if provided
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
            
        # Add user message
        messages.append({"role": "user", "content": prompt})
        
        # Generate response
        response = openai.chat.completions.create(
            model=self.model_name,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens
        )
        
        return response.choices[0].message.content


class AnthropicInterface(LLMInterface):
    """Interface for Anthropic Claude LLMs"""
    
    def __init__(self, model_name: str = "claude-3-opus-20240229"):
        """
        Initialize the Anthropic interface
        
        Args:
            model_name: Anthropic model name
        """
        super().__init__(model_name)
        
        # Set API key from environment
        api_key = os.getenv("ANTHROPIC_API_KEY")
        
        if not api_key:
            raise ValueError("Anthropic API key not found in environment variables")
            
        self.client = Anthropic(api_key=api_key)
    
    def generate_response(self, prompt: str, system_prompt: str = None, 
                          temperature: float = 0.7, max_tokens: int = 1000) -> str:
        """
        Generate a response from the Anthropic LLM
        
        Args:
            prompt: User prompt/query
            system_prompt: System instructions
            temperature: Controls randomness (0.0 to 1.0)
            max_tokens: Maximum number of tokens to generate
            
        Returns:
            LLM response text
        """
        # Create prompt in Anthropic format
        full_prompt = f"{HUMAN_PROMPT} {prompt}{AI_PROMPT}"
        
        # Generate response
        response = self.client.completions.create(
            model=self.model_name,
            prompt=full_prompt,
            temperature=temperature,
            max_tokens_to_sample=max_tokens,
            system=system_prompt
        )
        
        return response.completion


def get_llm_interface() -> LLMInterface:
    """
    Factory function to get the appropriate LLM interface based on environment
    
    Returns:
        LLM interface instance
    """
    # Check if OpenAI API key is available
    if os.getenv("OPENAI_API_KEY"):
        try:
            return OpenAIInterface()
        except Exception as e:
            print(f"Error initializing OpenAI interface: {e}. Trying Anthropic...")
    
    # Check if Anthropic API key is available
    if os.getenv("ANTHROPIC_API_KEY"):
        try:
            return AnthropicInterface()
        except Exception as e:
            print(f"Error initializing Anthropic interface: {e}.")
    
    # No LLM available
    raise ValueError("No LLM API keys configured. Please set environment variables for OpenAI or Anthropic.") 