// A URL da API é definida pela variável de ambiente NEXT_PUBLIC_API_URL
// Configure no arquivo .env: NEXT_PUBLIC_API_URL='http://SEU_IP:8000'
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const API_ENDPOINTS = {
  speechToText: `${API_BASE_URL}/transcribe/`,
  chat: `${API_BASE_URL}/chat/`,
  chatWithTTS: `${API_BASE_URL}/chat_with_tts/`
}