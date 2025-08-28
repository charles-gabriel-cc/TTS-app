"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { v4 as uuidv4 } from 'uuid';
import { api } from '@/services/api';
import { Keyboard } from '@capacitor/keyboard';
import { ChatInput } from "@/components/ChatInput";
import { useChatContext } from '@/contexts/ChatContext';
import { useIdleContext } from '@/contexts/IdleContext';

interface Attachment {
  url: string;
  name: string;
  contentType: string;
  size: number;
}

interface ChatMessage {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  audioUrl?: string;
  audioFormat?: string;
}

interface SuggestedAction {
  id: string;
  text: string;
}

interface ChatBubbleProps {
  message: ChatMessage;
  isUser: boolean;
  playingMessageId: string | null;
  onToggleAudio: (messageId: string, audioBase64: string, audioFormat?: string) => void;
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
    );
  }

  // Para IA: apenas o texto simples
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
              onClick={() => onToggleAudio(message.id, message.audioUrl!, message.audioFormat)}
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
  );
}

interface SuggestedActionsProps {
  actions: SuggestedAction[];
  onSelectAction: (action: SuggestedAction) => void;
}

function SuggestedActions({ actions, onSelectAction }: SuggestedActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <motion.div
          key={action.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelectAction(action)}
            className="bg-white/5 border-white/20 text-white hover:bg-white/10 backdrop-blur-sm"
          >
            {action.text}
          </Button>
        </motion.div>
      ))}
    </div>
  );
}

interface ChatSessionProps {
  sessionId?: string; // ID da sessão existente ou undefined para criar nova
  sessionName?: string; // Nome da sessão (usado apenas se sessionId não for fornecido)
  title?: string; // Título personalizado do chat
  description?: string; // Descrição personalizada do chat
  onSessionCreated?: (sessionId: string) => void; // Callback quando nova sessão é criada
  onSessionDeleted?: (sessionId: string) => void; // Callback quando sessão é deletada
  showSuggestedActions?: boolean; // Se deve mostrar ações sugeridas
  customSuggestedActions?: SuggestedAction[]; // Ações sugeridas personalizadas
  className?: string; // Classes CSS adicionais
}

export default function ChatSession({ 
  sessionId,
  sessionName,
  title = "Assistente Virtual do CCEN",
  description = "Conheça os professores do CCEN",
  onSessionCreated,
  onSessionDeleted,
  showSuggestedActions = true,
  customSuggestedActions,
  className
}: ChatSessionProps) {
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Contexto para gerenciamento de sessões
  const { 
    getOrCreateMainChatSession,
    addMessage,
    getSessionMessages,
    getCurrentSession,
    pendingMessage, 
    clearPendingMessage,
    isGlobalLoading,
    setIsGlobalLoading,
    setShouldApplyGlobalLoading,
    audioOutputEnabled,
    setAudioOutputEnabled,
    isRecording,
    setIsRecording,
    recordingDuration,
    setRecordingDuration
  } = useChatContext();

  const recordingIntervalRef = useRef<NodeJS.Timeout>();
  const lastSentMessageRef = useRef<string>('');
  const lastSentTimeRef = useRef<number>(0);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Contexto para resetar timer de inatividade
  const { resetIdleTimer } = useIdleContext();

  // Usar sessão fixa do chat principal
  const effectiveSessionId = getOrCreateMainChatSession();
  const messages = getSessionMessages(effectiveSessionId);
  const currentSession = getCurrentSession();

  // Notificar criação da sessão se necessário
  useEffect(() => {
    if (onSessionCreated) {
      onSessionCreated(effectiveSessionId);
    }
  }, [effectiveSessionId, onSessionCreated]);

  // Desabilitar loading global para este chat (chat completo)
  useEffect(() => {
    setShouldApplyGlobalLoading(false);
    return () => {
      setShouldApplyGlobalLoading(true);
    };
  }, [setShouldApplyGlobalLoading]);

  // Processar mensagem pendente quando o componente montar
  useEffect(() => {
    if (pendingMessage && effectiveSessionId) {
      console.log("Processando mensagem pendente:", pendingMessage);
      setTimeout(() => {
        handleSendMessage(pendingMessage);
        clearPendingMessage();
      }, 500);
    }
  }, [pendingMessage, effectiveSessionId, clearPendingMessage]);

  // Função para enviar mensagem
  const handleSendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || !effectiveSessionId) return;
    
    const currentTime = Date.now();
    const messageContent = messageText.trim();
    
    // Proteção contra envio duplicado
    if (lastSentMessageRef.current === messageContent && 
        currentTime - lastSentTimeRef.current < 2000) {
      console.log('Envio duplicado bloqueado');
      return;
    }
    
    if (isLoading) {
      console.log('Envio bloqueado - já processando');
      return;
    }
    
    // Resetar timer de inatividade quando enviar mensagem
    resetIdleTimer();
    
    lastSentMessageRef.current = messageContent;
    lastSentTimeRef.current = currentTime;

    const userMessage: ChatMessage = {
      id: uuidv4(),
      content: messageContent,
      role: "user",
      timestamp: new Date()
    };

    addMessage(effectiveSessionId, userMessage);
    setIsLoading(true);
    setIsGlobalLoading(true);

    try {
      const response = await api.sendChatMessage(messageContent, audioOutputEnabled);
      
      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        content: response.text,
        role: "assistant",
        timestamp: new Date(),
        audioUrl: response.audio,
        audioFormat: response.audioFormat
      };
      
      addMessage(effectiveSessionId, assistantMessage);
      
      if (response.audio && audioOutputEnabled) {
        playAudio(response.audio, response.audioFormat, assistantMessage.id);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: ChatMessage = {
        id: uuidv4(),
        content: "Desculpe, ocorreu um erro ao processar sua mensagem",
        role: "assistant",
        timestamp: new Date()
      };
      addMessage(effectiveSessionId, errorMessage);
    } finally {
      setIsLoading(false);
      setIsGlobalLoading(false);
    }
  }, [effectiveSessionId, isLoading, audioOutputEnabled, addMessage]);

  // Funções de áudio
  const playAudio = useCallback((audioBase64: string, audioFormat: string = 'mp3', messageId: string) => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }

    const audio = new Audio(`data:audio/${audioFormat};base64,${audioBase64}`);
    audio.addEventListener('ended', () => {
      setPlayingMessageId(null);
      setCurrentAudio(null);
    });

    audio.play().catch(console.error);
    setCurrentAudio(audio);
    setPlayingMessageId(messageId);
  }, [currentAudio]);

  const handleToggleAudio = useCallback((messageId: string, audioBase64: string, audioFormat?: string) => {
    if (playingMessageId === messageId) {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        setCurrentAudio(null);
      }
      setPlayingMessageId(null);
    } else {
      playAudio(audioBase64, audioFormat || 'mp3', messageId);
    }
  }, [playingMessageId, currentAudio, playAudio]);

  // Funções de gravação
  const handleStartRecording = useCallback(async () => {
    try {
      setIsRecording(true);
      setRecordingDuration(0);
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Erro ao iniciar gravação:', error);
      setIsRecording(false);
    }
  }, []);

  const handleStopRecording = useCallback(async (audioBlob: Blob) => {
    try {
      setIsRecording(false);
      setRecordingDuration(0);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }

      // Ativar loading global imediatamente para bloquear navegação
      setIsGlobalLoading(true);

      const transcribedText = await api.speechToText(audioBlob);
      if (transcribedText.trim()) {
        handleSendMessage(transcribedText);
      }
    } catch (error) {
      console.error('Erro ao processar áudio:', error);
      setIsRecording(false);
      setRecordingDuration(0);
      setIsGlobalLoading(false); // Desativar loading em caso de erro
    }
  }, [handleSendMessage, setIsGlobalLoading]);

  const handleCancelRecording = useCallback(() => {
    setIsRecording(false);
    setRecordingDuration(0);
    
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
  }, []);

  // Funções de envio
  const handleSend = useCallback(() => {
    if (inputValue.trim()) {
      handleSendMessage(inputValue.trim());
      setInputValue("");
    }
  }, [inputValue, handleSendMessage]);

  const handleSelectAction = useCallback((action: SuggestedAction) => {
    handleSendMessage(action.text);
  }, [handleSendMessage]);

  // Configurar listeners do teclado
  useEffect(() => {
    const setupKeyboardListeners = async () => {
      try {
        await Keyboard.addListener('keyboardWillShow', (info) => {
          setKeyboardVisible(true);
          setKeyboardHeight(info.keyboardHeight);
        });

        await Keyboard.addListener('keyboardWillHide', () => {
          setKeyboardVisible(false);
          setKeyboardHeight(0);
        });
      } catch (error) {
        console.warn('Keyboard listeners não disponíveis (não é dispositivo móvel)');
      }
    };

    setupKeyboardListeners();

    return () => {
      Keyboard.removeAllListeners();
    };
  }, []);

  // Limpeza ao desmontar
  useEffect(() => {
    return () => {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, [currentAudio]);

  const suggestedActions: SuggestedAction[] = customSuggestedActions || [
    { id: "1", text: "Conte-me sobre os professores do CCEN"},
    { id: "2", text: "Quais são as áreas de pesquisa do departamento?"},
    { id: "3", text: "Como posso acessar os currículos dos professores?"},
    { id: "4", text: "Fale sobre as publicações científicas"}
  ];



  return (
    <div 
      ref={chatContainerRef}
      className={cn(
        "flex flex-col max-w-4xl mx-auto relative overflow-hidden",
        "mobile-vh keyboard-transition mobile-optimized",
        keyboardVisible && "compact-layout",
        className
      )}
      style={{
        height: keyboardVisible 
          ? `calc(100vh - ${keyboardHeight}px)` 
          : '100vh',
        transition: 'height 0.3s ease-in-out'
      }}
    >


      {/* Header */}
      <motion.div 
        className="border-b border-white/10 bg-black/20 backdrop-blur-xl p-4 relative z-10"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-semibold text-white flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-cyan-400" />
              {title}
            </h1>
            <p className="text-sm text-white/70">{description}</p>
            {currentSession && (
              <p className="text-xs text-white/50 mt-1">
                Sessão: {currentSession.name} ({messages.length} mensagens)
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Messages */}
      <div 
        className={cn(
          "flex-1 overflow-y-auto p-4 space-y-6 relative z-10 mobile-optimized",
          keyboardVisible && "pb-2"
        )} 
        style={{ 
          willChange: 'transform',
          maxHeight: keyboardVisible 
            ? `calc(100vh - ${keyboardHeight + 160}px)` 
            : 'calc(100vh - 160px)'
        }}
      >
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

      {/* Suggested Actions */}
      <AnimatePresence mode="wait">
        {showSuggestedActions && messages.length === 0 && (
          <motion.div
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="px-4 relative z-10"
          >
            <SuggestedActions
              actions={suggestedActions}
              onSelectAction={handleSelectAction}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div 
        className={cn(
          "relative",
          keyboardVisible ? "fixed left-0 right-0 z-[9999]" : "z-50"
        )}
        style={{
          bottom: keyboardVisible ? `${keyboardHeight}px` : undefined
        }}
      >
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSend}
          isRecording={isRecording}
          recordingDuration={recordingDuration}
          onStartRecording={handleStartRecording}
          onStopRecording={handleStopRecording}
          onCancelRecording={handleCancelRecording}
          audioOutputEnabled={audioOutputEnabled}
          onToggleAudioOutput={setAudioOutputEnabled}
          disabled={isLoading}
          keyboardVisible={keyboardVisible}
          showAudioToggle={true}
        />
      </div>
    </div>
  );
}
