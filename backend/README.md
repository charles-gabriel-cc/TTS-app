# 🐍 Backend TTS-APP - Guia de Desenvolvimento

<div align="center">

![Python](https://img.shields.io/badge/Python-3.10.11-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-latest-green.svg)
![Ollama](https://img.shields.io/badge/Ollama-Local_LLM-orange.svg)
![Qdrant](https://img.shields.io/badge/Qdrant-Vector_DB-red.svg)

**Backend do Assistente Virtual CCEN - Ambiente de Desenvolvimento**

</div>

## 🏗️ Arquitetura do Backend

Sistema simples com 3 componentes principais:

```
💻 FastAPI (server.py)
   ├── 🎤 Whisper STT
   ├── 🔊 Google TTS  
   └── 💬 Chat com IA
        ├── 🦙 Ollama (LLM)
        ├── 📊 Qdrant (Busca)
        └── 📚 Base CCEN
```

**Como funciona:**
1. **FastAPI** - API principal que recebe requisições
2. **Ollama** - Modelo de IA local para conversas
3. **Qdrant** - Banco vetorial com dados dos professores

## 📁 Estrutura de Arquivos

```
backend/
├── 🚀 Scripts de Inicialização
│   ├── AssistenteVirtualCCEN.bat     # Script principal (produção)
│   ├── start_backend.bat/sh          # Desenvolvimento automático
│   ├── start_backend_interactive.*   # Desenvolvimento interativo
│   └── start_backend_universal.bat   # Windows com detecção Docker
│
├── 🐳 Docker
│   ├── docker-compose.yml            # Produção
│   ├── docker-compose.dev.yml        # Desenvolvimento
│   ├── Dockerfile.dev                # Imagem desenvolvimento
│   └── .dockerignore
│
├── ⚙️ Configuração
│   ├── config.py                     # Configurações centralizadas
│   ├── requirements.txt              # Dependências Python
│   
│
├── 🔧 Serviços
│   ├── services/
│   │   ├── chat_service.py           # Serviço principal de chat
│   │   ├── transcription_service.py  # Whisper STT
│   │   └── embeddings.py             # Processamento embeddings
│   │
│   ├── utils/
│   │   └── logger.py                 # Sistema de logs
│   │
│   ├── server.py                     # Servidor FastAPI principal
│   ├── app.py                        # Interface Gradio alternativa
│   └── embeddings.py                 # Script processamento docs
```

## 🚀 Início Rápido

### 1️⃣ **Inicialização Automática (Recomendado)**

```batch
# Windows - Execução simples
.\AssistenteVirtualCCEN.bat

# Ou para desenvolvimento
.\start_backend.bat
```

### 2️⃣ **Inicialização Manual**

```bash
# 1. Subir containers Docker
docker-compose -f docker-compose.dev.yml up -d

# 2. Entrar no container backend
docker exec -it tts-app-backend-dev bash

# 3. Executar servidor
python server.py
```

### 3️⃣ **Verificar Serviços**

```bash
# Backend API
curl http://localhost:8000/health

# Ollama LLM
curl http://localhost:11434/api/tags

# Qdrant Vector DB
curl http://localhost:6333/health
```

## ⚙️ Configuração do Ambiente

### 📝 **Arquivo .env**

Crie o arquivo `.env` na pasta `backend/`:

```bash
# === CONFIGURAÇÕES DE IA ===
MODEL_NAME="qwen3:4b"              # Modelo Ollama
EMBED_MODEL="all-minilm:l6-v2"       # Modelo embeddings

# === QDRANT (BANCO VETORIAL) ===
QDRANT_URL="http://qdrant:6333"      # URL Qdrant
COLLECTION_NAME="ccen-docentes"      # Nome da coleção

# === OLLAMA (LLM LOCAL) ===
OLLAMA_BASE_URL="http://ollama:11434"

# === MONITORAMENTO (OPCIONAL) ===
LANGSMITH_TRACING="true"
LANGSMITH_ENDPOINT="https://api.smith.langchain.com"
LANGSMITH_PROJECT="backend"
LANGSMITH_API_KEY="sua-chave-aqui"   # Opcional

# === DESENVOLVIMENTO ===
SERVER_HOST="0.0.0.0"
SERVER_PORT="8000"
USE_LOCAL_MODEL="true"
USE_LOCAL_COLLECTION="true"
```

### 📚 **Baixar Modelos IA**

```bash
# Conectar ao container Ollama
docker exec -it tts-ollama-dev bash

# Baixar modelo principal (escolha um)
ollama pull qwen3:4b         # Mais leve (4B parâmetros)
ollama pull phi4:latest      # Equilibrado (7B parâmetros)
ollama pull llama3.2:latest  # Alternativo

# Baixar modelo embeddings
ollama pull all-minilm:l6-v2

# Verificar modelos instalados
ollama list
```

## 🔧 Scripts Disponíveis

### 🎯 **Para Produção/Demo**
- `AssistenteVirtualCCEN.bat` - Inicia ambiente completo automaticamente

### 🛠️ **Para Desenvolvimento**
- `start_backend.bat/.sh` - Desenvolvimento automático
- `start_backend_interactive.bat/.sh` - Desenvolvimento interativo (permite debug)
- `start_backend_universal.bat` - Windows com detecção automática Docker

### 📋 **O que fazem os Scripts**

1. **Verificam** se Docker Desktop está rodando
2. **Param** containers anteriores (se houver)
3. **Sobem** todos os containers necessários
4. **Aguardam** inicialização completa
5. **Executam** o servidor Python
6. **Mostram** logs em tempo real

## 🤖 Serviços Principais

### 💬 **ChatService** (`services/chat_service.py`)

Serviço principal responsável pela inteligência conversacional:

```python
# Funcionalidades principais:
- 🧠 Integração com Ollama (LLM local)
- 🔍 Busca semântica no Qdrant
- 📚 RAG (Retrieval-Augmented Generation)
- 🎯 Ferramentas especializadas:
  • SearchQdrant - Busca geral
  • SearchTeacherInformation - Info específica de professores
  • getTeacherNames - Lista de professores
  • SearchArticle - Busca em artigos científicos
```

### 🎤 **TranscriptionService** (`services/transcription_service.py`)

Converte áudio em texto usando Whisper:

```python
# Funcionalidades:
- 🎵 Suporte múltiplos formatos (wav, mp3, m4a, etc.)
- 🌍 Detecção automática de idioma
- 🚀 Cache inteligente para otimização
- 🔧 Modelos configuráveis (tiny → large)
```

### 📊 **EmbeddingsService** (`services/embeddings.py`)

Processa documentos para busca vetorial:

```python
# Funcionalidades:
- 📄 Processamento PDFs
- ✂️ Divisão semântica de textos
- 🔢 Geração de embeddings
- 📚 Criação de coleções Qdrant
- 🏷️ Indexação com metadados
```

## 📚 Base de Conhecimento

### 🏫 **Coleção CCEN-Docentes**

Contém informações dos professores do CCEN/UFPE:

```bash
# Estrutura da coleção:
- 👨‍🏫 nome_professor
- 🏢 departamento  
- 🆔 id_lattes
- 📄 tipo_de_documento
- 📝 text (conteúdo)
```

### 📖 **Processamento de Novos Documentos**

```bash
# 1. Colocar PDFs na pasta ccen-docentes/
mkdir ccen-docentes
cp seus-pdfs.pdf ccen-docentes/

# 2. Executar processamento
docker exec -it tts-app-backend-dev python embeddings.py

# 3. Verificar coleção criada
curl http://localhost:6333/collections/ccen-docentes
```

## 🌐 API Endpoints

### 🔍 **Endpoints Reais**

```http
### Saúde do Sistema
GET  /health                           # Status do backend

### Chat e IA
POST /chat/                           # Conversa básica com IA
POST /chat_with_tts/                  # Conversa com síntese de voz

### Áudio
POST /transcribe/                     # Speech-to-Text (Whisper)

### Cache e Recuperação
GET  /pending_responses/{session_id}  # Respostas pendentes
```

### 📝 **Modelos de Requisição**

```python
# Modelo para chat
class ChatRequest(BaseModel):
    message: str
    session_id: str
```

### 📝 **Exemplos de Uso**

```bash
# 1. Health Check
curl http://localhost:8000/health

# 2. Chat básico
curl -X POST http://localhost:8000/chat/ \
  -H "Content-Type: application/json" \
  -d '{"message": "Quem é o professor João Silva?", "session_id": "user123"}'

# 3. Chat com TTS (retorna texto + áudio)
curl -X POST http://localhost:8000/chat_with_tts/ \
  -H "Content-Type: application/json" \
  -d '{"message": "Me fale sobre o CCEN", "session_id": "user123"}'

# 4. Transcrição de áudio
curl -X POST http://localhost:8000/transcribe/ \
  -F "file=@audio.wav"

# 5. Recuperar respostas pendentes
curl http://localhost:8000/pending_responses/user123
```

### 📋 **Respostas da API**

```json
// GET /health
{
  "status": "healthy",
  "message": "Servidor está funcionando normalmente",
  "services": {
    "transcription": "ok",
    "chat": "ok", 
    "tts": "ok"
  }
}

// POST /chat/
{
  "response": "O professor João Silva é..."
}

// POST /chat_with_tts/
{
  "text": "O CCEN é o Centro de...",
  "audio": "base64_encoded_audio_data",
  "audio_format": "mp3"
}

// POST /transcribe/
{
  "text": "Texto transcrito do áudio"
}
```

## 🐛 Debug e Desenvolvimento

### 📊 **Logs do Sistema**

```bash
# Logs do backend
docker-compose -f docker-compose.dev.yml logs -f tts-app

# Logs do Ollama
docker-compose -f docker-compose.dev.yml logs -f ollama

# Logs do Qdrant
docker-compose -f docker-compose.dev.yml logs -f qdrant

# Logs internos da aplicação
tail -f logs/app.log
```

## 🔧 Configurações Avançadas

### 🎛️ **Parâmetros do Modelo**

```python
# Em config.py
WHISPER_MODEL = "medium"        # tiny, small, medium, large
MODEL_NAME = "qwen3:4b"       # Modelo Ollama
EMBED_MODEL = "all-minilm:l6-v2" # Modelo embeddings
```

### 🌐 **Configurações de Rede**

```yaml
# docker-compose.dev.yml
ports:
  - "8000:8000"    # FastAPI
  - "11434:11434"  # Ollama
  - "6333:6333"    # Qdrant HTTP
  - "6334:6334"    # Qdrant gRPC
```

### 📁 **Volumes de Dados**

```yaml
volumes:
  - ./logs:/app/logs                    # Logs persistentes
  - ./uploads:/app/uploads              # Uploads persistentes  
  - ./ccen-docentes:/app/ccen-docentes  # Base de conhecimento
  - ollama_data:/root/.ollama           # Modelos Ollama
  - qdrant_data:/qdrant/storage         # Dados Qdrant
```

### 🧪 **Testando Mudanças**

```bash
# Restart rápido após mudanças
docker-compose restart tts-app

# Rebuild completo se necessário
docker-compose -f docker-compose.dev.yml up --build

# Teste de integração
curl -X POST http://localhost:8000/chat/ \
  -H "Content-Type: application/json" \
  -d '{"message": "teste", "session_id": "test123"}'
```