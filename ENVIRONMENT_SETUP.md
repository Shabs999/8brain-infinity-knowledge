# 8Brain Environment Setup Guide

## 🎯 Purpose
This guide helps you set up a working 8Brain environment for development and testing.

## 🛡️ Safety First
- **NEVER commit API keys to Git**
- **Always test in development first**
- **Keep production keys separate**

## 📋 Environment Variables

### Required for Basic Functionality
```bash
# Backend (.env)
NODE_ENV=development
PORT=8000
JWT_SECRET=8brain_super_secret_jwt_key_for_infinite_knowledge_2024
CORS_ORIGIN=http://localhost:3000
```

### Optional - AI Features (Phase 9)
```bash
# OpenAI for AI Analysis
OPENAI_API_KEY=sk-your-openai-key-here

# Anthropic for Claude AI
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here
```

### Optional - Database Features
```bash
# Vector Database (Pinecone)
PINECONE_API_KEY=your-pinecone-key
PINECONE_INDEX_NAME=8brain-knowledge

# Graph Database (Neo4j)
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your-password

# Document Storage (MongoDB)
MONGODB_URI=mongodb://localhost:27017/8brain
```

## 🚀 Quick Start Options

### Option 1: Minimal Setup (UI Testing Only)
- ✅ Works with current .env (no additional setup)
- ✅ Full UI functionality
- ❌ No real AI processing
- ❌ No document persistence

### Option 2: AI-Enabled Setup
- ✅ Add OpenAI API key
- ✅ Full AI Analysis features work
- ✅ Document upload UI works
- ❌ No document persistence

### Option 3: Full Setup
- ✅ All features working
- ✅ Document persistence
- ✅ Knowledge graph with real data
- ✅ Production-ready

## 🔧 Setup Steps

### Step 1: Copy Environment Template
```bash
cp backend/.env backend/.env.backup  # Backup current config
```

### Step 2: Add API Keys (Optional)
```bash
# Edit backend/.env
# Uncomment and add your keys:
OPENAI_API_KEY=sk-your-key-here
```

### Step 3: Test Configuration
```bash
# Start backend
cd backend && npm start

# Start frontend  
cd frontend && npm run dev

# Visit http://localhost:3000
```

## 🧪 Testing Each Level

### Level 1: Basic UI
- [x] Can navigate to all pages
- [x] Auth system works
- [x] UI components render properly

### Level 2: AI Features
- [x] AI Analysis page loads models
- [x] Can generate summaries/questions (with API key)
- [x] Cost tracking works

### Level 3: Full System
- [x] Document upload and storage
- [x] Search functionality
- [x] Knowledge graph with real data

## 🆘 Troubleshooting

### Issue: "No AI Models Available"
- **Cause**: Missing OPENAI_API_KEY or ANTHROPIC_API_KEY
- **Fix**: Add at least one API key to .env

### Issue: "Failed to load documents" 
- **Cause**: Missing MongoDB connection
- **Expected**: This is normal without database setup

### Issue: Backend won't start
- **Check**: All required .env variables are set
- **Check**: Port 8000 is available

## 📊 Cost Estimates

### OpenAI API Usage (Testing)
- **Document Summary**: ~$0.01 per document
- **Question Generation**: ~$0.02 per document  
- **Concept Extraction**: ~$0.015 per document
- **Daily testing budget**: $5-10 should be plenty

### Infrastructure (Production)
- **Pinecone**: $70/month (1M vectors)
- **MongoDB Atlas**: $9/month (shared)
- **Neo4j**: Free (community) or $65/month (enterprise)

---

**Last Updated**: August 5, 2025  
**Safe Branch**: feature/environment-integration