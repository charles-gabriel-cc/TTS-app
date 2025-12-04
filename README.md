# Assistente Virtual CCEN - TTS App

<div align="center">

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/Python-3.10.11-blue.svg)
![React](https://img.shields.io/badge/React-18.2.0-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-latest-green.svg)
![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)

**Assistente Virtual Inteligente para o Centro de Ciências Exatas e da Natureza (CCEN) da UFPE**

Um sistema completo de conversação por voz e texto com IA, desenvolvido especificamente para responder dúvidas sobre professores, departamentos e informações acadêmicas do CCEN.

</div>

## 🌟 Principais Funcionalidades

### 🎯 **Sistema de IA Conversacional**
- **Chat inteligente** orquestrado via **n8n** usando modelos de linguagem (Google Gemini)
- **RAG (Retrieval-Augmented Generation)** com base de conhecimento específica do CCEN
- **Busca vetorial** avançada com **Qdrant** para respostas precisas

### 🎤 **Speech-to-Text (STT)**
- Transcrição de áudio em tempo real com **OpenAI Whisper**
- Interface de gravação moderna e intuitiva

### 🔊 **Text-to-Speech (TTS)**
- Síntese de voz natural com **Google TTS (gTTS)**
- Reprodução automática de respostas
- Controle de ativação/desativação por usuário

### 📱 **Interface Multiplataforma**
- **Web App** (Next.js + Tailwind CSS)
- **App Android** nativo com Capacitor
- **PWA** (Progressive Web App) para instalação offline
- **Modo Kiosk** para uso em totems e dispositivos dedicados

## 🏗️ Arquitetura do Sistema

```mermaid
graph TB
    A[Usuario] --> B[Frontend Next.js]
    B --> C[API FastAPI]
    C --> D[Whisper STT]
    C --> E[n8n Orquestracao IA]
    E --> F[Google Gemini LLM]
    E --> G[Qdrant Vector DB]
    C --> H[Google TTS]
    I[Docker Compose] --> J[Qdrant Container]
    I --> K[Backend Container]
    G --> L[Base CCEN]
```

## 🚀 Instalação e Configuração

### 📋 Pré-requisitos

#### **Hardware Recomendado**
- **RAM**: 16GB+ (32GB recomendado para modelos grandes)
- **GPU**: NVIDIA com CUDA 11.8+ (opcional, mas recomendado)

#### **Software Base**
```bash
# Node.js e npm
node --version  # v18.0.0+
npm --version   # v8.0.0+

# Python
python --version  # 3.10.11

# Docker Desktop
```

### 🔧 Dependências Específicas

#### **Windows**
```powershell
# Chocolatey
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# FFmpeg para processamento de áudio
choco install ffmpeg

# Visual C++ Build Tools
Download: https://visualstudio.microsoft.com/pt-br/visual-cpp-build-tools/

# CUDA Toolkit (para GPU)
Download: https://developer.nvidia.com/cuda-11-8-0-download-archive
```

### 📥 Clonagem e Setup Inicial

```bash
# 1. Clonar repositório
git clone https://github.com/seu-usuario/TTS-app.git
```
Configurar arquivo .env em backend

### 🔐 Configuração de Variáveis de Ambiente

Exemplo de como criar o arquivo `.env` no diretório `backend/`:

```bash
# === MONITORAMENTO (OPCIONAL) ===
LANGSMITH_TRACING=
LANGSMITH_ENDPOINT=
LANGSMITH_PROJECT=
LANGSMITH_API_KEY=

# === MODELOS (CONFORME CONFIGURAÇÃO DO n8n) ===
MODEL_NAME=
EMBED_MODEL=
```

Exemplo de `.env.local` no diretório `tts-app-next/` (frontend):

```bash
# URL da API do backend (FastAPI)
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### ⚙️ Configuração do n8n (OBRIGATÓRIA)

Para que o chat com IA funcione, é obrigatório configurar o fluxo no **n8n**:

1. Suba o servidor n8n (docker, desktop ou servidor próprio).
2. Acesse o n8n pelo navegador (ex.: `http://localhost:5678`).
3. Importe o workflow `backend/n8n backend.json`.
4. No n8n, configure as credenciais necessárias:
   - Acesso ao **Google Gemini** (nós `Google Gemini Chat Model` e `Embeddings Google Gemini`).
   - Acesso ao **Qdrant** (credenciais `QdrantApi account`).
5. Abra o nó `Webhook` e verifique o **endpoint HTTP POST** gerado.
6. Ative o workflow (botão **Activate** no topo da tela).

O backend FastAPI consome esse webhook, enviando dados como mensagem do usuário, `session_id`, contexto de chat e, quando necessário, o nome do professor/artigo.

### 🧾 Geração do `information.json` via n8n

O fluxo `n8n backend` também é responsável por gerar o arquivo `backend/information.json` no formato esperado pela aplicação:

- Consolida informações de artigos e currículos (título, departamento, palavras‑chave, ano, etc.).
- Organiza os dados em uma estrutura única (`allData`) consumida pelo backend/frontend.
- Esse arquivo é utilizado para montar **cards** de artigos/professores na interface.

Quando houver atualização na base (novos PDFs ou mudanças em Qdrant), execute novamente o fluxo no n8n para regenerar o `information.json`.

### Processamento de documentos

- Criar pasta com nome da variavel COLLECTION_NAME contendo os arquivos a serem processados
- Ver backend/services/embeddings.py

### 🐋 Inicialização do servidor

Executar o arquivo AssistenteVirtualCCEN.bat

## 📱 Build do App Android

### 🔧 Pré-requisitos Android

```bash
# 1. Java JDK 21

# 2. Android Studio

# 3. Configurar variáveis de ambiente
$env:JAVA_HOME="C:\Program Files\Java\jdk-21"  # Windows
```

### 📦 Build APK

```bash
cd tts-app-next

npm run cap:build

cd android
./gradlew.bat assembleDebug  # Windows
```

O APK será gerado em: `android/app/build/outputs/apk/debug/`

## 🎮 Como Usar

### 📱 **App Android**
1. Instale o APK gerado
2. Configure permissões de **microfone** e **armazenamento**

## 🤝 Contribuição

Contribuições são muito bem-vindas! Por favor:

1. **Fork** o repositório
2. Crie uma **branch** para sua feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. **Push** para a branch (`git push origin feature/AmazingFeature`)
5. Abra um **Pull Request**

## 📄 Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🏫 Sobre o CCEN/UFPE

Este assistente foi desenvolvido especificamente para o **Centro de Ciências Exatas e da Natureza (CCEN)** da **Universidade Federal de Pernambuco (UFPE)**, visando facilitar o acesso a informações sobre professores, departamentos e recursos acadêmicos.

---

<div align="center">

**Desenvolvido com ❤️ para a comunidade acadêmica do CCEN/UFPE**

[🌐 UFPE](https://www.ufpe.br) • [🏫 CCEN](https://www.ufpe.br/ccen)

</div>