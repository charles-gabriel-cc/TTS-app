'use client'

import { useState, useEffect } from 'react'
import styled from 'styled-components'
import dynamic from 'next/dynamic'
import IdleScreen from '@/components/ui/idle-screen'

const ChatInterface = dynamic(() => import('@/components/ChatInterface'), {
  ssr: false
})

const AppContainer = styled.div`
  text-align: center;
  background-color: #f5f5f5;
  min-height: 100vh;
  width: 100%;
  padding: 0;
  margin: 0;
  display: flex;
  align-items: stretch;
  justify-content: stretch;
`

export default function Home() {
  const [showIdleScreen, setShowIdleScreen] = useState(true)
  const [hasUserInteracted, setHasUserInteracted] = useState(false)

  // Auto-show idle screen after period of inactivity
  useEffect(() => {
    let inactivityTimer: NodeJS.Timeout

    const startInactivityTimer = () => {
      clearTimeout(inactivityTimer)
      if (hasUserInteracted && !showIdleScreen) {
        // Show idle screen after 2 minutes of inactivity
        inactivityTimer = setTimeout(() => {
          setShowIdleScreen(true)
        }, 2 * 60 * 1000) // 2 minutes
      }
    }

    const handleActivity = () => {
      // Only handle activity when idle screen is not visible
      if (!showIdleScreen && hasUserInteracted) {
        startInactivityTimer()
      }
    }

    // Listen for intentional user interactions (clicks/touches only)
    const events = ['click', 'touchstart', 'keypress']
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true)
    })

    // Start timer if user has already interacted and idle screen is not visible
    if (hasUserInteracted && !showIdleScreen) {
      startInactivityTimer()
    }

    return () => {
      clearTimeout(inactivityTimer)
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true)
      })
    }
  }, [hasUserInteracted, showIdleScreen])

  const handleIdleScreenDismiss = () => {
    setShowIdleScreen(false)
    if (!hasUserInteracted) {
      setHasUserInteracted(true)
    }
  }

  return (
    <AppContainer>
      <ChatInterface />
      <IdleScreen
        isVisible={showIdleScreen}
        onDismiss={handleIdleScreenDismiss}
        title="Assistente Virtual da Faculdade"
        description="Faça perguntas sobre professores da faculdade. Obtenha acesso instantâneo a detalhes do corpo docente, horários de atendimento e informações de contato para melhorar sua experiência acadêmica."
        callToAction="Toque em qualquer lugar para começar"
      />
    </AppContainer>
  )
} 