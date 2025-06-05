export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || `http://localhost:8000`;

export const API_ENDPOINTS = {
  speechToText: `${API_BASE_URL}/transcribe/`,
  chat: `${API_BASE_URL}/chat/`
}