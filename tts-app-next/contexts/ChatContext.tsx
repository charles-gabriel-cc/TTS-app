"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { api } from '@/services/api';

interface ChatMessage {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  audioUrl?: string;
  audioFormat?: string;
}

interface ChatSession {
  id: string;
  name: string;
  messages: ChatMessage[];
  createdAt: Date;
  lastActivity: Date;
}

interface ChatContextType {
  // Estados globais compartilhados
  pendingMessage: string | null;
  setPendingMessage: (message: string | null) => void;
  clearPendingMessage: () => void;
  
  // Estado global de loading
  isGlobalLoading: boolean;
  setIsGlobalLoading: (loading: boolean) => void;
  
  // Estado para controlar se o loading deve ser aplicado globalmente
  shouldApplyGlobalLoading: boolean;
  setShouldApplyGlobalLoading: (should: boolean) => void;
  
  // Estados compartilhados do ChatInput
  audioOutputEnabled: boolean;
  setAudioOutputEnabled: (enabled: boolean | ((prev: boolean) => boolean)) => void;
  
  // Estados de gravação
  isRecording: boolean;
  setIsRecording: (recording: boolean) => void;
  recordingDuration: number;
  setRecordingDuration: (duration: number | ((prev: number) => number)) => void;

  // Gerenciamento de sessões de chat
  sessions: ChatSession[];
  currentSessionId: string | null;
  setCurrentSessionId: (sessionId: string | null) => void;
  
  // Sessões fixas por tipo de chat
  mainChatSessionId: string | null;
  getOrCreateMainChatSession: () => string;
  getOrCreateArticleSession: (professorName: string, articleTitle?: string) => string;
  
  // Operações de sessão
  createSession: (name?: string) => string;
  deleteSession: (sessionId: string) => void;
  clearAllSessions: () => void;
  
  // Operações de mensagens
  addMessage: (sessionId: string, message: ChatMessage) => void;
  clearSessionMessages: (sessionId: string) => void;
  getSessionMessages: (sessionId: string) => ChatMessage[];
  
  // Utilitários
  getCurrentSession: () => ChatSession | null;
  getSessionById: (sessionId: string) => ChatSession | null;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);
  const [shouldApplyGlobalLoading, setShouldApplyGlobalLoading] = useState(true);
  const [audioOutputEnabled, setAudioOutputEnabled] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  // Estados de sessão
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [mainChatSessionId, setMainChatSessionId] = useState<string | null>(null);

  const clearPendingMessage = useCallback(() => {
    setPendingMessage(null);
  }, []);

  // Criar nova sessão
  const createSession = useCallback((name?: string): string => {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const sessionName = name || `Chat ${sessions.length + 1}`;
    
    const newSession: ChatSession = {
      id: sessionId,
      name: sessionName,
      messages: [],
      createdAt: new Date(),
      lastActivity: new Date()
    };

    setSessions(prev => [...prev, newSession]);
    setCurrentSessionId(sessionId);
    
    console.log(`[ChatContext] Nova sessão criada: ${sessionId} (${sessionName})`);
    console.log(`[ChatContext] Session ID da API: ${api.getCurrentSessionId().substring(0, 8)}...`);
    return sessionId;
  }, [sessions.length]);

  // Deletar sessão
  const deleteSession = useCallback((sessionId: string) => {
    setSessions(prev => prev.filter(session => session.id !== sessionId));
    
    // Se a sessão atual foi deletada, limpar currentSessionId
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
    }
    
    console.log(`[ChatContext] Sessão deletada: ${sessionId}`);
  }, [currentSessionId]);

  // Limpar todas as sessões
  const clearAllSessions = useCallback(() => {
    setSessions([]);
    setCurrentSessionId(null);
    setMainChatSessionId(null);
    console.log('[ChatContext] Todas as sessões foram limpas');
  }, []);

  // Adicionar mensagem a uma sessão
  const addMessage = useCallback((sessionId: string, message: ChatMessage) => {
    setSessions(prev => prev.map(session => {
      if (session.id === sessionId) {
        return {
          ...session,
          messages: [...session.messages, message],
          lastActivity: new Date()
        };
      }
      return session;
    }));
  }, []);

  // Limpar mensagens de uma sessão
  const clearSessionMessages = useCallback((sessionId: string) => {
    setSessions(prev => prev.map(session => {
      if (session.id === sessionId) {
        return {
          ...session,
          messages: [],
          lastActivity: new Date()
        };
      }
      return session;
    }));
  }, []);

  // Obter mensagens de uma sessão
  const getSessionMessages = useCallback((sessionId: string): ChatMessage[] => {
    const session = sessions.find(s => s.id === sessionId);
    return session?.messages || [];
  }, [sessions]);

  // Obter sessão atual
  const getCurrentSession = useCallback((): ChatSession | null => {
    if (!currentSessionId) return null;
    return sessions.find(s => s.id === currentSessionId) || null;
  }, [currentSessionId, sessions]);

  // Obter sessão por ID
  const getSessionById = useCallback((sessionId: string): ChatSession | null => {
    return sessions.find(s => s.id === sessionId) || null;
  }, [sessions]);

  // Obter ou criar sessão do chat principal
  const getOrCreateMainChatSession = useCallback((): string => {
    if (mainChatSessionId) {
      return mainChatSessionId;
    }
    
    const sessionId = createSession('Chat Completo CCEN');
    setMainChatSessionId(sessionId);
    console.log('[ChatContext] Sessão do chat principal criada:', sessionId);
    return sessionId;
  }, [mainChatSessionId, createSession]);

  // Obter ou criar sessão de artigo específico
  const getOrCreateArticleSession = useCallback((professorName: string, articleTitle?: string): string => {
    const sessionName = `Chat - ${professorName} - ${articleTitle || 'Artigo'}`;
    
    // Buscar sessão existente
    const existingSession = sessions.find(session => 
      session.name === sessionName
    );
    
    if (existingSession) {
      console.log('[ChatContext] Sessão de artigo existente encontrada:', existingSession.id);
      return existingSession.id;
    }
    
    // Criar nova sessão
    const sessionId = createSession(sessionName);
    console.log('[ChatContext] Nova sessão de artigo criada:', sessionId);
    return sessionId;
  }, [sessions, createSession]);

  return (
    <ChatContext.Provider value={{
          pendingMessage,
    setPendingMessage,
    clearPendingMessage,
    isGlobalLoading,
    setIsGlobalLoading,
    shouldApplyGlobalLoading,
    setShouldApplyGlobalLoading,
    audioOutputEnabled,
    setAudioOutputEnabled,
    isRecording,
    setIsRecording,
    recordingDuration,
    setRecordingDuration,
    sessions,
    currentSessionId,
    setCurrentSessionId,
    mainChatSessionId,
    getOrCreateMainChatSession,
    getOrCreateArticleSession,
    createSession,
    deleteSession,
    clearAllSessions,
    addMessage,
    clearSessionMessages,
    getSessionMessages,
    getCurrentSession,
    getSessionById
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
