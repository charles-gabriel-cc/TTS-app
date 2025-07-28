'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import IdleScreen from '@/components/ui/idle-screen'
import { api } from '@/services/api'

const ModernChatInterface = dynamic(() => import('@/components/ModernChatInterface'), {
  ssr: false
})

export default function Home() {
  const [showIdleScreen, setShowIdleScreen] = useState(true)
  const [hasUserInteracted, setHasUserInteracted] = useState(false)
  const [chatResetTrigger, setChatResetTrigger] = useState(0)

  // Auto-show idle screen after period of inactivity
  useEffect(() => {
    let inactivityTimer: NodeJS.Timeout

    const startInactivityTimer = () => {
      clearTimeout(inactivityTimer)
      if (hasUserInteracted && !showIdleScreen) {
        // Show idle screen after 30 seconds of inactivity
        inactivityTimer = setTimeout(() => {
          setShowIdleScreen(true)
        }, 90 * 1000) // 30 seconds
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
    // Reset session ID when user exits idle screen
    api.resetSession()
    // Reset chat interface visually
    setChatResetTrigger(prev => prev + 1)
  }

  const handleChatReset = () => {
    console.log('Chat foi resetado visualmente')
  }

  return (
    <div className="h-screen bg-gray-50">
      <ModernChatInterface 
        resetTrigger={chatResetTrigger}
        onResetChat={handleChatReset}
      />
      <IdleScreen
        isVisible={showIdleScreen}
        onDismiss={handleIdleScreenDismiss}
        title="Assistente Virtual do CCEN"
        description="Conheça os professores do CCEN. Obtenha informações sobre os professores, suas áreas de atuação, acesso aos seus currículos lattes e outras informações."
        callToAction="Toque em qualquer lugar para começar"
      />
    </div>
  )
} 