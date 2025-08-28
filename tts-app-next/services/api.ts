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

interface PDFArticle {
  id: string
  filename: string
  title: string
  author: string
  size: number
  url: string
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
  resetSession: async () => {
    const oldSessionId = sessionId
    sessionId = generateSessionId()
    console.log(`[API] Session ID resetado: ${oldSessionId.substring(0, 8)}... → ${sessionId.substring(0, 8)}...`)
    // Limpar cache quando session_id é resetado
    requestCache.clear()
    console.log('[API] Cache limpo após reset do session_id')
    // Limpar cache do backend também
    await api.clearBackendCache()
  },

  // Função para obter o session_id atual (útil para debug)
  getCurrentSessionId: () => sessionId,

  // Função para limpar o cache manualmente
  clearCache: () => {
    requestCache.clear()
    console.log('[API] Cache limpo manualmente')
  },

  // Função para limpar o cache do backend
  async clearBackendCache(): Promise<void> {
    try {
      const response = await fetch(`${API_ENDPOINTS.backend}/clear_cache`, {
        method: 'POST',
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to clear backend cache`)
      }
      
      console.log('[API] Cache do backend limpo com sucesso')
    } catch (error) {
      console.warn('[API] Erro ao limpar cache do backend:', error)
    }
  },

  // Função para limpar cache específico do backend
  async clearSpecificBackendCache(sessionId: string, messageHash: string): Promise<void> {
    try {
      const response = await fetch(`${API_ENDPOINTS.backend}/clear_specific_cache`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          message_hash: messageHash
        })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to clear specific backend cache`)
      }
      
      console.log('[API] Cache específico do backend limpo com sucesso')
    } catch (error) {
      console.warn('[API] Erro ao limpar cache específico do backend:', error)
    }
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
    // Para mensagens de chat, NÃO usar cache - sempre gerar nova resposta
    console.log(`[API] Enviando mensagem de chat (sem cache): "${message.substring(0, 50)}..."`)
    
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
    
    console.log(`[API] Executando nova requisição de chat`)
    
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

  // Função para enviar mensagem de chat específico de artigos
  async sendArticleChatMessage(message: string, professorName: string, useTTS: boolean = false): Promise<ChatMessage> {
    // Para mensagens de chat de artigos, NÃO usar cache - sempre gerar nova resposta
    console.log(`[API] Enviando mensagem de chat de artigo (sem cache): "${message.substring(0, 50)}..." para ${professorName}`)
    
    // PRIMEIRO: Verificar se existe resposta pendente para esta mensagem
    try {
      const messageHash = await generateMessageHash(message, useTTS)
      const pendingResponses = await this.checkPendingResponses()
      
      // Procurar por resposta pendente que corresponda a esta mensagem
      const pendingMatch = pendingResponses.find(pr => pr.message_hash === messageHash)
      
      if (pendingMatch) {
        console.log(`[Pending] Resposta recuperada do servidor para artigo: "${message.substring(0, 50)}..."`)
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
      console.warn('[Pending] Erro ao verificar respostas pendentes para artigo, continuando com nova requisição:', error)
    }

    // SEGUNDO: Se não há resposta pendente, fazer nova requisição
    const endpoint = useTTS ? API_ENDPOINTS.articleChatWithTTS : API_ENDPOINTS.articleChat
    
    console.log(`[API] Executando nova requisição de chat de artigo`)
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        message,
        session_id: sessionId,
        professor_name: professorName
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to send article chat message`)
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

  // Função para buscar PDFs de artigos
  async getPDFArticles(): Promise<PDFArticle[]> {
    const cacheKey = `pdfs_${sessionId}`
    
    return executeWithCache(
      cacheKey,
      async () => {
        const response = await fetch(`${API_ENDPOINTS.backend}/articles/pdfs`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to fetch PDF articles`)
        }

        const data = await response.json()
        return data
      },
      3 // maxRetries
    )
  },

  // Função para baixar um PDF específico
  async downloadPDF(articleId: string): Promise<Blob> {
    const cacheKey = `pdf_download_${articleId}_${sessionId}`
    
    console.log('[API] Iniciando download do PDF:', {
      articleId,
      cacheKey,
      url: `${API_ENDPOINTS.backend}/articles/pdfs/${articleId}/download`
    });
    
    return executeWithCache(
      cacheKey,
      async () => {
        console.log('[API] Fazendo requisição para download do PDF:', articleId);
        
        const response = await fetch(`${API_ENDPOINTS.backend}/articles/pdfs/${articleId}/download`, {
          method: 'GET',
        })

        console.log('[API] Resposta recebida:', {
          status: response.status,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries())
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[API] Erro na resposta:', {
            status: response.status,
            statusText: response.statusText,
            errorText
          });
          throw new Error(`HTTP ${response.status}: Failed to download PDF - ${errorText}`)
        }

        const blob = await response.blob();
        console.log('[API] Blob criado com sucesso:', {
          size: blob.size,
          type: blob.type,
          articleId
        });

        return blob;
      },
      2 // maxRetries
    )
  },

  // Função para obter URL de visualização de PDF
  getPDFViewUrl(articleId: string): string {
    const encodedArticleId = encodeURIComponent(articleId);
    return `${API_ENDPOINTS.backend}/articles/pdfs/${encodedArticleId}/view`;
  }
} 