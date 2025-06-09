import { API_ENDPOINTS } from '@/config/api'
import { v4 as uuidv4 } from 'uuid'

interface ChatMessage {
  id: string
  text: string
  sender: 'user' | 'assistant'
  timestamp: Date
  audio?: string // Base64 audio data
  audioFormat?: string // 'mp3' | 'wav'
}

// Função para gerar um session_id único
const generateSessionId = () => {
  return uuidv4()
}

// Armazenar o session_id
let sessionId = generateSessionId()

export const api = {
  // Função para resetar o session_id se necessário
  resetSession: () => {
    sessionId = generateSessionId()
  },

  async speechToText(audioBlob: Blob): Promise<string> {
    const formData = new FormData()
    formData.append('audio', audioBlob)
    formData.append('session_id', sessionId)

    const response = await fetch(API_ENDPOINTS.speechToText, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error('Failed to convert speech to text')
    }

    const data = await response.json()
    return data.text
  },

  async sendChatMessage(message: string, useTTS: boolean = false): Promise<ChatMessage> {
    const endpoint = useTTS ? API_ENDPOINTS.chatWithTTS : API_ENDPOINTS.chat
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        message,
        session_id: sessionId
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to send chat message')
    }

    const data = await response.json()
    
    // Se for TTS, a resposta tem formato diferente
    if (useTTS && data.text && data.audio) {
      return {
        id: sessionId,
        text: data.text,
        sender: 'assistant',
        timestamp: new Date(),
        audio: data.audio,
        audioFormat: data.audio_format || 'mp3'
      }
    } else {
      // Resposta padrão sem TTS
      return {
        id: sessionId,
        text: data.response || data.text,
        sender: 'assistant',
        timestamp: new Date()
      }
    }
  }
} 