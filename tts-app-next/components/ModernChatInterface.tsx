"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, X, Play, Pause, Volume2, VolumeX, Send, Globe, QrCode, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import ReactMarkdown from 'react-markdown';

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { v4 as uuidv4 } from 'uuid';
import { api } from '@/services/api';

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

interface AudioRecorderProps {
  onStart?: () => void;
  onStop?: () => void;
  onCancel?: () => void;
  isRecording: boolean;
  duration: number;
}

function AudioRecorder({ onStart, onStop, onCancel, isRecording, duration }: AudioRecorderProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-2">
      {!isRecording ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={onStart}
          className="rounded-full hover:bg-gray-100"
        >
          <Mic className="w-5 h-5" />
        </Button>
      ) : (
        <div className="flex items-center gap-2 bg-red-50 rounded-full px-3 py-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-mono text-red-600">{formatTime(duration)}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onStop}
            className="w-8 h-8 rounded-full hover:bg-red-100"
          >
            <Square className="w-4 h-4 fill-current" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
            className="w-8 h-8 rounded-full hover:bg-red-100"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

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
    <div className={cn("flex items-center gap-2 bg-gray-50 rounded-lg p-2", className)}>
      <Button
        variant="ghost"
        size="icon"
        onClick={togglePlay}
        className="w-8 h-8 rounded-full"
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </Button>
      <div className="flex-1 text-xs text-gray-600">
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
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-blue-500 text-white">
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
      </div>
    );
  }

  // Para IA: apenas o texto simples
  return (
    <div className="max-w-[80%] mr-auto">
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
                <div className="bg-white p-4 rounded-lg flex items-center gap-2">
                  <QrCode className="w-5 h-5" />
                  <span className="text-sm text-gray-700">QR Code: {attachment.name}</span>
                </div>
              ) : (
                <div className="bg-gray-100 p-3 rounded-lg flex items-center gap-2">
                  <span className="text-sm">{attachment.name}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      <div className="text-base leading-relaxed text-gray-900 mb-2">
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
          <div className="flex items-center gap-2 rounded-lg p-2 bg-gray-50 w-fit">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onToggleAudio(message.id, message.audioUrl!, message.audioFormat)}
              className="w-8 h-8 rounded-full hover:bg-gray-200"
            >
              {playingMessageId === message.id ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>
            <div className="flex-1 text-sm opacity-70">
              {playingMessageId === message.id ? "Reproduzindo..." : "Clique para ouvir"}
            </div>
            <div className="text-sm opacity-50">
              🔊
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface SuggestedActionsProps {
  actions: SuggestedAction[];
  onSelectAction: (action: SuggestedAction) => void;
}

function SuggestedActions({ actions, onSelectAction }: SuggestedActionsProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {actions.map((action) => (
        <Button
          key={action.id}
          variant="outline"
          size="sm"
          onClick={() => onSelectAction(action)}
          className="rounded-full text-sm h-8 px-3 bg-white hover:bg-gray-50 border-gray-200"
        >
          {action.icon && <span className="mr-1">{action.icon}</span>}
          {action.text}
        </Button>
      ))}
    </div>
  );
}

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isRecording: boolean;
  recordingDuration: number;
  onStartRecording: () => void;
  onStopRecording: (audioBlob: Blob) => void;
  onCancelRecording: () => void;
  audioOutputEnabled: boolean;
  onToggleAudioOutput: (enabled: boolean) => void;
  disabled?: boolean;
}

function ChatInput({
  value,
  onChange,
  onSend,
  isRecording,
  recordingDuration,
  onStartRecording,
  onStopRecording,
  onCancelRecording,
  audioOutputEnabled,
  onToggleAudioOutput,
  disabled = false
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) {
        onSend();
      }
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/wav' });
        onStopRecording(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      onStartRecording();
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = null;
      const stream = mediaRecorderRef.current.stream;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      chunksRef.current = [];
      onCancelRecording();
    }
  };

  return (
    <div className="border-t bg-white p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Resposta com áudio</span>
          <Switch
            checked={audioOutputEnabled}
            onCheckedChange={onToggleAudioOutput}
          />
          {audioOutputEnabled ? (
            <Volume2 className="w-4 h-4 text-green-600" />
          ) : (
            <VolumeX className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      <div className="relative">
        <div className="flex items-end gap-2 bg-gray-50 rounded-2xl p-3">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem..."
            className="flex-1 min-h-[40px] max-h-[120px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 py-2 px-1 text-base leading-6"
            rows={1}
            disabled={disabled || isRecording}
          />

          <div className="flex items-center gap-2 shrink-0">
            <AudioRecorder
              isRecording={isRecording}
              duration={recordingDuration}
              onStart={startRecording}
              onStop={stopRecording}
              onCancel={cancelRecording}
            />
            
            {!isRecording && (
              <Button
                onClick={onSend}
                disabled={!value.trim() || disabled}
                size="icon"
                className="rounded-full"
              >
                <Send className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
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
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioOutputEnabled, setAudioOutputEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);

  const recordingIntervalRef = useRef<NodeJS.Timeout>();
  const lastSentMessageRef = useRef<string>('');
  const lastSentTimeRef = useRef<number>(0);

  const suggestedActions: SuggestedAction[] = [
    { id: "1", text: "Trabalhos sobre matemática discreta"},
    { id: "2", text: "Fale sobre professores do departamento de matemática"},
    { id: "3", text: "Quais professores trabalham com física quântica?"},
    { id: "4", text: "Quero saber mais sobre o professor Pavão"}
  ];

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
    
    // Proteção contra envio duplicado
    const currentTime = Date.now();
    const messageContent = inputValue.trim();
    
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
    setInputValue("");
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
      //: ${error instanceof Error ? error.message : 'Erro desconhecido'}
      
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
  }, [inputValue, audioOutputEnabled, isLoading]);

  const handleStartRecording = useCallback(() => {
    setIsRecording(true);
    setRecordingDuration(0);
    recordingIntervalRef.current = setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);
  }, []);

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
        //${error instanceof Error ? error.message : 'Erro desconhecido'}
        
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
  }, [isLoading, audioOutputEnabled]);

  const handleCancelRecording = useCallback(() => {
    setIsRecording(false);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
    setRecordingDuration(0);
  }, []);

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

  // Função para resetar completamente o chat
  const resetChat = useCallback(() => {
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
  }, [currentAudio, isRecording, onResetChat]);

  // Effect para escutar mudanças no resetTrigger
  useEffect(() => {
    if (resetTrigger && resetTrigger > 0) {
      resetChat();
    }
  }, [resetTrigger, resetChat]);

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-white">
      {/* Header */}
      <div className="border-b bg-white p-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Assistente Virtual do CCEN</h1>
            <p className="text-sm text-gray-500">Conheça os professores do CCEN</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
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
          <div className="flex max-w-[80%]">
            <div className="bg-gray-100 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Suggested Actions */}
      <AnimatePresence>
        {showSuggestedActions && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="px-4"
          >
            <SuggestedActions
              actions={suggestedActions}
              onSelectAction={handleSelectAction}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
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
      />
    </div>
  );
} 