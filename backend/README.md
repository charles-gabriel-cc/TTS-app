# 🐍 Backend TTS-APP - Guia de Desenvolvimento

<div align="center">

![Python](https://img.shields.io/badge/Python-3.10.11-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-latest-green.svg)
![n8n](https://img.shields.io/badge/n8n-Orchestration-purple.svg)
![Google Gemini](https://img.shields.io/badge/LLM-Gemini-blue.svg)
![Qdrant](https://img.shields.io/badge/Qdrant-Vector_DB-red.svg)

**Backend do Assistente Virtual CCEN - Ambiente de Desenvolvimento**

</div>

## 🏗️ Arquitetura do Backend

Sistema simples com 4 componentes principais:

```
💻 FastAPI (server.py)
   ├── 🎤 Whisper STT
   ├── 🔊 Google TTS  
   └── 💬 Chat com IA
        ├── ⚙️ n8n (Orquestração + LLM Google Gemini)
        ├── 📊 Qdrant (Busca vetorial)
        └── 📚 Base CCEN (currículos e artigos)
```

**Como funciona:**
1. **FastAPI** - API principal que recebe requisições do frontend e cuida de STT/TTS.
2. **n8n** - Orquestra o fluxo de conversação com IA, chamando o modelo Google Gemini e realizando buscas em Qdrant.
3. **Qdrant** - Banco vetorial com dados de professores e artigos do CCEN.
4. **Base CCEN** - PDFs e coleções vetoriais que alimentam as respostas.

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
# Qdrant Vector DB
curl http://localhost:6333/health
```

## ⚙️ Configuração do Ambiente

### 📝 **Arquivo .env**

Crie o arquivo `.env` na pasta `backend/`:

```bash
# === MONITORAMENTO (OPCIONAL) ===
LANGSMITH_TRACING=
LANGSMITH_ENDPOINT=
LANGSMITH_PROJECT=
LANGSMITH_API_KEY=

# === QDRANT (BANCO VETORIAL) ===
QDRANT_URL="http://qdrant:6333"      # URL Qdrant
COLLECTION_NAME="ccen-docentes"      # Nome da coleção

# === MODELOS (CONFORME CONFIGURAÇÃO DO n8n) ===
MODEL_NAME=
EMBED_MODEL=

# === DESENVOLVIMENTO ===
SERVER_HOST="0.0.0.0"
SERVER_PORT="8000"
```

### 🤝 Integração com n8n (OBRIGATÓRIA)

O backend utiliza um fluxo no **n8n** para toda a lógica de IA (chat, RAG, busca em currículos e artigos):

1. Suba o servidor n8n e acesse-o pelo navegador.
2. Importe o workflow `backend/n8n backend.json`.
3. Configure as credenciais necessárias nos nós:
   - **Google Gemini** para LLM e embeddings.
   - **QdrantApi** para acesso às coleções vetoriais (`ccen-docentes`, `ccen-artigos`).
4. Verifique o nó `Webhook` e copie o endpoint HTTP gerado.
5. Ative o fluxo (botão **Activate**).

O serviço de chat do backend envia para esse webhook campos como `message`, `session_id`, `context` e, quando aplicável, `professor_name`. O fluxo no n8n:

- Decide se a pergunta é geral ou sobre um artigo específico.
- Usa Qdrant para recuperar trechos relevantes de currículos e artigos.
- Usa Google Gemini para sintetizar a resposta em português.

### 🧾 Geração do `information.json`

O workflow `n8n backend` também é utilizado para gerar o arquivo `information.json` no formato consumido pela aplicação:

- Lê os dados vetoriais (por exemplo, da coleção `ccen-artigos`).
- Monta uma lista `allData` com `filename`, `title`, `departamento`, `keywords`, `ano`, etc.
- Salva ou retorna o JSON para ser gravado em `backend/information.json`.

Sempre que atualizar a base de PDFs ou coleções no Qdrant, execute novamente o fluxo no n8n para atualizar o `information.json` e, assim, os cards exibidos na interface.

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
- 🧠 Integração com fluxo n8n (Google Gemini + Qdrant)
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
MODEL_NAME = ""               # Nome do modelo de linguagem (se usado para telemetria)
EMBED_MODEL = ""              # Nome do modelo de embeddings (coerente com o n8n)
```

### 🌐 **Configurações de Rede**

```yaml
# docker-compose.dev.yml
ports:
  - "8000:8000"    # FastAPI
  - "6333:6333"    # Qdrant HTTP
  - "6334:6334"    # Qdrant gRPC
```

### 📁 **Volumes de Dados**

```yaml
volumes:
  - ./logs:/app/logs                    # Logs persistentes
  - ./uploads:/app/uploads              # Uploads persistentes  
  - ./ccen-docentes:/app/ccen-docentes  # Base de conhecimento
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