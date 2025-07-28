import { API_ENDPOINTS } from '@/config/api'
import { v4 as uuidv4 } from 'uuid'

// Função para gerar hash MD5 usando Web Crypto API
const generateMessageHash = async (message: string, useTTS: boolean = false): Promise<string> => {
  const content = `${message}_${useTTS}`
  const encoder = new TextEncoder()
  const data = encoder.encode(content)
  
  // Se estiver no browser, use Web Crypto API
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }
  
  // Fallback simples para server-side rendering
  return btoa(content).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32)
}

// Interface para resposta pendente do servidor
interface PendingResponse {
  message_hash: string
  response: any
  timestamp: number
}

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

// Cache para evitar requisições duplicadas
const requestCache = new Map<string, Promise<any>>()

// Função simples para executar requisição com retry e cache
const executeWithCache = async <T>(
  cacheKey: string,
  requestFn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> => {
  // Se já existe uma requisição idêntica em andamento, retorna ela
  if (requestCache.has(cacheKey)) {
    console.log(`[Cache] Reutilizando requisição: ${cacheKey}`)
    return requestCache.get(cacheKey) as Promise<T>
  }

  console.log(`[Cache] Nova requisição: ${cacheKey}`)

  // Função de retry simples
  const executeWithRetry = async (attempt: number = 1): Promise<T> => {
    try {
      return await requestFn()
    } catch (error) {
      if (attempt < maxRetries) {
        console.log(`[Retry] Tentativa ${attempt + 1}/${maxRetries} para: ${cacheKey}`)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000) // Max 10s
        await new Promise(resolve => setTimeout(resolve, delay))
        return executeWithRetry(attempt + 1)
      }
      throw error
    }
  }

  // Criar Promise e adicionar ao cache
  const requestPromise = executeWithRetry()
    .finally(() => {
      // Remover do cache quando terminar (sucesso ou erro)
      setTimeout(() => {
        requestCache.delete(cacheKey)
        console.log(`[Cache] Removido do cache: ${cacheKey}`)
      }, 2000) // Manter cache por 2 segundos após completar
    })

  requestCache.set(cacheKey, requestPromise)
  return requestPromise
}

export const api = {
  // Função para resetar o session_id se necessário
  resetSession: () => {
    sessionId = generateSessionId()
  },

  // Função para verificar respostas pendentes no servidor
  async checkPendingResponses(): Promise<PendingResponse[]> {
    try {
      const response = await fetch(`${API_ENDPOINTS.chat.replace('/chat/', `/pending_responses/${sessionId}`)}`)
      
      if (!response.ok) {
        console.warn('[Pending] Falha ao verificar respostas pendentes:', response.status)
        return []
      }

      const data = await response.json()
      console.log(`[Pending] Encontradas ${data.pending_responses?.length || 0} respostas pendentes`)
      return data.pending_responses || []
    } catch (error) {
      console.warn('[Pending] Erro ao verificar respostas pendentes:', error)
      return []
    }
  },

  async speechToText(audioBlob: Blob): Promise<string> {
    // Gerar hash baseado no tamanho e tipo do arquivo (não no conteúdo completo por performance)
    const cacheKey = `audio_${audioBlob.size}_${audioBlob.type}_${sessionId}`
    
    return executeWithCache(
      cacheKey,
      async () => {
        const formData = new FormData()
        formData.append('audio', audioBlob)
        formData.append('session_id', sessionId)

        const response = await fetch(API_ENDPOINTS.speechToText, {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to convert speech to text`)
        }

        const data = await response.json()
        return data.text
      },
      3 // maxRetries
    )
  },

  async sendChatMessage(message: string, useTTS: boolean = false): Promise<ChatMessage> {
    // Gerar chave de cache baseada na mensagem, session e configuração TTS
    const cacheKey = `chat_${message}_${sessionId}_${useTTS}`
    
    return executeWithCache(
      cacheKey,
      async () => {
        // PRIMEIRO: Verificar se existe resposta pendente para esta mensagem
        try {
          const messageHash = await generateMessageHash(message, useTTS)
          const pendingResponses = await this.checkPendingResponses()
          
          // Procurar por resposta pendente que corresponda a esta mensagem
          const pendingMatch = pendingResponses.find(pr => pr.message_hash === messageHash)
          
          if (pendingMatch) {
            console.log(`[Pending] Resposta recuperada do servidor para: "${message.substring(0, 50)}..."`)
            const data = pendingMatch.response
            
            // Formatear resposta igual ao processo normal
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
              return {
                id: sessionId,
                text: data.response || data.text,
                sender: 'assistant',
                timestamp: new Date()
              }
            }
          }
        } catch (error) {
          console.warn('[Pending] Erro ao verificar respostas pendentes, continuando com nova requisição:', error)
        }

        // SEGUNDO: Se não há resposta pendente, fazer nova requisição
        const endpoint = useTTS ? API_ENDPOINTS.chatWithTTS : API_ENDPOINTS.chat
        
        console.log(`[API] Executando nova requisição para: ${cacheKey}`)
        
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
          throw new Error(`HTTP ${response.status}: Failed to send chat message`)
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
      },
      5 // maxRetries
    )
  }
} 