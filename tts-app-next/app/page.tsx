'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import IdleScreen from '@/components/ui/idle-screen'
import { api } from '@/services/api'
import { ChatProvider, useChatContext } from '@/contexts/ChatContext'
import { GalleryProvider } from '@/contexts/GalleryContext'
import { motion, AnimatePresence } from 'framer-motion'

const ModernChatInterface = dynamic(() => import('@/components/ModernChatInterface'), {
  ssr: false
})

const ChatWithGallery = dynamic(() => import('@/components/ChatWithGallery'), {
  ssr: false
})

function HomeContent() {
  const [showIdleScreen, setShowIdleScreen] = useState(true)
  const [hasUserInteracted, setHasUserInteracted] = useState(false)
  const [chatResetTrigger, setChatResetTrigger] = useState(0)
  const [currentView, setCurrentView] = useState<'gallery' | 'chat'>('gallery')
  const { setPendingMessage } = useChatContext()

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

  const handleNavigateToChat = (message?: string) => {
    setCurrentView('chat')
    // Se há uma mensagem, definir no contexto para ser processada pelo chat
    if (message) {
      console.log("Mensagem para enviar no chat:", message)
      setPendingMessage(message)
    }
  }

  const handleBackToGallery = () => {
    setCurrentView('gallery')
  }

  return (
    <div className="h-screen overflow-hidden">
      {/* Fundo consistente que não muda durante a transição */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 via-teal-500 via-cyan-500 via-purple-500 via-violet-500 to-pink-500"></div>
      
      <AnimatePresence>
        {currentView === 'gallery' && (
          <motion.div
            key="gallery"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ 
              opacity: 0, 
              y: -20,
              transition: { duration: 0.3, ease: "easeInOut" }
            }}
            transition={{ 
              duration: 0.4, 
              ease: [0.4, 0.0, 0.2, 1]
            }}
            className="absolute inset-0 z-10"
          >
            <ChatWithGallery onNavigateToChat={handleNavigateToChat} />
          </motion.div>
        )}
        
        {currentView === 'chat' && (
          <motion.div
            key="chat"
            initial={{ 
              opacity: 0, 
              y: 20
            }}
            animate={{ 
              opacity: 1, 
              y: 0
            }}
            exit={{ 
              opacity: 0, 
              y: -20,
              transition: { duration: 0.3, ease: "easeInOut" }
            }}
            transition={{ 
              duration: 0.4, 
              ease: [0.4, 0.0, 0.2, 1],
              delay: 0.1
            }}
            className="absolute inset-0 z-10"
          >
            <ModernChatInterface 
              resetTrigger={chatResetTrigger}
              onResetChat={handleChatReset}
            />
            <motion.button
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.3, ease: "easeOut" }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleBackToGallery}
              className="fixed top-4 left-4 z-50 bg-black/20 backdrop-blur-sm text-white px-4 py-2 rounded-lg border border-white/10 hover:bg-black/40 transition-colors"
            >
              ← Voltar à Galeria
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
      
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

export default function Home() {
  return (
    <ChatProvider>
      <GalleryProvider>
        <HomeContent />
      </GalleryProvider>
    </ChatProvider>
  )
} 