"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, X, Play, Pause, Volume2, VolumeX, Send, Paperclip, Globe, QrCode, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Avatar } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

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
  audioUrl: string;
  className?: string;
}

function AudioPlayer({ audioUrl, className }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
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
        src={audioUrl}
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
        onEnded={() => setIsPlaying(false)}
      />
    </div>
  );
}

interface ChatBubbleProps {
  message: ChatMessage;
  isUser: boolean;
}

function ChatBubble({ message, isUser }: ChatBubbleProps) {
  return (
    <div className={cn("flex gap-3 max-w-[80%]", isUser ? "ml-auto flex-row-reverse" : "mr-auto")}>
      <Avatar className="w-8 h-8 shrink-0">
        <div className={cn("w-full h-full rounded-full flex items-center justify-center text-xs font-medium", 
          isUser ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700")}>
          {isUser ? "U" : "AI"}
        </div>
      </Avatar>
      
      <div className={cn("rounded-2xl px-4 py-3 max-w-full", 
        isUser ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-900")}>
        
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
                  <div className="bg-white/10 p-3 rounded-lg flex items-center gap-2">
                    <Paperclip className="w-4 h-4" />
                    <span className="text-sm">{attachment.name}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        <div className="text-sm leading-relaxed">{message.content}</div>
        
        {message.audioUrl && (
          <div className="mt-3">
            <AudioPlayer audioUrl={message.audioUrl} />
          </div>
        )}
      </div>
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
  onFileSelect: (files: FileList) => void;
  isRecording: boolean;
  recordingDuration: number;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onCancelRecording: () => void;
  audioOutputEnabled: boolean;
  onToggleAudioOutput: (enabled: boolean) => void;
  disabled?: boolean;
}

function ChatInput({
  value,
  onChange,
  onSend,
  onFileSelect,
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onFileSelect(e.target.files);
      e.target.value = '';
    }
  };

  return (
    <div className="border-t bg-white p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Audio Output</span>
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
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx"
            onChange={handleFileChange}
            className="hidden"
          />
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 rounded-full hover:bg-gray-200"
            disabled={disabled}
          >
            <Paperclip className="w-5 h-5" />
          </Button>

          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="flex-1 min-h-[20px] max-h-[120px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
            rows={1}
            disabled={disabled || isRecording}
          />

          <div className="flex items-center gap-2 shrink-0">
            <AudioRecorder
              isRecording={isRecording}
              duration={recordingDuration}
              onStart={onStartRecording}
              onStop={onStopRecording}
              onCancel={onCancelRecording}
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

export default function ModernChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      content: "Hello! I'm your AI assistant. How can I help you today?",
      role: "assistant",
      timestamp: new Date(),
      audioUrl: "https://example.com/audio1.mp3"
    }
  ]);
  
  const [inputValue, setInputValue] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioOutputEnabled, setAudioOutputEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const recordingIntervalRef = useRef<NodeJS.Timeout>();

  const suggestedActions: SuggestedAction[] = [
    { id: "1", text: "Tell me more about X", icon: <Globe className="w-3 h-3" /> },
    { id: "2", text: "Summarize this", icon: <ImageIcon className="w-3 h-3" /> },
    { id: "3", text: "Generate an image", icon: <ImageIcon className="w-3 h-3" /> },
    { id: "4", text: "Create QR code", icon: <QrCode className="w-3 h-3" /> }
  ];

  const handleSend = useCallback(() => {
    if (!inputValue.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputValue,
      role: "user",
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: "I understand your message. Here's my response with some helpful information.",
        role: "assistant",
        timestamp: new Date(),
        audioUrl: audioOutputEnabled ? "https://example.com/audio-response.mp3" : undefined,
        attachments: Math.random() > 0.7 ? [
          {
            url: "https://via.placeholder.com/300x200",
            name: "example-image.jpg",
            contentType: "image/jpeg",
            size: 12345
          }
        ] : undefined
      };
      
      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1500);
  }, [inputValue, audioOutputEnabled]);

  const handleStartRecording = useCallback(() => {
    setIsRecording(true);
    setRecordingDuration(0);
    recordingIntervalRef.current = setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);
  }, []);

  const handleStopRecording = useCallback(() => {
    setIsRecording(false);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
    
    // Simulate processing voice input
    const voiceMessage = `Voice message recorded (${recordingDuration}s)`;
    setInputValue(voiceMessage);
    setRecordingDuration(0);
  }, [recordingDuration]);

  const handleCancelRecording = useCallback(() => {
    setIsRecording(false);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
    setRecordingDuration(0);
  }, []);

  const handleFileSelect = useCallback((files: FileList) => {
    const fileArray = Array.from(files);
    console.log("Selected files:", fileArray);
    
    // Add files as attachments to the next message
    const fileNames = fileArray.map(f => f.name).join(", ");
    setInputValue(prev => prev + (prev ? " " : "") + `[Attached: ${fileNames}]`);
  }, []);

  const handleSelectAction = useCallback((action: SuggestedAction) => {
    setInputValue(action.text);
  }, []);

  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  const showSuggestedActions = messages.length <= 1 && !inputValue && !isRecording;

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-white">
      {/* Header */}
      <div className="border-b bg-white p-4">
        <h1 className="text-xl font-semibold text-gray-900">AI Assistant</h1>
        <p className="text-sm text-gray-500">Voice-enabled chat with rich media support</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((message) => (
          <ChatBubble
            key={message.id}
            message={message}
            isUser={message.role === "user"}
          />
        ))}
        
        {isLoading && (
          <div className="flex gap-3 max-w-[80%]">
            <Avatar className="w-8 h-8 shrink-0">
              <div className="w-full h-full rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-xs font-medium">
                AI
              </div>
            </Avatar>
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
        onFileSelect={handleFileSelect}
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