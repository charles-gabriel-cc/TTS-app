'use client'

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { ChatInput } from '@/components/ChatInput'
import { useChatContext } from '@/contexts/ChatContext'
import { useIdleContext } from '@/contexts/IdleContext'
import { api } from '@/services/api'
import { motion, AnimatePresence } from 'framer-motion'
import { GraduationCap, MessageCircle, ArrowLeft, Play, Pause } from 'lucide-react'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'

interface MainChatSessionProps {
  onBackToGallery: () => void
  pendingMessage?: string | null
  onClearPendingMessage?: () => void
}

export default function MainChatSession({ onBackToGallery, pendingMessage, onClearPendingMessage }: MainChatSessionProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null)
  const [messageValue, setMessageValue] = useState("")
  const audioRef = useRef<HTMLAudioElement | null>(null)
  
  // Gerar posições das partículas uma única vez
  const particlePositions = useMemo(() => 
    Array.from({ length: 6 }, () => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: Math.random() * 2,
      duration: 4 + Math.random() * 3
    })), []
  )
  
  const { 
    audioOutputEnabled, 
    setAudioOutputEnabled,
    isRecording,
    setIsRecording,
    recordingDuration,
    setRecordingDuration,
    isGlobalLoading,
    setIsGlobalLoading,
    setShouldApplyGlobalLoading,
    getOrCreateMainChatSession,
    addMessage,
    getSessionMessages
  } = useChatContext()

  const { resetIdleTimer } = useIdleContext()

  // Usar sessão fixa para o chat principal
  const mainSessionId = getOrCreateMainChatSession()
  const messages = getSessionMessages(mainSessionId)

  // Desabilitar loading global para este chat (chat principal)
  useEffect(() => {
    setShouldApplyGlobalLoading(false);
    return () => {
      setShouldApplyGlobalLoading(true);
    };
  }, [setShouldApplyGlobalLoading]);

  // Limpar áudio quando sair do componente
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      setPlayingMessageId(null)
    }
  }, [])

  // Incrementar contador de gravação
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRecording, setRecordingDuration]);

  const handleSendMessage = useCallback(async (message: string) => {
    if (!message.trim() || isLoading) return

    console.log('[MainChatSession] handleSendMessage chamado:', message)
    resetIdleTimer()
    setIsLoading(true)

    // Adicionar mensagem do usuário
    const userMessage = {
      id: Date.now().toString(),
      content: message,
      role: 'user' as const,
      timestamp: new Date()
    }

    addMessage(mainSessionId, userMessage)
    setMessageValue("")
    setIsGlobalLoading(true)

    try {
      // Enviar mensagem para o chat principal (usa collection de docentes)
      const response = await api.sendChatMessage(message, audioOutputEnabled)
      
      // Adicionar resposta do assistente
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        content: response.text,
        role: 'assistant' as const,
        timestamp: new Date(),
        audioUrl: response.audio,
        audioFormat: response.audioFormat
      }

      addMessage(mainSessionId, assistantMessage)

      // Reproduzir áudio se disponível e habilitado
      if (audioOutputEnabled && response.audio) {
        playAudio(response.audio, response.audioFormat || 'mp3', assistantMessage.id)
      }

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      
      // Adicionar mensagem de erro
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        content: "Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.",
        role: 'assistant' as const,
        timestamp: new Date()
      }

      addMessage(mainSessionId, errorMessage)
    } finally {
      setIsLoading(false)
      setIsGlobalLoading(false)
    }
  }, [isLoading, audioOutputEnabled, resetIdleTimer, mainSessionId, addMessage, setIsGlobalLoading])

  // Processar mensagem pendente quando o componente montar
  useEffect(() => {
    if (pendingMessage && !isLoading) {
      console.log('[MainChatSession] Processando mensagem pendente:', pendingMessage);
      // Pequeno delay para garantir que o componente está montado
      setTimeout(() => {
        handleSendMessage(pendingMessage);
        // Limpar mensagem pendente após processar
        if (onClearPendingMessage) {
          onClearPendingMessage();
        }
      }, 100);
    }
  }, [pendingMessage, isLoading, handleSendMessage, onClearPendingMessage]);

  const playAudio = useCallback((audioData: string, format: string, messageId: string) => {
    if (audioRef.current) {
      audioRef.current.pause()
    }

    const audio = new Audio(`data:audio/${format};base64,${audioData}`)
    audioRef.current = audio

    audio.onended = () => {
      setPlayingMessageId(null)
      audioRef.current = null
    }

    audio.onerror = () => {
      console.error('Erro ao reproduzir áudio')
      setPlayingMessageId(null)
      audioRef.current = null
    }

    setPlayingMessageId(messageId)
    audio.play().catch(error => {
      console.error('Erro ao reproduzir áudio:', error)
      setPlayingMessageId(null)
    })
  }, [])

  const handleToggleAudio = useCallback((messageId: string, audioData: string, format: string) => {
    if (playingMessageId === messageId) {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      setPlayingMessageId(null)
    } else {
      playAudio(audioData, format, messageId)
    }
  }, [playingMessageId, playAudio])

  const handleStartRecording = useCallback(() => {
    resetIdleTimer()
    setIsRecording(true)
    setRecordingDuration(0)
  }, [setIsRecording, setRecordingDuration, resetIdleTimer])

  const handleStopRecording = useCallback(async (audioBlob: Blob) => {
    resetIdleTimer()
    setIsRecording(false)
    setRecordingDuration(0)
    setIsGlobalLoading(true)
    try {
      const text = await api.speechToText(audioBlob)
      handleSendMessage(text)
    } catch (error) {
      console.error('Erro ao processar áudio:', error)
      handleSendMessage("Erro ao processar áudio. Tente novamente.")
    }
  }, [handleSendMessage, setIsRecording, setRecordingDuration, resetIdleTimer, setIsGlobalLoading])

  const handleCancelRecording = useCallback(() => {
    resetIdleTimer()
    setIsRecording(false)
    setRecordingDuration(0)
  }, [setIsRecording, setRecordingDuration, resetIdleTimer])

  const handleToggleAudioOutput = useCallback(() => {
    resetIdleTimer()
    setAudioOutputEnabled(prev => !prev)
  }, [setAudioOutputEnabled, resetIdleTimer])

  // Função wrapper para o ChatInput (sem parâmetros)
  const handleSend = useCallback(() => {
    if (messageValue.trim()) {
      handleSendMessage(messageValue.trim())
    }
  }, [messageValue, handleSendMessage])

  const handleBackClick = useCallback(() => {
    if (!isLoading) {
      onBackToGallery()
    }
  }, [isLoading, onBackToGallery])

  return (
    <div className="flex flex-col h-full relative">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 via-teal-500 via-cyan-500 via-purple-500 via-violet-500 to-pink-500 dark:from-green-600 dark:via-teal-700 dark:via-blue-700 dark:via-purple-700 dark:to-pink-600"></div>
        <div className="absolute inset-0 bg-gradient-to-tl from-green-400 via-emerald-500 via-teal-500 to-cyan-400 opacity-35"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-green-500 via-emerald-400 via-teal-400 via-blue-500 to-purple-600 opacity-25"></div>
        <div className="absolute inset-0 bg-gradient-to-bl from-purple-400 via-violet-500 via-fuchsia-500 to-pink-500 opacity-30"></div>
        
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
          {particlePositions.map((particle, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-cyan-400 rounded-full"
              style={{
                left: particle.left,
                top: particle.top,
                willChange: 'transform, opacity'
              }}
              animate={{
                y: [0, -25, 0],
                opacity: [0.4, 0.7, 0.4],
              }}
              transition={{
                duration: particle.duration,
                repeat: Infinity,
                ease: "easeInOut",
                delay: particle.delay,
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
      {/* Header */}
      <motion.div 
        className="border-b border-white/10 bg-black/20 backdrop-blur-xl p-4 relative z-10"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackClick}
            disabled={isLoading}
            className="text-white/70 hover:text-white hover:bg-white/10 p-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-cyan-400" />
            <div>
              <h1 className="text-lg font-semibold text-white">
                Assistente Virtual do CCEN
              </h1>
              <p className="text-sm text-white/70">
                Conheça os professores do CCEN
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 relative z-10">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                Assistente Virtual do CCEN
              </h3>
              <p className="text-white/70 max-w-md">
                Conheça os professores do CCEN. Obtenha informações sobre os professores, 
                suas áreas de atuação, acesso aos seus currículos lattes e outras informações.
              </p>
            </div>
          </div>
        )}

        <AnimatePresence>
          {messages.map((message) => (
            <ChatBubble
              key={message.id}
              message={message}
              isUser={message.role === "user"}
              playingMessageId={playingMessageId}
              onToggleAudio={handleToggleAudio}
            />
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div 
            className="flex max-w-[80%]"
            initial={false}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.1, ease: "easeOut" }}
          >
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Chat Input */}
      <div className="relative z-50">
        <ChatInput
          value={messageValue}
          onChange={setMessageValue}
          onSend={handleSend}
          isRecording={isRecording}
          recordingDuration={recordingDuration}
          onStartRecording={handleStartRecording}
          onStopRecording={handleStopRecording}
          onCancelRecording={handleCancelRecording}
          audioOutputEnabled={audioOutputEnabled}
          onToggleAudioOutput={handleToggleAudioOutput}
          disabled={isLoading}
          keyboardVisible={false}
          showAudioToggle={true}
        />
      </div>
    </div>
  )
}

// Componente ChatBubble
interface ChatBubbleProps {
  message: any
  isUser: boolean
  playingMessageId: string | null
  onToggleAudio: (messageId: string, audioData: string, format: string) => void
}

function ChatBubble({ message, isUser, playingMessageId, onToggleAudio }: ChatBubbleProps) {
  // Para usuário: mantém o balão sem avatar, alinhado à direita
  if (isUser) {
    return (
      <motion.div 
        className="flex justify-end"
        initial={false}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
      >
        <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-gradient-to-r from-cyan-500/80 to-teal-400/80 backdrop-blur-sm border border-cyan-400/30 text-white shadow-lg" style={{ willChange: 'auto' }}>
          <div className="text-base leading-relaxed">
            <ReactMarkdown
              components={{
                p: ({ children }) => <span>{children}</span>,
                strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        </div>
      </motion.div>
    )
  }

  // Para IA: com formatação markdown
  return (
    <motion.div 
      className="flex max-w-[80%]"
      initial={false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
    >
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/10 text-white shadow-lg" style={{ willChange: 'auto' }}>
        <div className="text-base leading-relaxed">
          <ReactMarkdown
            components={{
              p: ({ children }) => <span>{children}</span>,
              strong: ({ children }) => <strong className="font-bold">{children}</strong>,
              em: ({ children }) => <em className="italic">{children}</em>,
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
        
        {/* Botão de áudio se disponível */}
        {message.audioUrl && (
          <div className="mt-3 flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleAudio(message.id, message.audioUrl!, message.audioFormat || 'mp3')}
              className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10 p-1 h-8 w-8"
            >
              {playingMessageId === message.id ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>
            <span className="text-xs text-white/60">Áudio disponível</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}
