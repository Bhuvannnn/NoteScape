import os
import json
import re
from typing import List, Dict, Any, Optional
from datetime import datetime
import fitz  # PyMuPDF for PDF parsing
from bs4 import BeautifulSoup
import pandas as pd

class NoteParser:
    """Base class for note parsers"""
    
    def parse(self, content: str, source: str = None, metadata: Dict = None) -> List[Dict]:
        """
        Parse content into a list of note dictionaries
        
        Args:
            content: The content to parse
            source: The source of the content
            metadata: Additional metadata
            
        Returns:
            List of note dictionaries
        """
        raise NotImplementedError("Subclasses must implement parse()")
    
    def _create_note_dict(self, title: str, content: str, tags: List[str] = None, 
                         source: str = None, created_at: str = None, 
                         updated_at: str = None, metadata: Dict = None) -> Dict:
        """
        Create a standardized note dictionary
        
        Args:
            title: Note title
            content: Note content
            tags: List of tags
            source: Source of the note
            created_at: Creation timestamp
            updated_at: Update timestamp
            metadata: Additional metadata
            
        Returns:
            Note dictionary
        """
        return {
            "title": title,
            "content": content,
            "tags": tags or [],
            "source": source,
            "created_at": created_at or datetime.now().isoformat(),
            "updated_at": updated_at or datetime.now().isoformat(),
            "metadata": metadata or {}
        }


class PlainTextParser(NoteParser):
    """Parser for plain text files"""
    
    def parse(self, content: str, source: str = None, metadata: Dict = None) -> List[Dict]:
        """
        Parse plain text content
        
        Strategy:
        - Split by markdown-style headers (## Title)
        - If no headers, treat as a single note
        
        Args:
            content: Plain text content
            source: Source file path
            metadata: Additional metadata
            
        Returns:
            List of note dictionaries
        """
        notes = []
        metadata = metadata or {}
        
        # Check if the content has markdown-style headers
        header_pattern = r'^#{1,6}\s+(.+)$'
        headers = re.findall(header_pattern, content, re.MULTILINE)
        
        if headers:
            # Split by headers
            sections = re.split(header_pattern, content, flags=re.MULTILINE)
            sections = sections[1:]  # Remove the first element (empty content before first header)
            
            # Pair headers with content
            for i in range(0, len(sections), 2):
                if i+1 < len(sections):
                    title = sections[i].strip()
                    note_content = sections[i+1].strip()
                    
                    # Extract tags with hashtag pattern
                    tags = re.findall(r'#(\w+)', note_content)
                    
                    notes.append(self._create_note_dict(
                        title=title,
                        content=note_content,
                        tags=tags,
                        source=source,
                        metadata=metadata
                    ))
        else:
            # No headers, treat as a single note
            # Use the first line as title if it's not too long
            lines = content.split('\n')
            title = lines[0][:50] if lines and lines[0] else "Untitled Note"
            
            # Extract tags with hashtag pattern
            tags = re.findall(r'#(\w+)', content)
            
            notes.append(self._create_note_dict(
                title=title,
                content=content,
                tags=tags,
                source=source,
                metadata=metadata
            ))
            
        return notes


class JSONParser(NoteParser):
    """Parser for JSON-formatted notes"""
    
    def parse(self, content: str, source: str = None, metadata: Dict = None) -> List[Dict]:
        """
        Parse JSON-formatted content
        
        Args:
            content: JSON content
            source: Source file path
            metadata: Additional metadata
            
        Returns:
            List of note dictionaries
        """
        try:
            data = json.loads(content)
            notes = []
            
            # Handle array of notes
            if isinstance(data, list):
                for item in data:
                    if isinstance(item, dict):
                        title = item.get('title', item.get('name', 'Untitled Note'))
                        note_content = item.get('content', item.get('text', item.get('body', '')))
                        tags = item.get('tags', [])
                        created_at = item.get('created_at', item.get('createdAt', None))
                        updated_at = item.get('updated_at', item.get('updatedAt', None))
                        
                        notes.append(self._create_note_dict(
                            title=title,
                            content=note_content,
                            tags=tags,
                            source=source,
                            created_at=created_at,
                            updated_at=updated_at,
                            metadata={**item, **metadata} if metadata else item
                        ))
            
            # Handle single note object
            elif isinstance(data, dict):
                notes_array = data.get('notes', [])
                
                if notes_array and isinstance(notes_array, list):
                    # If there's a 'notes' field containing an array
                    return self.parse(json.dumps(notes_array), source, metadata)
                else:
                    # Handle as a single note
                    title = data.get('title', data.get('name', 'Untitled Note'))
                    note_content = data.get('content', data.get('text', data.get('body', '')))
                    tags = data.get('tags', [])
                    created_at = data.get('created_at', data.get('createdAt', None))
                    updated_at = data.get('updated_at', data.get('updatedAt', None))
                    
                    notes.append(self._create_note_dict(
                        title=title,
                        content=note_content,
                        tags=tags,
                        source=source,
                        created_at=created_at,
                        updated_at=updated_at,
                        metadata={**data, **metadata} if metadata else data
                    ))
                    
            return notes
        
        except json.JSONDecodeError:
            # If JSON parsing fails, try as plain text
            return PlainTextParser().parse(content, source, metadata)


class PDFParser(NoteParser):
    """Parser for PDF documents"""
    
    def parse(self, content: bytes, source: str = None, metadata: Dict = None) -> List[Dict]:
        """
        Parse PDF content
        
        Args:
            content: PDF content as bytes
            source: Source file path
            metadata: Additional metadata
            
        Returns:
            List of note dictionaries
        """
        notes = []
        metadata = metadata or {}
        
        try:
            # Create a temporary file for PyMuPDF
            temp_path = "temp_pdf.pdf"
            with open(temp_path, "wb") as f:
                f.write(content)
                
            # Open PDF
            doc = fitz.open(temp_path)
            
            # Extract text from each page
            full_text = ""
            for page_num, page in enumerate(doc):
                full_text += page.get_text()
                
            # Clean up
            doc.close()
            os.remove(temp_path)
            
            # Use the filename as title
            title = os.path.basename(source).replace('.pdf', '') if source else "PDF Note"
            
            # Create note
            notes.append(self._create_note_dict(
                title=title,
                content=full_text,
                source=source,
                metadata={**metadata, "page_count": len(doc)}
            ))
            
            return notes
            
        except Exception as e:
            # If PDF parsing fails, create a note about the failure
            notes.append(self._create_note_dict(
                title=f"Failed to parse PDF {source if source else ''}",
                content=f"Error parsing PDF: {str(e)}",
                source=source,
                metadata=metadata
            ))
            return notes


class HTMLParser(NoteParser):
    """Parser for HTML content"""
    
    def parse(self, content: str, source: str = None, metadata: Dict = None) -> List[Dict]:
        """
        Parse HTML content
        
        Args:
            content: HTML content
            source: Source URL or file path
            metadata: Additional metadata
            
        Returns:
            List of note dictionaries
        """
        notes = []
        metadata = metadata or {}
        
        try:
            soup = BeautifulSoup(content, 'html.parser')
            
            # Extract title
            title_tag = soup.find('title')
            title = title_tag.get_text() if title_tag else "Untitled HTML Note"
            
            # Extract content from body, removing scripts and styles
            for script in soup(["script", "style"]):
                script.extract()
                
            # Get text
            text = soup.get_text()
            
            # Clean text (remove excessive whitespace)
            lines = [line.strip() for line in text.splitlines() if line.strip()]
            note_content = '\n'.join(lines)
            
            # Extract metadata
            meta_tags = {}
            for meta in soup.find_all('meta'):
                name = meta.get('name', meta.get('property', ''))
                if name:
                    meta_tags[name] = meta.get('content', '')
            
            # Create note
            notes.append(self._create_note_dict(
                title=title,
                content=note_content,
                source=source,
                metadata={**metadata, "meta_tags": meta_tags}
            ))
            
            return notes
            
        except Exception as e:
            # If HTML parsing fails, try as plain text
            return PlainTextParser().parse(content, source, metadata)


class CSVParser(NoteParser):
    """Parser for CSV files"""
    
    def parse(self, content: str, source: str = None, metadata: Dict = None) -> List[Dict]:
        """
        Parse CSV content
        
        Args:
            content: CSV content
            source: Source file path
            metadata: Additional metadata
            
        Returns:
            List of note dictionaries
        """
        notes = []
        metadata = metadata or {}
        
        try:
            # Parse CSV
            df = pd.read_csv(content) if isinstance(content, str) else pd.read_csv(content)
            
            # Map column names to expected fields
            title_col = next((col for col in df.columns if col.lower() in ['title', 'name', 'subject']), df.columns[0])
            content_col = next((col for col in df.columns if col.lower() in ['content', 'text', 'body', 'note']), None)
            tags_col = next((col for col in df.columns if col.lower() in ['tags', 'categories', 'labels']), None)
            created_col = next((col for col in df.columns if 'creat' in col.lower() or 'date' in col.lower()), None)
            updated_col = next((col for col in df.columns if 'updat' in col.lower() or 'modif' in col.lower()), None)
            
            # Process each row as a note
            for _, row in df.iterrows():
                note_title = str(row[title_col]) if not pd.isna(row[title_col]) else "Untitled Note"
                note_content = ""
                
                # Include all columns in content
                for col in df.columns:
                    if not pd.isna(row[col]):
                        note_content += f"{col}: {row[col]}\n"
                
                # Extract tags if available
                tags = []
                if tags_col and not pd.isna(row[tags_col]):
                    tags_str = str(row[tags_col])
                    # Handle different tag formats (comma-separated, space-separated)
                    if ',' in tags_str:
                        tags = [tag.strip() for tag in tags_str.split(',')]
                    else:
                        tags = [tag.strip() for tag in tags_str.split()]
                
                # Handle dates
                created_at = str(row[created_col]) if created_col and not pd.isna(row[created_col]) else None
                updated_at = str(row[updated_col]) if updated_col and not pd.isna(row[updated_col]) else None
                
                # Add row as a note
                notes.append(self._create_note_dict(
                    title=note_title,
                    content=note_content,
                    tags=tags,
                    source=source,
                    created_at=created_at,
                    updated_at=updated_at,
                    metadata={**metadata, "row_index": _.index}
                ))
                
            return notes
            
        except Exception as e:
            # If CSV parsing fails, try as plain text
            return PlainTextParser().parse(content, source, metadata)


class ParserRegistry:
    """Registry of file parsers based on file extension"""
    
    def __init__(self):
        self.parsers = {
            '.txt': PlainTextParser(),
            '.md': PlainTextParser(),
            '.json': JSONParser(),
            '.pdf': PDFParser(),
            '.html': HTMLParser(),
            '.htm': HTMLParser(),
            '.csv': CSVParser(),
        }
    
    def get_parser(self, file_path: str) -> NoteParser:
        """
        Get parser based on file extension
        
        Args:
            file_path: Path to the file
            
        Returns:
            Appropriate parser for the file type
        """
        _, ext = os.path.splitext(file_path.lower())
        return self.parsers.get(ext, PlainTextParser())
    
    def register_parser(self, extension: str, parser: NoteParser):
        """
        Register a new parser for a file extension
        
        Args:
            extension: File extension (including dot)
            parser: Parser instance
        """
        self.parsers[extension.lower()] = parser 