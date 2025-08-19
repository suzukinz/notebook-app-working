#!/bin/bash
# AI Infrastructure Setup Script
# Sets up Ollama + Hugging Face + Hybrid AI Manager

set -e

echo "🚀 Setting up NoteSpace Hybrid AI Infrastructure..."

# Check system requirements
check_requirements() {
    echo "📋 Checking system requirements..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker is required but not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        echo "❌ Docker Compose is required but not installed"
        exit 1
    fi
    
    # Check available memory
    AVAILABLE_RAM=$(free -g | awk '/^Mem:/{print $2}')
    if [ "$AVAILABLE_RAM" -lt 8 ]; then
        echo "⚠️  Warning: Less than 8GB RAM available. AI models may run slowly."
    fi
    
    # Check disk space
    AVAILABLE_DISK=$(df -BG . | tail -1 | awk '{print $4}' | sed 's/G//')
    if [ "$AVAILABLE_DISK" -lt 20 ]; then
        echo "⚠️  Warning: Less than 20GB disk space available. Model downloads may fail."
    fi
    
    echo "✅ System requirements check completed"
}

# Create necessary directories
setup_directories() {
    echo "📁 Creating directory structure..."
    
    mkdir -p models/ollama
    mkdir -p models/huggingface
    mkdir -p cache/ai
    mkdir -p logs/ai
    mkdir -p config
    
    echo "✅ Directories created"
}

# Setup environment variables
setup_environment() {
    echo "🔧 Setting up environment..."
    
    # Create .env file if it doesn't exist
    if [ ! -f .env ]; then
        cat > .env << EOF
# AI Configuration
OLLAMA_HOST=0.0.0.0
OLLAMA_PORT=11434
HF_TRANSFORMERS_PORT=8080
AI_MANAGER_PORT=3005

# API Keys (optional - for cloud fallback)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Resource Limits
OLLAMA_MAX_MEMORY=8G
HF_MAX_MEMORY=4G
AI_CACHE_SIZE=1G

# Performance Settings
OLLAMA_NUM_PARALLEL=4
OLLAMA_MAX_LOADED_MODELS=3
HF_MAX_WORKERS=4

# Security
AI_API_KEY_REQUIRED=false
AI_RATE_LIMIT=100

# Monitoring
METRICS_ENABLED=true
LOGGING_LEVEL=info
EOF
        echo "📄 Created .env file. Please edit it with your API keys if needed."
    fi
    
    echo "✅ Environment setup completed"
}

# Build custom Docker images
build_images() {
    echo "🔨 Building custom Docker images..."
    
    # Create Hugging Face Dockerfile
    mkdir -p docker/huggingface
    cat > docker/huggingface/Dockerfile << 'EOF'
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

EXPOSE 8080

CMD ["python", "server.py"]
EOF

    # Create Hugging Face requirements
    cat > docker/huggingface/requirements.txt << 'EOF'
transformers[torch]==4.36.0
torch>=2.0.0
fastapi==0.104.1
uvicorn[standard]==0.24.0
numpy>=1.24.0
tokenizers>=0.15.0
accelerate>=0.20.0
sentencepiece>=0.1.99
protobuf>=3.20.0
requests>=2.31.0
psutil>=5.9.0
EOF

    # Create Hugging Face server
    cat > docker/huggingface/server.py << 'EOF'
import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import pipeline, AutoTokenizer, AutoModel
import torch
import logging
import psutil
from typing import List, Dict, Any
import time

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Hugging Face Transformers Server", version="1.0.0")

# Model cache
model_cache = {}
pipeline_cache = {}

class TextRequest(BaseModel):
    text: str
    model: str = "Xenova/distilbert-base-uncased-finetuned-sst-2-english"
    task: str = "sentiment-analysis"

class EmbeddingRequest(BaseModel):
    text: str
    model: str = "sentence-transformers/all-MiniLM-L6-v2"

class BatchRequest(BaseModel):
    texts: List[str]
    model: str
    task: str

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    memory = psutil.virtual_memory()
    return {
        "status": "healthy",
        "memory_usage": f"{memory.percent}%",
        "available_memory": f"{memory.available / 1024 / 1024 / 1024:.1f}GB",
        "loaded_models": len(model_cache),
        "loaded_pipelines": len(pipeline_cache)
    }

@app.get("/models")
async def list_models():
    """List available models"""
    return {
        "loaded_models": list(model_cache.keys()),
        "loaded_pipelines": list(pipeline_cache.keys()),
        "recommended_models": [
            "Xenova/distilbert-base-uncased-finetuned-sst-2-english",
            "sentence-transformers/all-MiniLM-L6-v2",
            "microsoft/DialoGPT-medium"
        ]
    }

@app.post("/classify")
async def classify_text(request: TextRequest):
    """Text classification endpoint"""
    try:
        start_time = time.time()
        
        # Get or create pipeline
        pipeline_key = f"{request.task}_{request.model}"
        if pipeline_key not in pipeline_cache:
            logger.info(f"Loading pipeline: {pipeline_key}")
            pipeline_cache[pipeline_key] = pipeline(
                request.task,
                model=request.model,
                return_all_scores=True
            )
        
        # Run inference
        result = pipeline_cache[pipeline_key](request.text)
        processing_time = time.time() - start_time
        
        return {
            "result": result,
            "model_used": request.model,
            "processing_time": processing_time,
            "task": request.task
        }
    except Exception as e:
        logger.error(f"Classification error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/embed")
async def generate_embedding(request: EmbeddingRequest):
    """Text embedding endpoint"""
    try:
        start_time = time.time()
        
        # Get or create model
        if request.model not in model_cache:
            logger.info(f"Loading model: {request.model}")
            model_cache[request.model] = {
                "model": AutoModel.from_pretrained(request.model),
                "tokenizer": AutoTokenizer.from_pretrained(request.model)
            }
        
        model_data = model_cache[request.model]
        
        # Tokenize and encode
        inputs = model_data["tokenizer"](
            request.text, 
            return_tensors="pt", 
            truncation=True, 
            max_length=512,
            padding=True
        )
        
        # Generate embeddings
        with torch.no_grad():
            outputs = model_data["model"](**inputs)
            embeddings = outputs.last_hidden_state.mean(dim=1)
        
        processing_time = time.time() - start_time
        
        return {
            "embedding": embeddings[0].tolist(),
            "model_used": request.model,
            "processing_time": processing_time,
            "dimensions": len(embeddings[0])
        }
    except Exception as e:
        logger.error(f"Embedding error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/batch")
async def batch_process(request: BatchRequest):
    """Batch processing endpoint"""
    try:
        start_time = time.time()
        results = []
        
        # Get or create pipeline
        pipeline_key = f"{request.task}_{request.model}"
        if pipeline_key not in pipeline_cache:
            pipeline_cache[pipeline_key] = pipeline(request.task, model=request.model)
        
        # Process in batches
        batch_size = 10
        for i in range(0, len(request.texts), batch_size):
            batch = request.texts[i:i + batch_size]
            batch_results = pipeline_cache[pipeline_key](batch)
            results.extend(batch_results)
        
        processing_time = time.time() - start_time
        
        return {
            "results": results,
            "model_used": request.model,
            "processing_time": processing_time,
            "batch_size": len(request.texts)
        }
    except Exception as e:
        logger.error(f"Batch processing error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
EOF

    echo "🔨 Building Hugging Face image..."
    docker build -t notescape/hf-transformers:latest docker/huggingface/
    
    echo "✅ Custom images built successfully"
}

# Start AI infrastructure
start_infrastructure() {
    echo "🚀 Starting AI infrastructure..."
    
    # Start with GPU support if available
    if command -v nvidia-smi &> /dev/null; then
        echo "🎮 NVIDIA GPU detected, starting with GPU support..."
        docker-compose -f docker-compose.ai.yml --profile gpu up -d
    else
        echo "💻 Starting with CPU-only support..."
        docker-compose -f docker-compose.ai.yml up -d
    fi
    
    echo "⏳ Waiting for services to start..."
    sleep 30
    
    # Health check
    health_check
}

# Health check function
health_check() {
    echo "🔍 Running health checks..."
    
    # Check Ollama
    if curl -s http://localhost:11434/api/version > /dev/null; then
        echo "✅ Ollama is running"
    else
        echo "❌ Ollama is not responding"
    fi
    
    # Check Hugging Face
    if curl -s http://localhost:8080/health > /dev/null; then
        echo "✅ Hugging Face server is running"
    else
        echo "❌ Hugging Face server is not responding"
    fi
    
    # Check AI Manager (if built)
    if curl -s http://localhost:3005/health > /dev/null; then
        echo "✅ AI Manager is running"
    else
        echo "⚠️  AI Manager may still be starting up"
    fi
}

# Download initial models
download_models() {
    echo "📦 Downloading initial AI models..."
    
    # Download Ollama models
    echo "📥 Downloading Ollama models (this may take a while)..."
    docker exec notescape-ollama ollama pull llama3.2:1b
    docker exec notescape-ollama ollama pull llama3.2:3b
    docker exec notescape-ollama ollama pull nomic-embed-text
    
    echo "✅ Model downloads completed"
}

# Test AI functionality
test_ai() {
    echo "🧪 Testing AI functionality..."
    
    # Test Ollama
    echo "Testing Ollama..."
    curl -X POST http://localhost:11434/api/generate \
        -H "Content-Type: application/json" \
        -d '{
            "model": "llama3.2:1b",
            "prompt": "Hello, how are you?",
            "stream": false
        }' | jq .response || echo "Ollama test failed"
    
    # Test Hugging Face
    echo "Testing Hugging Face..."
    curl -X POST http://localhost:8080/classify \
        -H "Content-Type: application/json" \
        -d '{
            "text": "I love this product!",
            "task": "sentiment-analysis"
        }' | jq .result || echo "Hugging Face test failed"
    
    echo "✅ AI functionality tests completed"
}

# Show usage information
show_usage() {
    echo "
🎉 NoteSpace Hybrid AI Infrastructure Setup Complete!

📊 Service URLs:
  - Ollama API: http://localhost:11434
  - Hugging Face API: http://localhost:8080  
  - AI Manager: http://localhost:3005 (if enabled)
  - Redis Cache: localhost:6380

🔧 Management Commands:
  - View logs: docker-compose -f docker-compose.ai.yml logs -f
  - Stop services: docker-compose -f docker-compose.ai.yml down
  - Restart services: docker-compose -f docker-compose.ai.yml restart
  - Update models: ./scripts/update-models.sh

📈 Monitoring:
  - System metrics: http://localhost:9100/metrics
  - GPU metrics: http://localhost:9445/metrics (if GPU enabled)

🔍 Health Checks:
  - Ollama: curl http://localhost:11434/api/version
  - HF Server: curl http://localhost:8080/health

⚡ Quick Test:
  curl -X POST http://localhost:11434/api/generate \\
    -H 'Content-Type: application/json' \\
    -d '{\"model\":\"llama3.2:1b\",\"prompt\":\"Hello!\",\"stream\":false}'

For detailed configuration, edit config/ai-config.json
"
}

# Main execution
main() {
    case "${1:-setup}" in
        setup)
            check_requirements
            setup_directories
            setup_environment
            build_images
            start_infrastructure
            download_models
            test_ai
            show_usage
            ;;
        health)
            health_check
            ;;
        test)
            test_ai
            ;;
        stop)
            echo "🛑 Stopping AI infrastructure..."
            docker-compose -f docker-compose.ai.yml down
            ;;
        restart)
            echo "🔄 Restarting AI infrastructure..."
            docker-compose -f docker-compose.ai.yml restart
            ;;
        *)
            echo "Usage: $0 {setup|health|test|stop|restart}"
            exit 1
            ;;
    esac
}

main "$@"