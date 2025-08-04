# 8Brain - Your Infinite Knowledge Companion

🧠 **Transform static documents into a dynamic, interconnected intelligence network with voice-first Graph RAG.**

## Overview

8Brain is an advanced knowledge management system that uses Graph RAG (Retrieval-Augmented Generation) to help users discover hidden connections between concepts across their personal document library. With voice-first interaction and real-time graph visualization, 8Brain makes knowledge exploration intuitive and powerful.

## Features

- 📄 **Multi-format Document Support** - PDF, DOCX, TXT, MD, EPUB
- 🎙️ **Voice-First Interface** - Natural language queries with Web Speech API
- 🔗 **Graph RAG Technology** - Dual database architecture (Pinecone + Neo4j)
- 🌐 **Interactive Knowledge Graph** - Visual exploration of concept relationships
- ⚡ **Real-time Processing** - <500ms query responses with 95%+ accuracy
- 🔒 **Privacy-First** - GDPR compliant, no training on user data

## Technology Stack

### Frontend
- React 18+ with TypeScript
- Vite for build tooling
- Tailwind CSS + Shadcn/UI
- D3.js for graph visualization
- Web Speech API for voice interaction

### Backend
- Node.js 18+ with Express
- TypeScript for type safety
- Pinecone for vector search
- Neo4j for knowledge graph
- OpenAI for embeddings & LLM

### Infrastructure
- AWS S3 for document storage
- Docker containerization
- GitHub Actions CI/CD

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- OpenAI API key
- Pinecone account
- Neo4j Aura instance

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/8brain-app.git
   cd 8brain-app
   ```

2. **Install dependencies**
   ```bash
   # Install frontend dependencies
   cd frontend
   npm install

   # Install backend dependencies
   cd ../backend
   npm install
   ```

3. **Environment setup**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Edit .env with your API keys and configuration
   nano .env
   ```

4. **Start development servers**
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev

   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - Health check: http://localhost:8000/api/health

## Project Structure

```
8brain-app/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/       # React components
│   │   │   ├── ui/          # Shadcn/UI components
│   │   │   ├── DocumentUploader.tsx
│   │   │   ├── VoiceInterface.tsx
│   │   │   └── GraphVisualization.tsx
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Utilities and API client
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
├── backend/                  # Node.js backend API
│   ├── src/
│   │   ├── routes/          # API route handlers
│   │   ├── services/        # Business logic services
│   │   ├── models/          # Data models
│   │   └── app.ts
│   ├── package.json
│   └── Dockerfile
└── shared/                   # Shared types and utilities
    ├── types/
    └── utils/
```

## Development

### Commands

```bash
# Frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint

# Backend
npm run dev          # Start with hot reload
npm run build        # Compile TypeScript
npm run start        # Start production server
npm run test         # Run tests
```

### Code Style

- TypeScript strict mode enabled
- ESLint with React and TypeScript rules
- Prettier for code formatting
- Conventional commit messages

## API Documentation

### Core Endpoints

- `POST /api/documents/upload` - Upload and process documents
- `POST /api/ai/query` - Query knowledge base with Graph RAG
- `GET /api/graph/explore` - Get graph visualization data
- `POST /api/auth/login` - User authentication
- `GET /api/user/analytics` - User analytics and insights

### Authentication

All API endpoints (except health check) require JWT authentication:

```bash
Authorization: Bearer <your-jwt-token>
```

## Deployment

### Production Build

```bash
# Build frontend
cd frontend
npm run build

# Build backend
cd ../backend
npm run build
```

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d
```

### Environment Variables

See `.env.example` for all required environment variables.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Submit a pull request

## Performance Targets

- **Query Response**: <500ms average
- **Accuracy**: 95%+ response accuracy
- **Uptime**: 99.9% availability
- **Scalability**: Support 10,000+ concurrent users

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📧 Email: support@8brain.ai
- 💬 Discord: [8Brain Community](https://discord.gg/8brain)
- 📖 Documentation: [docs.8brain.ai](https://docs.8brain.ai)
- 🐛 Issues: [GitHub Issues](https://github.com/your-org/8brain-app/issues)

---

**Built with ∞ (infinity) possibilities in mind.**