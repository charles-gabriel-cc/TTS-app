'use client'

import React, { createContext, useContext, useCallback } from 'react'

interface IdleContextType {
  resetIdleTimer: () => void
}

const IdleContext = createContext<IdleContextType | undefined>(undefined)

export function IdleProvider({ children, onResetIdle }: { children: React.ReactNode, onResetIdle: () => void }) {
  const resetIdleTimer = useCallback(() => {
    console.log('[IdleContext] Timer de inatividade resetado por componente - chamando onResetIdle')
    onResetIdle()
  }, [onResetIdle])

  return (
    <IdleContext.Provider value={{ resetIdleTimer }}>
      {children}
    </IdleContext.Provider>
  )
}

export function useIdleContext() {
  const context = useContext(IdleContext)
  if (context === undefined) {
    throw new Error('useIdleContext must be used within an IdleProvider')
  }
  return context
}
