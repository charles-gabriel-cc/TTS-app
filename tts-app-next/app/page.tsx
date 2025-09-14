'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import IdleScreen from '@/components/ui/idle-screen'
import { api } from '@/services/api'
import { ChatProvider, useChatContext } from '@/contexts/ChatContext'
import { GalleryProvider } from '@/contexts/GalleryContext'
import { IdleProvider } from '@/contexts/IdleContext'
import { motion, AnimatePresence } from 'framer-motion'

// Componente de fundo acadêmico animado
const AcademicBackground = () => (
  <div className="absolute inset-0 overflow-hidden">
    {/* Gradient Background */}
    <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 via-teal-500 via-cyan-500 via-purple-500 via-violet-500 to-pink-500 dark:from-green-600 dark:via-teal-700 dark:via-blue-700 dark:via-purple-700 dark:to-pink-600"></div>
    <div className="absolute inset-0 bg-gradient-to-tl from-green-400 via-emerald-500 via-teal-500 to-cyan-400 opacity-35"></div>
    <div className="absolute inset-0 bg-gradient-to-r from-green-500 via-emerald-400 via-teal-400 via-blue-500 to-purple-600 opacity-25"></div>
    <div className="absolute inset-0 bg-gradient-to-bl from-purple-400 via-violet-500 via-fuchsia-500 to-pink-500 opacity-30"></div>
    
    {/* Logo do Museu CCEN - Fundo Sutil */}
    <div className="absolute inset-0 flex items-center justify-center opacity-5">
      <motion.div
        className="w-96 h-96"
        animate={{ 
          scale: [1, 1.02, 1],
          opacity: [0.05, 0.08, 0.05]
        }}
        transition={{ 
          duration: 20, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
        style={{ willChange: 'transform, opacity' }}
      >
        <img 
          src="/images/logo_museu_ccen.png" 
          alt="Museu de Ciências Exatas" 
          className="w-full h-full object-contain"
        />
      </motion.div>
    </div>
    
    {/* Mathematical Symbols - REDUZIDO PARA PERFORMANCE */}
    <div className="absolute inset-0 opacity-25">
      <motion.div 
        className="absolute top-20 left-16 text-5xl font-bold text-yellow-300"
        animate={{ rotate: [0, 5, -5, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        style={{ willChange: 'transform' }}
      >
        ∫
      </motion.div>
      <motion.div 
        className="absolute top-40 right-20 text-4xl font-bold text-pink-400"
        animate={{ y: [0, -8, 8, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        style={{ willChange: 'transform' }}
      >
        π
      </motion.div>
      
      <motion.div 
        className="absolute bottom-32 left-24 text-4xl font-bold text-lime-400"
        animate={{ scale: [1, 1.05, 0.95, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        style={{ willChange: 'transform' }}
      >
        E=mc²
      </motion.div>
      <motion.div 
        className="absolute bottom-20 right-32 text-3xl font-bold text-cyan-400"
        animate={{ rotate: [0, 6, -6, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        style={{ willChange: 'transform' }}
      >
        ⚛
      </motion.div>
    </div>
    
    {/* Geometric Patterns - REDUZIDO PARA PERFORMANCE */}
    <div className="absolute inset-0 opacity-15">
      <motion.div 
        className="absolute top-16 right-16 w-24 h-24 border-2 border-cyan-300 rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        style={{ willChange: 'transform' }}
      ></motion.div>
      <motion.div 
        className="absolute bottom-32 left-20 w-16 h-16 border-2 border-lime-400"
        animate={{ rotate: [0, 90, 180, 270, 360] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        style={{ willChange: 'transform' }}
      ></motion.div>
    </div>
    
    {/* Floating Particles */}
    <div className="absolute inset-0 opacity-60">
      {Array.from({ length: 6 }, (_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-cyan-400 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            willChange: 'transform, opacity'
          }}
          animate={{
            y: [0, -25, 0],
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{
            duration: 4 + Math.random() * 3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: Math.random() * 2,
          }}
        />
      ))}
    </div>
    
    {/* Grid Pattern - SIMPLIFICADO PARA PERFORMANCE */}
    <div className="absolute inset-0 opacity-10">
      <div 
        className="w-full h-full"
        style={{
          backgroundImage: `linear-gradient(rgba(34, 197, 94, 0.2) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}
      ></div>
    </div>
  </div>
);

const MainChatSession = dynamic(() => import('@/components/MainChatSession'), {
  ssr: false
})

const ChatWithGallery = dynamic(() => import('@/components/ChatWithGallery'), {
  ssr: false
})

const ArticleChatSession = dynamic(() => import('@/components/ArticleChatSession'), {
  ssr: false
})

function HomeContent() {
  const [showIdleScreen, setShowIdleScreen] = useState(true)
  const [hasUserInteracted, setHasUserInteracted] = useState(false)
  const [currentView, setCurrentView] = useState<'gallery' | 'chat' | 'article-chat'>('gallery')
  const [isFromIdle, setIsFromIdle] = useState(false)
  const [articleChatData, setArticleChatData] = useState<{
    professorName: string
    articleTitle?: string
  } | null>(null)
  const { pendingMessage, setPendingMessage, clearPendingMessage, clearAllSessions, isGlobalLoading, shouldApplyGlobalLoading } = useChatContext()

  console.log('[HomeContent] Estado inicial:', {
    showIdleScreen,
    hasUserInteracted,
    currentView
  })

  // Função para resetar timer de inatividade
  const handleResetIdleTimer = useCallback(() => {
    if (!showIdleScreen) {
      console.log('[Idle] Timer resetado por componente')
      // O timer será resetado automaticamente pelos event listeners
    } else {
      console.log('[Idle] Timer resetado ignorado - tela de idle ativa')
    }
  }, [showIdleScreen])

  // Auto-show idle screen after period of inactivity
  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    const resetInactivityTimer = () => {
      clearTimeout(timeoutId)
      console.log('[Idle] Timer de inatividade iniciado - 30 segundos')
      timeoutId = setTimeout(async () => {
        if (!showIdleScreen) {
          console.log('[Idle] Mostrando tela de idle por inatividade')
          setShowIdleScreen(true)
          setHasUserInteracted(false)
          setCurrentView('gallery') // Sempre voltar para galeria ao entrar em idle
          // Limpar todas as sessões e resetar session_id quando voltar para idle
          clearAllSessions()
          await api.resetSession()
        } else {
          console.log('[Idle] Timer expirou mas tela de idle já está ativa')
        }
              }, 120 * 1000) // 2 minutos de inatividade
    }

    // Função para resetar timer de inatividade
    const handleUserActivity = () => {
      if (!showIdleScreen) {
        console.log('[Idle] Atividade detectada - resetando timer')
        resetInactivityTimer()
      } else {
        console.log('[Idle] Atividade detectada mas tela de idle está ativa')
      }
    }

    if (!showIdleScreen) {
      console.log('[Idle] Configurando timer de inatividade para view:', currentView)
      resetInactivityTimer()
      
      // Adicionar listeners para detectar atividade do usuário
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
      events.forEach(event => {
        document.addEventListener(event, handleUserActivity, { passive: true })
      })

      return () => {
        clearTimeout(timeoutId)
        events.forEach(event => {
          document.removeEventListener(event, handleUserActivity)
        })
      }
    }

    return () => {
      clearTimeout(timeoutId)
    }
  }, [showIdleScreen, clearAllSessions])

  // Reset isFromIdle após um tempo
  useEffect(() => {
    if (isFromIdle) {
      const timer = setTimeout(() => {
        setIsFromIdle(false)
      }, 100) // Reset após 100ms
      return () => clearTimeout(timer)
    }
  }, [isFromIdle])

  const handleIdleScreenDismiss = async () => {
    console.log('[Idle] Tela de idle fechada pelo usuário - indo para galeria e gerando novo session_id')
    setShowIdleScreen(false)
    setHasUserInteracted(true)
    setCurrentView('gallery') // Sempre ir para galeria após sair da tela de idle
    setIsFromIdle(true) // Marcar que voltou do modo idle
    // Gerar novo session_id quando sair da tela de idle
    await api.resetSession()
  }

  const handleNavigateToChat = (message?: string) => {
    console.log("Navegando para chat com mensagem:", message)
    setCurrentView('chat')
    if (message) {
      setPendingMessage(message)
    }
  }

  const handleNavigateToArticleChat = (professorName: string, articleTitle?: string) => {
    console.log("Navegando para chat de artigo:", { professorName, articleTitle })
    setArticleChatData({
      professorName,
      articleTitle
    })
    setCurrentView('article-chat')
  }

  const handleBackToGallery = () => {
    console.log("Voltando para galeria")
    setCurrentView('gallery')
    setArticleChatData(null) // Limpar dados do chat de artigos
    // NÃO limpar sessões aqui - manter mensagens durante navegação
  }

  const handleBackToIdle = async () => {
    console.log("Voltando para tela de idle - limpando sessões e resetando session_id")
    setShowIdleScreen(true)
    setHasUserInteracted(false)
    setCurrentView('gallery')
    // Limpar todas as sessões e resetar session_id da API
    clearAllSessions()
    await api.resetSession()
  }

  return (
    <IdleProvider onResetIdle={handleResetIdleTimer}>
      <div className="relative h-screen overflow-hidden">
        {/* Fundo acadêmico animado consistente */}
        <AcademicBackground />
        
        <AnimatePresence mode="wait">
        {currentView === 'gallery' && (
          <motion.div
            key="gallery"
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
            className="absolute inset-0 z-20"
          >
            <ChatWithGallery 
              onNavigateToChat={handleNavigateToChat}
              onNavigateToArticleChat={handleNavigateToArticleChat}
              isFromIdle={isFromIdle}
            />
            {/* <motion.button
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.3, ease: "easeOut" }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleBackToIdle}
              disabled={shouldApplyGlobalLoading && isGlobalLoading}
              className="fixed top-4 left-4 z-50 bg-black/20 backdrop-blur-sm text-white px-4 py-2 rounded-lg border border-white/10 hover:bg-black/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Voltar ao Início
            </motion.button> */}
          </motion.div>
        )}
        
        {currentView === 'article-chat' && articleChatData && (
          <motion.div
            key="article-chat"
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
            className="absolute inset-0 z-20"
          >
            <ArticleChatSession 
              professorName={articleChatData.professorName}
              articleTitle={articleChatData.articleTitle}
              onBackToGallery={handleBackToGallery}
            />
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
            className="absolute inset-0 z-20"
          >
            <MainChatSession 
              onBackToGallery={handleBackToGallery}
              pendingMessage={pendingMessage}
              onClearPendingMessage={clearPendingMessage}
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="relative z-30">
        <IdleScreen
          isVisible={showIdleScreen}
          onDismiss={handleIdleScreenDismiss}
          title=""
          description="Conheça os professores do CCEN. Obtenha informações sobre os professores, suas áreas de atuação, acesso aos seus currículos lattes e outras informações."
          callToAction="Toque em qualquer lugar para começar"
        />
      </div>
      </div>
    </IdleProvider>
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