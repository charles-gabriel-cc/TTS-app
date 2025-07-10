"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, X, Play, Pause, Volume2, VolumeX, Send, Globe, QrCode, Image as ImageIcon, GraduationCap, Users, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { v4 as uuidv4 } from 'uuid';

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
          className="rounded-full hover:bg-white/10 text-white/70 hover:text-white"
        >
          <Mic className="w-5 h-5" />
        </Button>
      ) : (
        <div className="flex items-center gap-2 bg-red-500/20 rounded-full px-3 py-1 backdrop-blur-sm border border-red-500/30">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
            <span className="text-sm font-mono text-red-300">{formatTime(duration)}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onStop}
            className="w-8 h-8 rounded-full hover:bg-red-500/20 text-red-300 hover:text-red-200"
          >
            <Square className="w-4 h-4 fill-current" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
            className="w-8 h-8 rounded-full hover:bg-red-500/20 text-red-300 hover:text-red-200"
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
  if (isUser) {
  return (
      <motion.div 
        className="flex justify-end"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-gradient-to-r from-cyan-500/80 to-teal-400/80 backdrop-blur-sm border border-cyan-400/30 text-white shadow-lg">
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

  return (
    <motion.div 
      className="max-w-[80%] mr-auto"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
        {message.attachments && message.attachments.length > 0 && (
          <div className="mb-3 space-y-2">
            {message.attachments.map((attachment, index) => (
            <motion.div 
              key={index} 
              className="rounded-lg overflow-hidden backdrop-blur-sm bg-white/5 border border-white/10"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
            >
                {attachment.contentType.startsWith('image/') ? (
                  <img 
                    src={attachment.url} 
                    alt={attachment.name}
                    className="max-w-full h-auto rounded-lg"
                  />
                ) : attachment.name.toLowerCase().includes('qr') ? (
                <div className="bg-white/10 p-4 rounded-lg flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-cyan-400" />
                  <span className="text-sm text-white/80">QR Code: {attachment.name}</span>
                  </div>
                ) : (
                  <div className="bg-white/10 p-3 rounded-lg flex items-center gap-2">
                  <span className="text-sm text-white/80">{attachment.name}</span>
                  </div>
                )}
            </motion.div>
            ))}
          </div>
        )}
        
      <div className="text-base leading-relaxed text-white/90 mb-2 bg-white/5 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/10 shadow-lg">
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
        <motion.div 
          className="mt-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2 rounded-lg p-2 bg-white/5 backdrop-blur-sm w-fit border border-white/10">
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
            <div className="flex-1 text-sm text-white/70">
              {playingMessageId === message.id ? "Reproduzindo..." : "Clique para ouvir"}
            </div>
            <div className="text-sm text-cyan-400">
              🔊
            </div>
          </div>
        </motion.div>
        )}
    </motion.div>
  );
}

interface SuggestedActionsProps {
  actions: SuggestedAction[];
  onSelectAction: (action: SuggestedAction) => void;
}

function SuggestedActions({ actions, onSelectAction }: SuggestedActionsProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {actions.map((action, index) => (
        <motion.div
          key={action.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Button
          variant="outline"
          size="sm"
          onClick={() => onSelectAction(action)}
            className="rounded-full text-sm h-8 px-3 bg-white/5 hover:bg-white/10 border-white/20 hover:border-cyan-400/50 text-white/80 hover:text-white backdrop-blur-sm transition-all duration-300"
        >
          {action.icon && <span className="mr-1">{action.icon}</span>}
          {action.text}
        </Button>
        </motion.div>
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
    <motion.div 
      className="border-t border-white/10 bg-black/20 backdrop-blur-xl p-4"
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center gap-2 text-sm text-white/70">
          <span>Resposta com áudio</span>
          <Switch
            checked={audioOutputEnabled}
            onCheckedChange={onToggleAudioOutput}
          />
          {audioOutputEnabled ? (
            <Volume2 className="w-4 h-4 text-cyan-400" />
          ) : (
            <VolumeX className="w-4 h-4 text-white/40" />
          )}
        </div>
      </div>

      <div className="relative">
        <div className="flex items-end gap-2 bg-white/5 backdrop-blur-sm rounded-2xl p-3 border border-white/10">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem..."
            className="flex-1 min-h-[40px] max-h-[120px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 py-2 px-1 text-base leading-6 text-white placeholder:text-white/40"
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
                className="rounded-full bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-white border-0 shadow-lg"
              >
                <Send className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface ModernChatInterfaceProps {
  onResetChat?: () => void;
  resetTrigger?: number;
}

function ModernChatInterface({ onResetChat, resetTrigger }: ModernChatInterfaceProps = {}) {
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
  const lastResetTriggerRef = useRef<number>(0);

  const suggestedActions: SuggestedAction[] = [
    { id: "1", text: "Trabalhos sobre matemática discreta", icon: <GraduationCap className="w-3 h-3" />},
    { id: "2", text: "Fale sobre professores do departamento de matemática", icon: <Users className="w-3 h-3" />},
    { id: "3", text: "Quais professores trabalham com física quântica?", icon: <MessageCircle className="w-3 h-3" />},
    { id: "4", text: "Quero saber mais sobre o professor Pavão", icon: <Globe className="w-3 h-3" />}
  ];

  const playAudio = (audioBase64: string, format: string = 'mp3', messageId?: string) => {
    try {
      if (currentAudio && playingMessageId === messageId) {
        currentAudio.pause()
        currentAudio.currentTime = 0
        setCurrentAudio(null)
        setPlayingMessageId(null)
        return
      }

      if (currentAudio) {
        currentAudio.pause()
        currentAudio.currentTime = 0
        setCurrentAudio(null)
        setPlayingMessageId(null)
      }

      const audioBytes = atob(audioBase64)
      const audioArray = new Uint8Array(audioBytes.length)
      for (let i = 0; i < audioBytes.length; i++) {
        audioArray[i] = audioBytes.charCodeAt(i)
      }
      
      const audioBlob = new Blob([audioArray], { type: `audio/${format}` })
      const audioUrl = URL.createObjectURL(audioBlob)
      
      const audio = new Audio(audioUrl)
      setCurrentAudio(audio)
      if (messageId) {
        setPlayingMessageId(messageId)
      }
      
      audio.play()
      
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
    
    const currentTime = Date.now();
    const messageContent = inputValue.trim();
    
    if (lastSentMessageRef.current === messageContent && 
        currentTime - lastSentTimeRef.current < 2000) {
      return;
    }
    
    if (isLoading) {
      return;
    }
    
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
      // Simulate API response
    setTimeout(() => {
        const assistantMessage: ChatMessage = {
          id: uuidv4(),
          content: "Obrigado pela sua pergunta! Esta é uma resposta simulada do assistente virtual do CCEN. Em um ambiente real, eu forneceria informações detalhadas sobre os professores e departamentos.",
          role: "assistant",
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        setIsLoading(false);
      }, 1500);
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: ChatMessage = {
        id: uuidv4(),
        content: "Desculpe, ocorreu um erro ao processar sua mensagem",
        role: "assistant",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
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

    if (isLoading) {
      return;
    }

    setIsLoading(true);
    try {
      // Simulate speech to text
      const text = "Mensagem de áudio transcrita";
      
      const userMessage: ChatMessage = {
        id: uuidv4(),
        content: text,
        role: "user",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage]);

      setTimeout(() => {
        const assistantMessage: ChatMessage = {
          id: uuidv4(),
          content: "Recebi sua mensagem de áudio! Esta é uma resposta simulada.",
          role: "assistant",
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
        setIsLoading(false);
      }, 1500);
    } catch (error) {
      console.error('Error processing audio:', error);
      
      const errorMessage: ChatMessage = {
        id: uuidv4(),
        content: "Desculpe, não consegui processar o áudio",
        role: "assistant",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
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

  useEffect(() => {
    if (resetTrigger && resetTrigger > 0 && resetTrigger !== lastResetTriggerRef.current) {
      lastResetTriggerRef.current = resetTrigger;
      
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        setCurrentAudio(null);
        setPlayingMessageId(null);
      }

      if (isRecording && recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        setIsRecording(false);
        setRecordingDuration(0);
      }

      setMessages([]);
      setInputValue("");
      setIsLoading(false);
      setAudioOutputEnabled(false);
      
      lastSentMessageRef.current = '';
      lastSentTimeRef.current = 0;

      if (onResetChat) {
        onResetChat();
      }
    }
  }, [resetTrigger, onResetChat]);

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto relative overflow-hidden">
      {/* Academic Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500 dark:from-blue-600 dark:via-purple-700 dark:to-pink-600"></div>
        <div className="absolute inset-0 bg-gradient-to-tl from-orange-400 via-red-500 to-yellow-500 opacity-30"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 opacity-20"></div>
        
        {/* Mathematical Symbols */}
        <div className="absolute inset-0 opacity-30">
          <motion.div 
            className="absolute top-20 left-16 text-6xl font-bold text-yellow-300 drop-shadow-lg"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          >
            ∫
          </motion.div>
          <motion.div 
            className="absolute top-40 right-20 text-4xl font-bold text-pink-400 drop-shadow-lg"
            animate={{ y: [0, -10, 10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          >
            π
          </motion.div>
          
          <motion.div 
            className="absolute bottom-32 left-24 text-5xl font-bold text-lime-400 drop-shadow-lg"
            animate={{ scale: [1, 1.1, 0.9, 1] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          >
            E=mc²
          </motion.div>
          <motion.div 
            className="absolute top-60 left-1/4 text-3xl font-bold text-emerald-400 drop-shadow-lg"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          >
            ∆
          </motion.div>
          
          <motion.div 
            className="absolute bottom-20 right-32 text-4xl font-bold text-red-400 drop-shadow-lg"
            animate={{ x: [0, 15, -15, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          >
            H₂O
          </motion.div>
          <motion.div 
            className="absolute top-80 right-1/4 text-3xl font-bold text-orange-400 drop-shadow-lg"
            animate={{ y: [0, 8, -8, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          >
            ⚛
          </motion.div>
          
          <motion.div 
            className="absolute bottom-60 left-1/3 text-4xl font-bold text-violet-400 drop-shadow-lg"
            animate={{ rotate: [0, -8, 8, 0] }}
            transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
          >
            σ
          </motion.div>
          <motion.div 
            className="absolute top-32 left-1/2 text-3xl font-bold text-cyan-400 drop-shadow-lg"
            animate={{ scale: [1, 0.8, 1.2, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          >
            Σ
          </motion.div>
        </div>
        
        {/* Geometric Patterns */}
        <div className="absolute inset-0 opacity-20">
          <motion.div 
            className="absolute top-16 right-16 w-32 h-32 border-4 border-cyan-300 rounded-full shadow-lg"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          ></motion.div>
          <motion.div 
            className="absolute bottom-24 left-20 w-24 h-24 border-4 border-magenta-400 transform rotate-45 shadow-lg"
            animate={{ rotate: [45, 90, 135, 45] }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          ></motion.div>
          <motion.div 
            className="absolute top-1/2 left-12 w-16 h-16 border-4 border-lime-400 shadow-lg"
            animate={{ rotate: [0, 180, 360] }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          ></motion.div>
          <motion.div 
            className="absolute bottom-40 right-24 w-20 h-20 border-4 border-orange-400 rounded-full shadow-lg"
            animate={{ scale: [1, 1.2, 0.8, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          ></motion.div>
        </div>
        
        {/* Floating Particles */}
        <div className="absolute inset-0 opacity-60">
          {[...Array(16)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-3 h-3 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 rounded-full shadow-lg"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -40, 0],
                x: [0, Math.random() * 30 - 15, 0],
                opacity: [0.4, 1, 0.4],
                scale: [1, 1.5, 1],
              }}
              transition={{
                duration: 3 + Math.random() * 4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-15">
          <div 
            className="w-full h-full"
            style={{
              backgroundImage: `
                linear-gradient(rgba(34, 197, 94, 0.3) 1px, transparent 1px),
                linear-gradient(90deg, rgba(168, 85, 247, 0.3) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px'
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
      <div className="flex-1 overflow-y-auto p-4 space-y-6 relative z-10">
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
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
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
      <AnimatePresence>
        {showSuggestedActions && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
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

export default ModernChatInterface; 