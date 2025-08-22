"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Globe, QrCode, Image as ImageIcon, GraduationCap, Users, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from 'react-markdown';

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { v4 as uuidv4 } from 'uuid';
import { api } from '@/services/api';
import { Keyboard } from '@capacitor/keyboard';
import { ChatInput } from "@/components/ChatInput";
import { useChatContext } from '@/contexts/ChatContext';

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
  attachments?: Attachment[];
  audioUrl?: string;
  audioFormat?: string;
  timestamp: Date;
}

interface SuggestedAction {
  id: string;
  text: string;
  icon?: React.ReactNode;
}

// Componente de fundo animado separado para evitar re-renders
const AcademicBackground = React.memo(() => {
  // Posições fixas para as partículas (calculadas uma vez) - REDUZIDO PARA PERFORMANCE
  const particles = React.useMemo(() => 
    Array.from({ length: 6 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: 4 + Math.random() * 3,
      delay: Math.random() * 2,
    })), []
  );

  return (
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
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute w-2 h-2 bg-cyan-400 rounded-full"
            style={{
              left: `${particle.left}%`,
              top: `${particle.top}%`,
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
  );
});

AcademicBackground.displayName = 'AcademicBackground';

interface AudioPlayerProps {
  audioBase64: string;
  audioFormat?: string;
  className?: string;
  messageId?: string;
  isPlaying?: boolean;
  onTogglePlay?: (messageId?: string) => void;
}

function AudioPlayer({ audioBase64, audioFormat = 'mp3', className, messageId, isPlaying = false, onTogglePlay }: AudioPlayerProps) {
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioBase64) {
      // Decodificar Base64 para criar URL
      try {
        const audioBytes = atob(audioBase64);
        const audioArray = new Uint8Array(audioBytes.length);
        for (let i = 0; i < audioBytes.length; i++) {
          audioArray[i] = audioBytes.charCodeAt(i);
        }
        const audioBlob = new Blob([audioArray], { type: `audio/${audioFormat}` });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
        }

        return () => URL.revokeObjectURL(audioUrl);
      } catch (error) {
        console.error('Erro ao decodificar áudio:', error);
      }
    }
  }, [audioBase64, audioFormat]);

  const togglePlay = () => {
    if (onTogglePlay) {
      onTogglePlay(messageId);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn("flex items-center gap-2 bg-white/5 backdrop-blur-sm rounded-lg p-2 border border-white/10", className)}>
      <Button
        variant="ghost"
        size="icon"
        onClick={togglePlay}
        className="w-8 h-8 rounded-full hover:bg-white/10 text-white/70 hover:text-white"
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </Button>
      <div className="flex-1 text-xs text-white/60">
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>
      <audio
        ref={audioRef}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration);
          }
        }}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }}
      />
    </div>
  );
}

interface ChatBubbleProps {
  message: ChatMessage;
  isUser: boolean;
  playingMessageId?: string | null;
  onToggleAudio?: (messageId: string, audioBase64: string, audioFormat?: string) => void;
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
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/10" style={{ willChange: 'auto' }}>
        {message.attachments && message.attachments.length > 0 && (
          <div className="mb-3 space-y-2">
            {message.attachments.map((attachment, index) => (
              <div key={index} className="rounded-lg overflow-hidden">
                {attachment.contentType.startsWith('image/') ? (
                  <img 
                    src={attachment.url} 
                    alt={attachment.name}
                    className="max-w-full h-auto rounded-lg"
                  />
                ) : attachment.name.toLowerCase().includes('qr') ? (
                  <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg flex items-center gap-2 border border-white/20">
                    <QrCode className="w-5 h-5 text-white/70" />
                    <span className="text-sm text-white/80">QR Code: {attachment.name}</span>
                  </div>
                ) : (
                  <div className="bg-white/10 backdrop-blur-sm p-3 rounded-lg flex items-center gap-2 border border-white/20">
                    <span className="text-sm text-white/80">{attachment.name}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        <div className="text-base leading-relaxed text-white mb-2">
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
        
        {message.audioUrl && onToggleAudio && (
          <div className="mt-3">
            <div className="flex items-center gap-2 rounded-lg p-2 bg-white/5 backdrop-blur-sm border border-white/10 w-fit">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onToggleAudio(message.id, message.audioUrl!, message.audioFormat)}
                className="w-8 h-8 rounded-full hover:bg-white/10 text-white/70 hover:text-white"
              >
                {playingMessageId === message.id ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </Button>
              <div className="flex-1 text-sm text-white/60">
                {playingMessageId === message.id ? "Reproduzindo..." : "Clique para ouvir"}
              </div>
              <div className="text-sm text-white/50">
                🔊
              </div>
            </div>
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
    <div className="flex flex-wrap gap-1.5 mb-3">
      {actions.map((action) => (
        <motion.div
          key={action.id}
          initial={false}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: parseInt(action.id) * 0.05 }}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelectAction(action)}
            className="rounded-full text-xs h-6 px-2.5 bg-white/10 backdrop-blur-sm hover:bg-white/20 border border-white/30 text-white/90 hover:text-white shadow-lg hover:shadow-xl transition-all duration-200"
          >
            {action.icon && <span className="mr-1 text-cyan-300">{action.icon}</span>}
            {action.text}
          </Button>
        </motion.div>
      ))}
    </div>
  );
}

interface ModernChatInterfaceProps {
  onResetChat?: () => void; // Callback para notificar quando chat é resetado
  resetTrigger?: number; // Trigger para resetar o chat externamente
}

export default function ModernChatInterface({ onResetChat, resetTrigger }: ModernChatInterfaceProps = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Contexto para mensagem pendente e estados compartilhados
  const { 
    pendingMessage, 
    clearPendingMessage,
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
  const lastResetTriggerRef = useRef<number>(0);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Processar mensagem pendente quando o componente montar
  useEffect(() => {
    if (pendingMessage) {
      console.log("Processando mensagem pendente:", pendingMessage);
      // Simular o envio da mensagem automaticamente
      setTimeout(() => {
        handleSendMessage(pendingMessage);
        clearPendingMessage();
      }, 500); // Pequeno delay para a transição visual
    }
  }, [pendingMessage, clearPendingMessage]);

  // Função para enviar mensagem com texto específico
  const handleSendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim()) return;
    
    // Proteção contra envio duplicado
    const currentTime = Date.now();
    const messageContent = messageText.trim();
    
    // Evitar envio da mesma mensagem em menos de 2 segundos
    if (lastSentMessageRef.current === messageContent && 
        currentTime - lastSentTimeRef.current < 2000) {
      console.log('Envio duplicado bloqueado');
      return;
    }
    
    // Não enviar se já está processando
    if (isLoading) {
      console.log('Envio bloqueado - já processando');
      return;
    }
    
    // Atualizar referências de controle
    lastSentMessageRef.current = messageContent;
    lastSentTimeRef.current = currentTime;

    const userMessage: ChatMessage = {
      id: uuidv4(),
      content: messageContent,
      role: "user",
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Enviar mensagem para o backend usando o endpoint apropriado
      const response = await api.sendChatMessage(messageContent, audioOutputEnabled);
      
      // Adicionar resposta do assistente
      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        content: response.text,
        role: "assistant",
        timestamp: new Date(),
        audioUrl: response.audio,
        audioFormat: response.audioFormat
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Se há áudio e TTS está habilitado, reproduzir automaticamente
      if (response.audio && audioOutputEnabled) {
        playAudio(response.audio, response.audioFormat, assistantMessage.id);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorContent = `Desculpe, ocorreu um erro ao processar sua mensagem`;
      
      const errorMessage: ChatMessage = {
        id: uuidv4(),
        content: errorContent,
        role: "assistant",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [audioOutputEnabled, isLoading]);

  const suggestedActions: SuggestedAction[] = [
    { id: "1", text: "Trabalhos sobre estatística"},
    { id: "2", text: "Fale sobre professores do departamento de matemática"},
    { id: "3", text: "Quais professores trabalham com física quântica?"},
    { id: "4", text: "Quero saber mais sobre o professor Pavão"}
  ];

  // Configurar listeners do teclado
  useEffect(() => {
    const setupKeyboardListeners = async () => {
      try {
        // Listener para quando o teclado aparecer
        await Keyboard.addListener('keyboardWillShow', (info) => {
          console.log('Keyboard will show with height:', info.keyboardHeight);
          console.log('Setting keyboard visible to true');
          setKeyboardVisible(true);
          setKeyboardHeight(info.keyboardHeight || 280); // Fallback height
          
          // Garantir que o input fique visível
          setTimeout(() => {
            console.log('Input should now be positioned at bottom:', info.keyboardHeight);
            if (chatContainerRef.current) {
              const container = chatContainerRef.current;
              const messagesArea = container.querySelector('.overflow-y-auto');
              if (messagesArea) {
                messagesArea.scrollTop = messagesArea.scrollHeight;
              }
            }
          }, 350); // Aguardar a transição completar
        });

        // Listener para quando o teclado desaparecer
        await Keyboard.addListener('keyboardWillHide', () => {
          console.log('Keyboard will hide');
          setKeyboardVisible(false);
          setKeyboardHeight(0);
        });
      } catch (error) {
        console.log('Capacitor Keyboard not available, using fallback detection:', error);
        
        // Fallback: detectar mudanças no viewport para dispositivos móveis
        const initialViewportHeight = window.visualViewport?.height || window.innerHeight;
        
                 const handleViewportChange = () => {
           const currentHeight = window.visualViewport?.height || window.innerHeight;
           const heightDifference = initialViewportHeight - currentHeight;
           
           if (heightDifference > 150) { // Teclado provavelmente apareceu
             console.log('Keyboard detected via viewport change, height difference:', heightDifference);
             console.log('Setting keyboard visible to true via fallback');
             setKeyboardVisible(true);
             // Usar altura detectada ou mínimo de 280px
             setKeyboardHeight(Math.max(heightDifference, 280));
           } else {
             console.log('Keyboard hidden via viewport change');
             setKeyboardVisible(false);
             setKeyboardHeight(0);
           }
         };

        // Usar visualViewport se disponível, senão window resize
        if (window.visualViewport) {
          window.visualViewport.addEventListener('resize', handleViewportChange);
        } else {
          window.addEventListener('resize', handleViewportChange);
        }

        return () => {
          if (window.visualViewport) {
            window.visualViewport.removeEventListener('resize', handleViewportChange);
          } else {
            window.removeEventListener('resize', handleViewportChange);
          }
        };
      }
    };

    setupKeyboardListeners();

    return () => {
      // Cleanup listeners
      Keyboard.removeAllListeners();
    };
  }, []);

  // Função para reproduzir áudio a partir de Base64
  const playAudio = (audioBase64: string, format: string = 'mp3', messageId?: string) => {
    try {
      // Se o mesmo áudio está tocando, pausar
      if (currentAudio && playingMessageId === messageId) {
        currentAudio.pause()
        currentAudio.currentTime = 0
        setCurrentAudio(null)
        setPlayingMessageId(null)
        return
      }

      // Parar qualquer áudio que esteja tocando
      if (currentAudio) {
        currentAudio.pause()
        currentAudio.currentTime = 0
        setCurrentAudio(null)
        setPlayingMessageId(null)
      }

      // Decodificar Base64 para bytes
      const audioBytes = atob(audioBase64)
      const audioArray = new Uint8Array(audioBytes.length)
      for (let i = 0; i < audioBytes.length; i++) {
        audioArray[i] = audioBytes.charCodeAt(i)
      }
      
      // Criar blob de áudio
      const audioBlob = new Blob([audioArray], { type: `audio/${format}` })
      const audioUrl = URL.createObjectURL(audioBlob)
      
      // Criar e reproduzir elemento audio
      const audio = new Audio(audioUrl)
      setCurrentAudio(audio)
      if (messageId) {
        setPlayingMessageId(messageId)
      }
      
      audio.play()
      
      // Limpar URL quando terminar ou parar
      const cleanup = () => {
        URL.revokeObjectURL(audioUrl)
        setCurrentAudio(null)
        setPlayingMessageId(null)
      }
      
      audio.onended = cleanup
      audio.onerror = cleanup
      
    } catch (error) {
      console.error('Erro ao reproduzir áudio:', error)
      setCurrentAudio(null)
      setPlayingMessageId(null)
    }
  }

  const handleSend = useCallback(async () => {
    if (!inputValue.trim()) return;
    
    const messageContent = inputValue.trim();
    setInputValue(""); // Limpar input imediatamente
    
    // Usar a função handleSendMessage para processar a mensagem
    await handleSendMessage(messageContent);
  }, [inputValue, handleSendMessage]);

  const handleStartRecording = useCallback(() => {
    setIsRecording(true);
    setRecordingDuration(0);
    recordingIntervalRef.current = setInterval(() => {
      setRecordingDuration(recordingDuration + 1);
        // Limite de 30 segundos - cancelar gravação automaticamente
      if (recordingDuration >= 29) {
          // Parar gravação
          setIsRecording(false);
          if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current);
          }
          setRecordingDuration(0);
        }
    }, 1000);
  }, [setIsRecording, setRecordingDuration, recordingDuration]);

  const handleStopRecording = useCallback(async (audioBlob: Blob) => {
    setIsRecording(false);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
    setRecordingDuration(0);

    // Proteção contra processamento duplo
    if (isLoading) {
      console.log('Processamento de áudio bloqueado - já processando');
      return;
    }

    setIsLoading(true);
      try {
        // Converter áudio em texto
        const text = await api.speechToText(audioBlob);
        
        // Adicionar mensagem do usuário
        const userMessage: ChatMessage = {
          id: uuidv4(),
          content: text,
          role: "user",
          timestamp: new Date()
        };
        setMessages(prev => [...prev, userMessage]);

        // Enviar mensagem para o backend
        const response = await api.sendChatMessage(text, audioOutputEnabled);
        
        // Adicionar resposta do assistente
        const assistantMessage: ChatMessage = {
          id: uuidv4(),
          content: response.text,
          role: "assistant",
          timestamp: new Date(),
          audioUrl: response.audio,
          audioFormat: response.audioFormat
        };
        setMessages(prev => [...prev, assistantMessage]);
        
        // Se há áudio e TTS está habilitado, reproduzir automaticamente
        if (response.audio && audioOutputEnabled) {
          playAudio(response.audio, response.audioFormat, assistantMessage.id);
        }
      } catch (error) {
        console.error('Error processing audio:', error);
        
        const errorContent = `Desculpe, não consegui processar o áudio`;
        
        const errorMessage: ChatMessage = {
          id: uuidv4(),
          content: errorContent,
          role: "assistant",
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
  }, [isLoading, audioOutputEnabled, setIsRecording, setRecordingDuration]);

  const handleCancelRecording = useCallback(() => {
    setIsRecording(false);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
    setRecordingDuration(0);
  }, [setIsRecording, setRecordingDuration]);

  const handleSelectAction = useCallback((action: SuggestedAction) => {
    setInputValue(action.text);
  }, []);

  const handleToggleAudio = useCallback((messageId: string, audioBase64: string, audioFormat?: string) => {
    playAudio(audioBase64, audioFormat, messageId);
  }, [currentAudio, playingMessageId]);

  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (currentAudio) {
        currentAudio.pause();
        setCurrentAudio(null);
      }
    };
  }, [currentAudio]);

  const showSuggestedActions = messages.length === 0 && !inputValue && !isRecording;

  // Effect para escutar mudanças no resetTrigger - versão estável
  useEffect(() => {
    if (resetTrigger && resetTrigger > 0 && resetTrigger !== lastResetTriggerRef.current) {
      lastResetTriggerRef.current = resetTrigger;
      
      // Parar qualquer áudio que esteja tocando
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        setCurrentAudio(null);
        setPlayingMessageId(null);
      }

      // Parar gravação se estiver ativa
      if (isRecording && recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        setIsRecording(false);
        setRecordingDuration(0);
      }

      // Limpar todas as mensagens e resetar estado
      setMessages([]);
      setInputValue("");
      setIsLoading(false);
      setAudioOutputEnabled(false);
      
      // Resetar referências de controle
      lastSentMessageRef.current = '';
      lastSentTimeRef.current = 0;

      // Notificar componente pai se callback foi fornecido
      if (onResetChat) {
        onResetChat();
      }
    }
     }, [resetTrigger, onResetChat]); // resetTrigger e onResetChat como dependências

  return (
    <div 
      ref={chatContainerRef}
      className={cn(
        "flex flex-col max-w-4xl mx-auto relative overflow-hidden",
        "mobile-vh keyboard-transition mobile-optimized",
        keyboardVisible && "compact-layout"
      )}
      style={{
        height: keyboardVisible 
          ? `calc(100vh - ${keyboardHeight}px)` 
          : '100vh',
        transition: 'height 0.3s ease-in-out'
      }}
    >
      {/* Academic Background Pattern */}
      <AcademicBackground />

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
              Assistente Virtual do CCEN
            </h1>
            <p className="text-sm text-white/70">Conheça os professores do CCEN</p>
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
        {showSuggestedActions && (
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
