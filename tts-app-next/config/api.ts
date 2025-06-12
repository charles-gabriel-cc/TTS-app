// Lembrar de setar o ip+porta do backend no .env
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || `http://localhost:8000`;

export const API_ENDPOINTS = {
  speechToText: `${API_BASE_URL}/transcribe/`,
  chat: `${API_BASE_URL}/chat/`,
  chatWithTTS: `${API_BASE_URL}/chat_with_tts/`
}