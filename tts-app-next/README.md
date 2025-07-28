# 🚀 Guia de Desenvolvimento - Frontend

Este guia explica como configurar e usar o modo de desenvolvimento para o frontend da aplicação TTS-App.

## 📋 Pré-requisitos

- **Node.js** v18 ou superior
- **npm**
- **Backend** rodando (veja configuração abaixo)

## 🛠️ Configuração Inicial

### 1. Instalação das Dependências

```bash
cd tts-app-next
npm install
```

### 2. Configuração de Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto frontend:

```env
# URL da API do backend
NEXT_PUBLIC_API_URL=http://endereço_local_do_backend:8000
```

## 🏃‍♂️ Scripts de Desenvolvimento Disponíveis

### Desenvolvimento Webs

```bash
# Modo de desenvolvimento HTTP padrão
npm run dev

```

### Build e Produção

```bash
# Build da aplicação
npm run build

# Executar versão de produção
npm run start

# Build + Start (produção completa)
npm run prod
```

### Desenvolvimento Mobile (Capacitor)

```bash
# Inicializar Capacitor Android
npm run cap:init

# Build e sincronizar com Android
npm run cap:build

# Abrir projeto Android no Android Studio
npm run cap:open

# Executar no dispositivo Android
npm run cap:run

# Desenvolvimento com live reload no Android
npm run cap:dev
```

## 🌐 Modos de Desenvolvimento

### 1. Desenvolvimento

```bash
npm run dev
```

- **URL**: `http://localhost:3000`
- **Rede**: `http://0.0.0.0:3000` (acessível na rede local)
- **Ideal para**: Desenvolvimento geral, testes locais

## 🔧 Configuração do Backend

Para o frontend funcionar corretamente, o backend deve estar rodando:

```bash
# No diretório backend/
cd ../backend
python app.py
```

**URLs do Backend:**
- Local: `http://localhost:8000`
- Rede: `http://SEU_IP:8000`

## 📱 Desenvolvimento Mobile

### Configuração do Android

1. **Instalar dependências**:
```bash
npm run cap:init
```

2. **Build e sincronizar**:
```bash
npm run cap:build
```

3. **Abrir no Android Studio**:
```bash
npm run cap:open
```

### Live Reload no Dispositivo

```bash
# Desenvolvimento com live reload
npm run cap:dev
```

**Configuração necessária:**
- Dispositivo e computador na mesma rede WiFi
- Configurar IP correto no `.env.local`

## 🔍 Estrutura do Projeto

```
tts-app-next/
├── app/                    # Páginas Next.js (App Router)
├── components/             # Componentes React
│   ├── AudioRecorder.tsx   # Gravação de áudio
│   ├── ChatInterface.tsx   # Interface de chat simples
│   └── ModernChatInterface.tsx # Interface moderna
├── config/                 # Configurações
│   └── api.ts             # URLs e timeouts da API
├── services/              # Serviços
│   ├── api.ts            # Cliente da API
│   └── connectivity.ts   # Gerenciamento de conectividade
├── lib/                   # Utilitários
├── public/               # Arquivos estáticos
└── android/              # Projeto Capacitor Android
```

## ⚙️ Configurações de Timeout

As configurações de timeout estão em `config/api.ts`:

```typescript
export const TIMEOUT_CONFIG = {
  SERVER_HEALTH_CHECK: 5,      // Verificação de saúde (5s)
  CHAT_REQUEST: 120,           // Requisições de chat (120s)
  TRANSCRIPTION_REQUEST: 60,   // Transcrição de áudio (60s)
  SERVER_CHECK_INTERVAL: 10,   // Intervalo de verificação (10s)
  RETRY: {
    INITIAL_DELAY: 1,          // Delay inicial (1s)
    MAX_DELAY: 60,             // Delay máximo (60s)
    MAX_RETRIES: 10            // Máximo de tentativas
  }
}
```