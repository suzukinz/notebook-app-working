# NoteSpace Hybrid AI Infrastructure
## Local + Cloud AI Models Integration

### 🎯 Overview

**Yes, models are installed and run locally!** This implementation provides a complete hybrid AI architecture that:

- **Runs AI models locally** (Ollama + Hugging Face) for privacy and speed
- **Falls back to cloud APIs** (OpenAI/Anthropic) for high-quality tasks
- **Intelligently routes requests** based on privacy, cost, and performance requirements

### 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                Frontend App                         │
└─────────────────┬───────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────┐
│            Hybrid AI Manager                       │
│        (Intelligent Request Routing)               │
└─────┬──────────────┬──────────────┬─────────────────┘
      │              │              │
┌─────▼─────┐ ┌──────▼──────┐ ┌─────▼──────┐
│  Ollama   │ │ Hugging Face│ │   Cloud    │
│Local LLMs │ │ Transformers│ │ APIs (GPT) │
│           │ │             │ │            │
│• Llama3.2 │ │• DistilBERT │ │• GPT-4o    │
│• CodeLlama│ │• MiniLM     │ │• Claude    │
│• Embeddings│ │• Custom    │ │• Fallback  │
└───────────┘ └─────────────┘ └────────────┘
```

### 🚀 Quick Start

#### 1. Prerequisites
```bash
# System Requirements
- Docker & Docker Compose
- 8GB+ RAM (16GB recommended)
- 20GB+ disk space
- Optional: NVIDIA GPU for faster inference

# Install Docker (Ubuntu/Debian)
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.21.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### 2. Setup AI Infrastructure
```bash
# Clone and navigate to project
cd notebook-app-working

# Make setup script executable
chmod +x scripts/setup-ai.sh

# Run complete setup (downloads models, starts services)
./scripts/setup-ai.sh setup

# This will:
# ✅ Check system requirements
# ✅ Build custom Docker images
# ✅ Start Ollama + Hugging Face + Redis
# ✅ Download AI models (Llama3.2, DistilBERT, etc.)
# ✅ Run health checks
# ✅ Provide service URLs
```

#### 3. Verify Installation
```bash
# Check service status
./scripts/setup-ai.sh health

# Test AI functionality  
./scripts/setup-ai.sh test

# View logs
docker-compose -f docker-compose.ai.yml logs -f
```

### 🔧 Configuration

#### AI Routing Strategy
Edit `config/ai-config.json` to customize AI behavior:

```json
{
  "routing": {
    "strategies": {
      "privacy-first": {
        "preferLocal": true,
        "allowCloud": false,
        "fallbackToCloud": false
      },
      "cost-optimized": {
        "preferLocal": true,
        "allowCloud": true,
        "fallbackToCloud": true,
        "maxCloudCost": 0.01
      }
    },
    "taskRouting": {
      "text-classification": {
        "preferredProvider": "ollama",
        "maxLatency": 1000
      },
      "text-generation": {
        "preferredProvider": "ollama", 
        "fallbackProvider": "cloud"
      }
    }
  }
}
```

#### Environment Variables
Edit `.env` file for API keys and resource limits:

```bash
# API Keys (optional - for cloud fallback)
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here

# Resource Limits
OLLAMA_MAX_MEMORY=8G
HF_MAX_MEMORY=4G
OLLAMA_NUM_PARALLEL=4
```

### 🎮 Usage Examples

#### 1. Using Hybrid AI Manager Directly
```typescript
import { hybridAIManager } from './services/ai/HybridAIManager';

// Initialize with config
await hybridAIManager.initialize({
  providers: {
    ollama: { enabled: true },
    huggingface: { enabled: true },
    cloud: { enabled: true, apiKeys: { openai: 'sk-...' } }
  }
});

// Smart text classification (runs locally for privacy)
const response = await hybridAIManager.processRequest({
  task: 'text-classification',
  input: { text: 'This product is amazing!', categories: ['positive', 'negative'] },
  options: { preferLocal: true, cacheResults: true },
  privacyLevel: 'confidential' // Forces local processing
});
```

#### 2. Using React Hook
```typescript
import { useHybridAI } from './services/ai/HybridAIManager';

function NoteEditor() {
  const hybridAI = useHybridAI();
  
  const classifyNote = async (content: string) => {
    const result = await hybridAI.processRequest({
      task: 'text-classification',
      input: { text: content, categories: ['work', 'personal', 'idea'] },
      options: { preferLocal: true, maxLatency: 2000 },
      privacyLevel: 'internal'
    });
    
    console.log(`Category: ${result.result.category}`);
    console.log(`Model used: ${result.modelUsed} (${result.metadata.modelType})`);
    console.log(`Processing time: ${result.executionTime}ms`);
  };
}
```

#### 3. API Endpoints (HTTP)
```bash
# Text Classification (Local)
curl -X POST http://localhost:8080/classify \
  -H "Content-Type: application/json" \
  -d '{
    "text": "I love this new feature!",
    "task": "sentiment-analysis"
  }'

# Text Generation (Ollama)
curl -X POST http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.2:3b",
    "prompt": "Summarize this meeting: ...",
    "stream": false
  }'

# Text Embeddings (HuggingFace)
curl -X POST http://localhost:8080/embed \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Convert this text to vector",
    "model": "sentence-transformers/all-MiniLM-L6-v2"
  }'
```

### 📊 Model Comparison

| Model | Provider | Size | Use Case | Privacy | Speed | Quality |
|-------|----------|------|----------|---------|-------|---------|
| Llama3.2:1B | Ollama | 1.3GB | Classification | 🔒 Local | ⚡ Fast | ⭐⭐⭐ |
| Llama3.2:3B | Ollama | 2.0GB | Generation | 🔒 Local | ⚡ Medium | ⭐⭐⭐⭐ |
| CodeLlama:7B | Ollama | 3.8GB | Code | 🔒 Local | ⚡ Slow | ⭐⭐⭐⭐⭐ |
| DistilBERT | HuggingFace | 250MB | Classification | 🔒 Local | ⚡ Very Fast | ⭐⭐⭐⭐ |
| MiniLM | HuggingFace | 90MB | Embeddings | 🔒 Local | ⚡ Very Fast | ⭐⭐⭐ |
| GPT-4o Mini | OpenAI | - | All Tasks | ☁️ Cloud | ⚡ Medium | ⭐⭐⭐⭐⭐ |

### 🔍 Monitoring & Debugging

#### Service Health
```bash
# Check all services
docker-compose -f docker-compose.ai.yml ps

# Service-specific health
curl http://localhost:11434/api/version      # Ollama
curl http://localhost:8080/health            # HuggingFace
curl http://localhost:3005/health            # AI Manager (if enabled)
```

#### Resource Usage
```bash
# Monitor resource usage
docker stats

# GPU usage (if available)
nvidia-smi

# Disk usage (models can be large)
du -sh models/
```

#### Logs & Debugging
```bash
# View all logs
docker-compose -f docker-compose.ai.yml logs -f

# Service-specific logs
docker-compose -f docker-compose.ai.yml logs -f ollama
docker-compose -f docker-compose.ai.yml logs -f hf-transformers

# AI Manager logs
docker logs notescape-ai-manager -f
```

### 🛠️ Maintenance

#### Model Updates
```bash
# Update Ollama models
docker exec notescape-ollama ollama pull llama3.2:3b

# Restart services after config changes
docker-compose -f docker-compose.ai.yml restart

# Clean up old models
docker exec notescape-ollama ollama rm old-model:version
```

#### Performance Tuning
```bash
# Increase Ollama parallelism
echo 'OLLAMA_NUM_PARALLEL=8' >> .env

# Adjust memory limits
echo 'OLLAMA_MAX_MEMORY=16G' >> .env

# Restart with new config
docker-compose -f docker-compose.ai.yml down
docker-compose -f docker-compose.ai.yml up -d
```

### 🚨 Troubleshooting

#### Common Issues

**1. Out of Memory**
```bash
# Check memory usage
free -h

# Reduce model parallelism
OLLAMA_NUM_PARALLEL=2 docker-compose -f docker-compose.ai.yml up -d
```

**2. Models Not Loading**
```bash
# Check disk space
df -h

# Manual model download
docker exec -it notescape-ollama ollama pull llama3.2:1b
```

**3. Slow Performance**
```bash
# Enable GPU (if available)
docker-compose -f docker-compose.ai.yml --profile gpu up -d

# Use smaller models
# Edit config/ai-config.json to prefer 1B models
```

**4. Network Issues**
```bash
# Check service connectivity
docker network ls
docker network inspect notescape-ai-network_ai-network
```

### 💡 Best Practices

#### Privacy-First Setup
```json
{
  "routing": {
    "defaultStrategy": "privacy-first",
    "allowCloud": false,
    "logInputs": false,
    "logOutputs": false,
    "encryptCache": true
  }
}
```

#### Production Deployment
- Use Docker Swarm or Kubernetes for orchestration
- Set up persistent volumes for model storage
- Configure backup strategies for trained models
- Implement proper monitoring and alerting
- Use HTTPS for all API endpoints
- Set up proper API authentication

### 📈 Scaling

#### Horizontal Scaling
```yaml
# Scale specific services
docker-compose -f docker-compose.ai.yml up -d --scale hf-transformers=3

# Load balancer for multiple instances
# Add nginx or similar in front of AI services
```

#### Vertical Scaling
```yaml
# Increase resource limits
deploy:
  resources:
    limits:
      memory: 16G
    reservations:
      memory: 8G
```

This hybrid approach gives you the **best of both worlds**:
- 🔒 **Privacy**: Sensitive data stays local
- 💰 **Cost**: Avoid expensive API calls for simple tasks  
- ⚡ **Speed**: Local inference eliminates network latency
- 🎯 **Quality**: Cloud fallback for complex tasks
- 🛡️ **Reliability**: Multiple providers prevent single points of failure