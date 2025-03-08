# NoteScape: Semantic Note Graph Visualization System

A knowledge management system that extracts notes from various sources, analyzes semantic relationships between them, and visualizes them as an interactive knowledge graph.

## Features

- **Note Extraction**: Import notes from text files, note apps, and web sources
- **Semantic Analysis**: Analyze content to determine relationships between notes
- **Interactive Visualization**: Navigate your notes as an interactive graph
- **Knowledge Discovery**: Find connections between ideas you never knew existed
- **LLM Integration**: (Future) Interact with your notes using an AI assistant

## Project Structure

```
app/
├── api/           # FastAPI backend
├── client/        # React frontend
├── data/          # Data storage and parsing
├── db/            # Database connectors (Neo4j, vector DB)
├── ml/            # Machine learning components
└── utils/         # Utility functions
```

## Setup Instructions

### Prerequisites

- Python 3.9+
- Node.js 16+
- Docker (optional, for containerization)
- Neo4j (for graph database)

### Installation

1. Clone the repository
2. Install backend dependencies:
   ```
   pip install -r requirements.txt
   ```
3. Install frontend dependencies:
   ```
   cd app/client
   npm install
   ```

4. Set up environment variables (copy `.env.example` to `.env`)

5. Run the development servers:
   - Backend: `python app/api/main.py`
   - Frontend: `cd app/client && npm start`

## Technologies Used

- **Frontend**: React.js, D3.js/React Force Graph, MUI
- **Backend**: Python, FastAPI
- **Databases**: Neo4j (graph DB), Pinecone/Weaviate (vector DB)
- **ML**: Sentence Transformers, spaCy
- **LLM**: OpenAI API (future integration)

## Development Roadmap

1. Data extraction and parsing
2. Text analysis and relationship extraction
3. Graph generation and layout
4. Interactive UI development
5. Data management and storage
6. LLM agent integration

## License

MIT 