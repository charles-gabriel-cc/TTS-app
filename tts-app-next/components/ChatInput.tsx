"use client";

import React, { useRef, useEffect } from "react";
import { Volume2, VolumeX, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useIdleContext } from '@/contexts/IdleContext';

interface AudioRecorderProps {
  onStart?: () => void;
  onStop?: () => void;
  onCancel?: () => void;
  isRecording: boolean;
  duration: number;
  disabled?: boolean;
}

function AudioRecorder({ onStart, onStop, onCancel, isRecording, duration, disabled = false }: AudioRecorderProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Contexto para resetar timer de inatividade
  const { resetIdleTimer } = useIdleContext();

  return (
    <div className="flex items-center gap-2">
      {!isRecording ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={onStart}
          disabled={disabled}
          className="rounded-full hover:bg-white/10 text-white hover:text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </Button>
      ) : (
        <div className="flex items-center gap-2 bg-red-500/20 rounded-full px-3 py-1 backdrop-blur-sm border border-red-500/30">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
            <span className="text-sm font-mono text-white">{formatTime(duration)}</span>
          </div>
                  <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            resetIdleTimer();
            onStop?.();
          }}
          className="w-8 h-8 rounded-full hover:bg-red-500/20 text-white hover:text-white"
        >
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" />
          </svg>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            resetIdleTimer();
            onCancel?.();
          }}
          className="w-8 h-8 rounded-full hover:bg-red-500/20 text-white hover:text-white"
        >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </Button>
        </div>
      )}
    </div>
  );
}

export interface ChatInputProps {
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
  keyboardVisible?: boolean;
  placeholder?: string;
  className?: string;
  showAudioToggle?: boolean;
  transparentBackground?: boolean;
}

export function ChatInput({
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
  disabled = false,
  keyboardVisible = false,
  placeholder = "Digite sua mensagem...",
  className,
  showAudioToggle = true,
  transparentBackground = false
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Contexto para resetar timer de inatividade
  const { resetIdleTimer } = useIdleContext();

  // Auto-scroll para manter textarea visível quando teclado aparece
  useEffect(() => {
    console.log('ChatInput: keyboardVisible changed to:', keyboardVisible);
    
    if (keyboardVisible && textareaRef.current) {
      const textarea = textareaRef.current;
      const scrollIntoView = () => {
        console.log('Scrolling textarea into view');
        textarea.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'nearest'
        });
      };
      
      // Scroll imediato e também quando o usuário focar
      setTimeout(scrollIntoView, 100); // Pequeno delay para garantir que o layout foi atualizado
      
      const handleFocus = () => {
        console.log('Textarea focused, scrolling into view');
        setTimeout(scrollIntoView, 100);
      };
      textarea.addEventListener('focus', handleFocus);
      
      return () => {
        textarea.removeEventListener('focus', handleFocus);
      };
    }
  }, [keyboardVisible]);

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
    // Resetar timer de inatividade quando usuário digita
    resetIdleTimer();
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) {
        onSend();
      }
    }
  };

  const startRecording = async () => {
    if (disabled) return; // Não permitir iniciar gravação se desabilitado
    
    // Resetar timer de inatividade quando iniciar gravação
    resetIdleTimer();
    
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
    <div 
      className={cn(
        "border-t border-white/10 p-4 relative z-10 transition-all duration-300 ease-out",
        transparentBackground 
          ? "" 
          : keyboardVisible 
            ? "bg-slate-900/90 backdrop-blur-md border-t border-cyan-500/50" 
            : "bg-black/20 backdrop-blur-xl",
        className
      )}
    >


      <div className="relative">
        <div className="flex items-end gap-2 bg-white/5 backdrop-blur-sm rounded-2xl p-3 border border-white/10">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 min-h-[40px] max-h-[120px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 py-2 px-1 text-base leading-6 text-white placeholder:text-white/50"
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
              disabled={disabled}
            />
            
            {showAudioToggle && !isRecording && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  resetIdleTimer();
                  onToggleAudioOutput(!audioOutputEnabled);
                }}
                disabled={disabled}
                className={cn(
                  "rounded-full hover:bg-white/10 transition-all duration-200",
                  audioOutputEnabled 
                    ? "text-green-400 hover:text-green-300" 
                    : "text-white hover:text-white",
                  disabled && "opacity-50 cursor-not-allowed hover:bg-transparent"
                )}
                title={audioOutputEnabled ? "Desativar resposta com áudio" : "Ativar resposta com áudio"}
              >
                {audioOutputEnabled ? (
                  <Volume2 className="w-5 h-5" />
                ) : (
                  <VolumeX className="w-5 h-5" />
                )}
              </Button>
            )}
            
            {!isRecording && (
              <Button
                onClick={() => {
                  resetIdleTimer();
                  onSend();
                }}
                disabled={!value.trim() || disabled}
                size="icon"
                className="rounded-full bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-600 hover:to-teal-500 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Send className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
