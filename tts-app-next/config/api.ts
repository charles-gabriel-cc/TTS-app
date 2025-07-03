// A URL da API é definida pela variável de ambiente NEXT_PUBLIC_API_URL
// Configure no arquivo .env: NEXT_PUBLIC_API_URL='http://SEU_IP:8000'
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const API_ENDPOINTS = {
  speechToText: `${API_BASE_URL}/transcribe/`,
  chat: `${API_BASE_URL}/chat/`,
  chatWithTTS: `${API_BASE_URL}/chat_with_tts/`
}

// ⚙️ CONFIGURAÇÕES DE TIMEOUT - AJUSTE AQUI
export const TIMEOUT_CONFIG = {
  // Timeout para verificação de saúde do servidor (em segundos)
  SERVER_HEALTH_CHECK: 5,
  
  // Timeout para requisições de chat (em segundos)
  CHAT_REQUEST: 120,
  
  // Timeout para requisições de transcrição de áudio (em segundos)
  TRANSCRIPTION_REQUEST: 60,
  
  // Intervalo entre verificações do servidor (em segundos)
  SERVER_CHECK_INTERVAL: 10,
  
  // Configurações de retry
  RETRY: {
    // Delay inicial entre tentativas (em segundos)
    INITIAL_DELAY: 1,
    
    // Delay máximo entre tentativas (em segundos)
    MAX_DELAY: 60,
    
    // Número máximo de tentativas
    MAX_RETRIES: 10
  }
}