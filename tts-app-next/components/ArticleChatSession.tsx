'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { ChatInput } from '@/components/ChatInput'
import { useChatContext } from '@/contexts/ChatContext'
import { useIdleContext } from '@/contexts/IdleContext'
import { api } from '@/services/api'
import { motion, AnimatePresence } from 'framer-motion'
import { GraduationCap, MessageCircle, ArrowLeft, Play, Pause } from 'lucide-react'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'

interface ArticleChatSessionProps {
  professorName: string
  articleTitle?: string
  onBackToGallery: () => void
}

export default function ArticleChatSession({ 
  professorName, 
  articleTitle, 
  onBackToGallery 
}: ArticleChatSessionProps) {
  const [messageValue, setMessageValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  
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
    getOrCreateArticleSession,
    addMessage,
    getSessionMessages
  } = useChatContext()

  const { resetIdleTimer } = useIdleContext()

  // Usar sessão fixa para este artigo específico
  const articleSessionId = getOrCreateArticleSession(professorName, articleTitle)
  const messages = getSessionMessages(articleSessionId)

  // Desabilitar loading global para este chat (chat de artigos)
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
    if (!message.trim() || isLoading || !articleSessionId) return

    console.log('[ArticleChatSession] handleSendMessage chamado:', message)
    resetIdleTimer()
    setIsLoading(true)

    // Adicionar mensagem do usuário
    const userMessage = {
      id: Date.now().toString(),
      content: message,
      role: 'user' as const,
      timestamp: new Date()
    }

    addMessage(articleSessionId, userMessage)
    setMessageValue("")
    setIsGlobalLoading(true)

    try {
      // Enviar mensagem para o chat de artigos
      const response = await api.sendArticleChatMessage(message, professorName, audioOutputEnabled)
      
      // Adicionar resposta do assistente
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        content: response.text,
        role: 'assistant' as const,
        timestamp: new Date(),
        audioUrl: response.audio,
        audioFormat: response.audioFormat
      }

      addMessage(articleSessionId, assistantMessage)

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

      addMessage(articleSessionId, errorMessage)
    } finally {
      setIsLoading(false)
      setIsGlobalLoading(false)
    }
  }, [isLoading, audioOutputEnabled, professorName, resetIdleTimer, articleSessionId, addMessage])



  const playAudio = useCallback((audioData: string, format: string, messageId: string) => {
    if (audioRef.current) {
      audioRef.current.pause()
    }

    const audio = new Audio(`data:audio/${format};base64,${audioData}`)
    audioRef.current = audio

    audio.onplay = () => setPlayingMessageId(messageId)
    audio.onended = () => setPlayingMessageId(null)
    audio.onerror = () => setPlayingMessageId(null)

    audio.play().catch(error => {
      console.error('Erro ao reproduzir áudio:', error)
      setPlayingMessageId(null)
    })
  }, [])

  const handleToggleAudio = useCallback((messageId: string, audioData: string, format: string) => {
    if (playingMessageId === messageId) {
      if (audioRef.current) {
        audioRef.current.pause()
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

    // Ativar loading global imediatamente para bloquear navegação
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
    resetIdleTimer()
    // Parar áudio antes de sair
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setPlayingMessageId(null)
    onBackToGallery()
  }, [resetIdleTimer, onBackToGallery])

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <motion.div 
        className="border-b border-white/10 bg-black/20 backdrop-blur-xl p-4 relative z-10"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
                             <Button
                 variant="ghost"
                 size="sm"
                 onClick={handleBackClick}
                 disabled={isLoading}
                 className="text-white/70 hover:text-white hover:bg-white/10 p-1 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 <ArrowLeft className="w-4 h-4" />
               </Button>
              <h1 className="text-lg font-semibold text-white flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-cyan-400" />
                Chat - {professorName}
              </h1>
            </div>
            {articleTitle && (
              <p className="text-sm text-white/70 ml-6">
                Artigo: {articleTitle}
              </p>
            )}
            <p className="text-xs text-white/50 ml-6 mt-1">
              Chat específico sobre artigos do professor
            </p>
          </div>
        </div>
      </motion.div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 relative z-10">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                Chat sobre Artigos
              </h3>
              <p className="text-white/70 max-w-md">
                Faça perguntas sobre os artigos científicos do professor {professorName}. 
                Posso explicar conceitos, metodologias e descobertas de forma acessível.
              </p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <ChatBubble
                          key={message.id}
              message={message}
              isUser={message.role === "user"}
              playingMessageId={playingMessageId}
              onToggleAudio={handleToggleAudio}
          />
        ))}
        
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

      {/* Input */}
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
