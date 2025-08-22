"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ChatContextType {
  pendingMessage: string | null;
  setPendingMessage: (message: string | null) => void;
  clearPendingMessage: () => void;
  
  // Estados compartilhados do ChatInput
  audioOutputEnabled: boolean;
  setAudioOutputEnabled: (enabled: boolean) => void;
  
  // Estados de gravação
  isRecording: boolean;
  setIsRecording: (recording: boolean) => void;
  recordingDuration: number;
  setRecordingDuration: (duration: number) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [audioOutputEnabled, setAudioOutputEnabled] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const clearPendingMessage = () => {
    setPendingMessage(null);
  };

  return (
    <ChatContext.Provider value={{
      pendingMessage,
      setPendingMessage,
      clearPendingMessage,
      audioOutputEnabled,
      setAudioOutputEnabled,
      isRecording,
      setIsRecording,
      recordingDuration,
      setRecordingDuration
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}
