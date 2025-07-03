import React from 'react'
import { TIMEOUT_CONFIG } from '@/config/api'

export interface NetworkStatus {
  isOnline: boolean
  isConnectedToServer: boolean
  lastCheck: Date
  retryCount: number
}

export interface PendingRequest {
  id: string
  request: () => Promise<any>
  resolve: (value: any) => void
  reject: (error: any) => void
  timestamp: Date
  retryCount: number
  maxRetries: number
  type: 'chat' | 'transcription'
  contentHash?: string // Para detectar duplicatas
}

export class ConnectivityService {
  private static instance: ConnectivityService
  private networkStatus: NetworkStatus
  private pendingRequests: Map<string, PendingRequest> = new Map()
  private listeners: Set<(status: NetworkStatus) => void> = new Set()
  private serverCheckInterval: NodeJS.Timeout | null = null
  private retryInterval: NodeJS.Timeout | null = null
  private activeRequests: Set<string> = new Set() // Track active requests
  
  // Configurações de retry (usando valores do config/api.ts)
  private readonly INITIAL_RETRY_DELAY = TIMEOUT_CONFIG.RETRY.INITIAL_DELAY * 1000
  private readonly MAX_RETRY_DELAY = TIMEOUT_CONFIG.RETRY.MAX_DELAY * 1000
  private readonly MAX_RETRIES = TIMEOUT_CONFIG.RETRY.MAX_RETRIES
  private readonly SERVER_CHECK_INTERVAL = TIMEOUT_CONFIG.SERVER_CHECK_INTERVAL * 1000
  private readonly REQUEST_TIMEOUT = TIMEOUT_CONFIG.CHAT_REQUEST * 1000
  
  constructor() {
    this.networkStatus = {
      isOnline: navigator.onLine,
      isConnectedToServer: false,
      lastCheck: new Date(),
      retryCount: 0
    }
    
    this.setupNetworkListeners()
    this.startServerMonitoring()
    this.startRetryLoop()
  }

  static getInstance(): ConnectivityService {
    if (!ConnectivityService.instance) {
      ConnectivityService.instance = new ConnectivityService()
    }
    return ConnectivityService.instance
  }

  // Monitora eventos de rede do navegador
  private setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.updateNetworkStatus({ isOnline: true })
      this.checkServerConnection()
    })
    
    window.addEventListener('offline', () => {
      this.updateNetworkStatus({ isOnline: false, isConnectedToServer: false })
    })
  }

  // Inicia monitoramento periódico do servidor
  private startServerMonitoring() {
    this.checkServerConnection()
    this.serverCheckInterval = setInterval(() => {
      this.checkServerConnection()
    }, this.SERVER_CHECK_INTERVAL)
  }

  // Loop de retry para requisições pendentes
  private startRetryLoop() {
    this.retryInterval = setInterval(() => {
      this.processPendingRequests()
    }, 2000) // Verifica a cada 2 segundos
  }

  // Verifica se o servidor está acessível
  private async checkServerConnection(): Promise<boolean> {
    if (!this.networkStatus.isOnline) {
      return false
    }

    // Não fazer health check se há requisições ativas sendo processadas
    if (this.activeRequests.size > 0) {
      console.log(`Pulando health check - ${this.activeRequests.size} requisições ativas`)
      return this.networkStatus.isConnectedToServer
    }

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${baseUrl}/health`, {
        method: 'GET',
        cache: 'no-cache',
        signal: AbortSignal.timeout(TIMEOUT_CONFIG.SERVER_HEALTH_CHECK * 1000)
      })
      
      const isConnected = response.ok
      this.updateNetworkStatus({ 
        isConnectedToServer: isConnected,
        retryCount: isConnected ? 0 : this.networkStatus.retryCount
      })
      
      return isConnected
    } catch (error) {
      console.warn('Falha ao conectar com o servidor:', error)
      this.updateNetworkStatus({ 
        isConnectedToServer: false,
        retryCount: this.networkStatus.retryCount + 1
      })
      return false
    }
  }

  // Atualiza status de rede e notifica listeners
  private updateNetworkStatus(updates: Partial<NetworkStatus>) {
    this.networkStatus = {
      ...this.networkStatus,
      ...updates,
      lastCheck: new Date()
    }
    
    this.notifyListeners()
  }

  // Notifica componentes sobre mudanças de status
  private notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.networkStatus)
      } catch (error) {
        console.error('Erro ao notificar listener:', error)
      }
    })
  }

  // Adiciona listener para mudanças de status
  addStatusListener(listener: (status: NetworkStatus) => void) {
    this.listeners.add(listener)
    // Notifica imediatamente o status atual
    listener(this.networkStatus)
    
    // Retorna função para remover o listener
    return () => {
      this.listeners.delete(listener)
    }
  }

  // Executa requisição com retry automático
  async executeWithRetry<T>(
    requestFn: () => Promise<T>,
    options: {
      maxRetries?: number
      type?: 'chat' | 'transcription'
      immediateExecution?: boolean
      contentHash?: string // Para detectar duplicatas
    } = {}
  ): Promise<T> {
    const {
      maxRetries = this.MAX_RETRIES,
      type = 'chat',
      immediateExecution = true,
      contentHash
    } = options

    // Verificar se já existe uma requisição idêntica pendente
    if (contentHash) {
      const existingRequest = Array.from(this.pendingRequests.values())
        .find(req => req.contentHash === contentHash && req.type === type)
      
      if (existingRequest) {
        console.log(`Requisição duplicada detectada para hash: ${contentHash}`)
        // Retornar a Promise da requisição existente
        return new Promise<T>((resolve, reject) => {
          const originalResolve = existingRequest.resolve
          const originalReject = existingRequest.reject
          
          existingRequest.resolve = (value: any) => {
            originalResolve(value)
            resolve(value)
          }
          
          existingRequest.reject = (error: any) => {
            originalReject(error)
            reject(error)
          }
        })
      }
    }

    return new Promise<T>((resolve, reject) => {
      const requestId = Math.random().toString(36).substr(2, 9)
      
      const pendingRequest: PendingRequest = {
        id: requestId,
        request: requestFn,
        resolve,
        reject,
        timestamp: new Date(),
        retryCount: 0,
        maxRetries,
        type,
        contentHash
      }

      this.pendingRequests.set(requestId, pendingRequest)

      // Se deve tentar execução imediata e há conexão
      if (immediateExecution && this.networkStatus.isConnectedToServer) {
        this.executeRequest(requestId)
      }
    })
  }

  // Executa uma requisição específica
  private async executeRequest(requestId: string) {
    const request = this.pendingRequests.get(requestId)
    if (!request) return

    try {
      console.log(`Executando requisição ${requestId} (tentativa ${request.retryCount + 1})`)
      
      // Marcar requisição como ativa
      this.activeRequests.add(requestId)
      
      // Executar com timeout baseado no tipo de requisição
      const timeout = request.type === 'chat' ? 
        TIMEOUT_CONFIG.CHAT_REQUEST * 1000 : 
        TIMEOUT_CONFIG.TRANSCRIPTION_REQUEST * 1000
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout da requisição')), timeout)
      })
      
      const result = await Promise.race([
        request.request(),
        timeoutPromise
      ])
      
      // Sucesso - atualizar status de conectividade e resolver
      this.updateNetworkStatus({ 
        isConnectedToServer: true,
        retryCount: 0
      })
      
      this.pendingRequests.delete(requestId)
      this.activeRequests.delete(requestId)
      request.resolve(result)
      
    } catch (error) {
      this.activeRequests.delete(requestId)
      console.warn(`Falha na requisição ${requestId}:`, error)
      
      // Atualizar status baseado no tipo de erro
      const isNetworkError = error instanceof TypeError || 
                            (error as any)?.name === 'TypeError' ||
                            String(error).includes('fetch')
      
      if (isNetworkError) {
        this.updateNetworkStatus({ 
          isConnectedToServer: false,
          retryCount: this.networkStatus.retryCount + 1
        })
      }
      
      request.retryCount++
      
      // Se excedeu tentativas máximas
      if (request.retryCount >= request.maxRetries) {
        this.pendingRequests.delete(requestId)
        request.reject(new Error(`Falha após ${request.maxRetries} tentativas: ${error}`))
        return
      }

      // Agenda nova tentativa com delay exponencial
      const delay = Math.min(
        this.INITIAL_RETRY_DELAY * Math.pow(2, request.retryCount - 1),
        this.MAX_RETRY_DELAY
      )
      
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.executeRequest(requestId)
        }
      }, delay)
    }
  }

  // Processa todas as requisições pendentes
  private async processPendingRequests() {
    if (!this.networkStatus.isConnectedToServer || this.pendingRequests.size === 0) {
      return
    }

    // Executa requisições que não estão sendo processadas ativamente
    const requestsToExecute = Array.from(this.pendingRequests.keys())
    
    for (const requestId of requestsToExecute) {
      const request = this.pendingRequests.get(requestId)
      if (request) {
        // Só executa se passou tempo suficiente desde a última tentativa
        const timeSinceLastTry = Date.now() - request.timestamp.getTime()
        const minDelay = this.INITIAL_RETRY_DELAY * Math.pow(2, request.retryCount)
        
        if (timeSinceLastTry >= minDelay) {
          this.executeRequest(requestId)
          // Pequeno delay entre requisições para não sobrecarregar
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
    }
  }

  // Retorna status atual
  getStatus(): NetworkStatus {
    return { ...this.networkStatus }
  }

  // Retorna número de requisições ativas
  getActiveRequestsCount(): number {
    return this.activeRequests.size
  }

  // Força verificação de conectividade
  async forceCheck(): Promise<NetworkStatus> {
    await this.checkServerConnection()
    return this.getStatus()
  }

  // Limpa recursos
  destroy() {
    if (this.serverCheckInterval) {
      clearInterval(this.serverCheckInterval)
    }
    if (this.retryInterval) {
      clearInterval(this.retryInterval)
    }
    
    // Rejeita todas as requisições pendentes
    this.pendingRequests.forEach(request => {
      request.reject(new Error('Serviço de conectividade foi destruído'))
    })
    this.pendingRequests.clear()
    this.activeRequests.clear()
    this.listeners.clear()
  }
}

// Hook para usar o serviço em componentes React
export function useConnectivity() {
  const [status, setStatus] = React.useState<NetworkStatus>(() => 
    ConnectivityService.getInstance().getStatus()
  )
  const [activeRequests, setActiveRequests] = React.useState<number>(0)

  React.useEffect(() => {
    const service = ConnectivityService.getInstance()
    const unsubscribe = service.addStatusListener(setStatus)
    
    // Atualizar contagem de requisições ativas periodicamente
    const interval = setInterval(() => {
      setActiveRequests(service.getActiveRequestsCount())
    }, 1000)
    
    return () => {
      unsubscribe()
      clearInterval(interval)
    }
  }, [])

  return {
    status,
    activeRequests,
    executeWithRetry: ConnectivityService.getInstance().executeWithRetry.bind(
      ConnectivityService.getInstance()
    ),
    forceCheck: ConnectivityService.getInstance().forceCheck.bind(
      ConnectivityService.getInstance()
    )
  }
} 