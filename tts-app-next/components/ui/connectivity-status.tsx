"use client"

import React from 'react'
import { Wifi, WifiOff, AlertTriangle, CheckCircle, Loader2, RotateCcw } from 'lucide-react'
import { Button } from './button'
import { useConnectivity } from '@/services/connectivity'
import { cn } from '@/lib/utils'

interface ConnectivityStatusProps {
  className?: string
  showDetails?: boolean
}

export function ConnectivityStatus({ className, showDetails = false }: ConnectivityStatusProps) {
  const { status, forceCheck, activeRequests } = useConnectivity()
  const [isChecking, setIsChecking] = React.useState(false)

  const handleForceCheck = async () => {
    setIsChecking(true)
    try {
      await forceCheck()
    } finally {
      setIsChecking(false)
    }
  }

  const getStatusIcon = () => {
    if (isChecking) {
      return <Loader2 className="w-4 h-4 animate-spin" />
    }

    if (!status.isOnline) {
      return <WifiOff className="w-4 h-4" />
    }

    if (activeRequests > 0) {
      return <Loader2 className="w-4 h-4 animate-spin" />
    }

    if (!status.isConnectedToServer) {
      return <AlertTriangle className="w-4 h-4" />
    }

    return <CheckCircle className="w-4 h-4" />
  }

  const getStatusColor = () => {
    if (!status.isOnline) {
      return 'text-red-500'
    }

    if (activeRequests > 0) {
      return 'text-blue-500'
    }

    if (!status.isConnectedToServer) {
      return 'text-yellow-500'
    }

    return 'text-green-500'
  }

  const getStatusText = () => {
    if (!status.isOnline) {
      return 'Sem conexão'
    }

    if (activeRequests > 0) {
      return 'Processando...'
    }

    if (!status.isConnectedToServer) {
      return 'Reconectando...'
    }

    return 'Conectado'
  }

  const getDetailedStatus = () => {
    if (!status.isOnline) {
      return 'Verifique sua conexão WiFi'
    }

    if (activeRequests > 0) {
      return `Processando ${activeRequests} ${activeRequests === 1 ? 'requisição' : 'requisições'}`
    }

    if (!status.isConnectedToServer) {
      return `Tentando reconectar (${status.retryCount} tentativas)`
    }

    return 'Tudo funcionando normalmente'
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('flex items-center gap-1', getStatusColor())}>
        {getStatusIcon()}
        <span className="text-xs font-medium">
          {getStatusText()}
        </span>
      </div>

      {showDetails && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {getDetailedStatus()}
          </span>
          
          {(!status.isOnline || !status.isConnectedToServer) && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleForceCheck}
              disabled={isChecking}
              className="w-6 h-6"
            >
              <RotateCcw className="w-3 h-3" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// Componente compacto para a barra de status
export function ConnectivityBadge({ className }: { className?: string }) {
  const { status, activeRequests } = useConnectivity()

  // Não mostrar badge se há requisições ativas (processamento normal)
  // ou se tudo está funcionando
  if ((status.isOnline && status.isConnectedToServer) || activeRequests > 0) {
    return null
  }

  return (
    <div className={cn(
      'fixed top-4 right-4 z-50 rounded-full px-3 py-1 text-xs font-medium',
      'flex items-center gap-2 shadow-lg',
      !status.isOnline 
        ? 'bg-red-100 text-red-700 border border-red-200'
        : 'bg-yellow-100 text-yellow-700 border border-yellow-200',
      className
    )}>
      {!status.isOnline ? (
        <>
          <WifiOff className="w-3 h-3" />
          <span>Sem Internet</span>
        </>
      ) : (
        <>
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Reconectando...</span>
        </>
      )}
    </div>
  )
}

// Componente para mostrar mensagens em fila
export function PendingMessagesIndicator({ className }: { className?: string }) {
  const { status, activeRequests } = useConnectivity()

  // Mostrar apenas se há problemas de conectividade e não há requisições ativas
  const shouldShow = !status.isConnectedToServer && status.isOnline && activeRequests === 0

  if (!shouldShow) {
    return null
  }

  return (
    <div className={cn(
      'fixed bottom-20 left-4 z-50 rounded-lg px-3 py-2 text-xs',
      'bg-blue-100 text-blue-700 border border-blue-200',
      'flex items-center gap-2 shadow-lg',
      className
    )}>
      <Loader2 className="w-3 h-3 animate-spin" />
      <span>
        Aguardando reconexão...
      </span>
    </div>
  )
} 