"use client";

import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChatInput } from "@/components/ChatInput";
import { useChatContext } from '@/contexts/ChatContext';
import { useGalleryContext } from '@/contexts/GalleryContext';
import { useIdleContext } from '@/contexts/IdleContext';
import PdfViewer from "@/components/PDFViewer";
import { useIsMobile } from '@/hooks/useIsMobile';
import { useKeyboardDetection } from '@/hooks/useKeyboardDetection';
import dynamic from 'next/dynamic';

// Importação dinâmica do PDFViewerMobile para otimização
const PdfViewerMobile = dynamic(() => import('@/components/PDFViewerMobile'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-white rounded-lg p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <p className="text-sm text-gray-600">Carregando visualizador...</p>
        </div>
      </div>
    </div>
  ),
});

import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/services/api";
import { 
  GraduationCap, 
  Users, 
  MessageCircle, 
  X,
  BookOpen,
  FileImage,
  Video,
  Loader2,
  Filter,
  ArrowLeft
} from "lucide-react";

interface ChatWithGalleryProps {
  onNavigateToChat?: (message?: string) => void;
  onNavigateToArticleChat?: (professorName: string, articleTitle?: string) => void;
  isFromIdle?: boolean; // Indica se voltou do modo idle
  onBack?: () => void; // Voltar para a tela de seleção
}

interface PDFArticle {
  id: string;
  filename: string;
  title: string;
  author: string;
  size: number;
  url: string;
}

interface PDFArticleWithMetadata extends PDFArticle {
  publication_title?: string;
  year?: string;
  journal?: string;
  doi?: string;
  abstract?: string;
  keywords?: string[];
  department?: string;
}

// Dados de exemplo para a galeria (mantidos como fallback)
const fallbackGalleryItems = [
  {
    id: 1,
    type: 'pdf',
    title: 'Manual do Estudante',
    description: 'Guia completo para novos alunos',
    url: '/api/documents/manual-estudante.pdf',
    icon: BookOpen
  },
  {
    id: 2,
    type: 'pdf',
    title: 'Regulamento Acadêmico',
    description: 'Normas e procedimentos acadêmicos',
    url: '/api/documents/regulamento.pdf',
    icon: BookOpen
  }
];

export default function ChatWithGallery({ onNavigateToChat, onNavigateToArticleChat, isFromIdle, onBack }: ChatWithGalleryProps) {

  const [messageValue, setMessageValue] = useState("");
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [localRecordingDuration, setLocalRecordingDuration] = useState(0);
  
  // Estado para controlar o visualizador de PDF
  const [selectedPdf, setSelectedPdf] = useState<PDFArticle | null>(null);
  
  // Estado para pesquisa
  const [searchTerm, setSearchTerm] = useState("");

  // Estado de filtros
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);

  // Contexto para estados compartilhados
  const { 
    audioOutputEnabled, 
    setAudioOutputEnabled,
    isGlobalLoading
  } = useChatContext();

  // Estados locais para evitar interferência com outros chats
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  // Contexto da galeria com cache
  const {
    pdfArticles,
    loading,
    error
  } = useGalleryContext();

  // Contexto para reset do timer de inatividade
  const { resetIdleTimer } = useIdleContext();

  // Detectar se é dispositivo mobile
  const isMobile = useIsMobile();
  
  // Detectar teclado virtual
  const { isVisible: keyboardVisible, height: keyboardHeight, isAnimating: keyboardAnimating } = useKeyboardDetection();
  
  // Limpar PDF quando voltar do modo idle
  useEffect(() => {
    if (isFromIdle && selectedPdf) {
      console.log('[ChatWithGallery] Limpando PDF após voltar do modo idle');
      setSelectedPdf(null);
    }
  }, [isFromIdle, selectedPdf]);
  
  console.log('[ChatWithGallery] Estado do componente:', {
    isMobile,
    selectedPdf: selectedPdf ? { id: selectedPdf.id, title: selectedPdf.title } : null,
    pdfArticlesCount: pdfArticles.length,
    isFromIdle
  });

  // O contexto da galeria já cuida do carregamento automático

  const handleSend = useCallback(() => {
    // Reset do timer de inatividade
    resetIdleTimer();
    
    // Enviar mensagem e navegar para o chat
    if (messageValue.trim() && onNavigateToChat) {
      onNavigateToChat(messageValue.trim());
      setMessageValue(""); // Limpar o input após enviar
    }
  }, [messageValue, onNavigateToChat, resetIdleTimer]);

  const handleStartRecording = useCallback(() => {
    // Reset do timer de inatividade
    resetIdleTimer();
    
    setIsRecording(true);
    setRecordingDuration(0);
    setLocalRecordingDuration(0);
    
    // Iniciar timer para duração da gravação
    recordingIntervalRef.current = setInterval(() => {
      setLocalRecordingDuration((prev) => {
        const newDuration = prev + 1;
        
        // Limite de 30 segundos - cancelar gravação automaticamente
        if (newDuration >= 30) {
          setIsRecording(false);
          if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current);
          }
          return 0;
        }
        return newDuration;
      });
      setRecordingDuration(localRecordingDuration + 1);
    }, 1000);
  }, [setIsRecording, setRecordingDuration, localRecordingDuration, resetIdleTimer]);

  const handleStopRecording = useCallback(async (audioBlob: Blob) => {
    // Reset do timer de inatividade
    resetIdleTimer();
    
    setIsRecording(false);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
    setRecordingDuration(0);
    setLocalRecordingDuration(0);
    
    try {
      // Converter áudio em texto usando a API
      const text = await api.speechToText(audioBlob);
      
      // Navegar para o chat com o texto transcrito
      if (onNavigateToChat) {
        onNavigateToChat(text);
      }
    } catch (error) {
      console.error('Erro ao processar áudio:', error);
      
      // Em caso de erro, navegar com mensagem de erro
      if (onNavigateToChat) {
        onNavigateToChat("Erro ao processar áudio. Tente novamente.");
      }
    }
  }, [setIsRecording, setRecordingDuration, onNavigateToChat, resetIdleTimer]);

  const handleCancelRecording = useCallback(() => {
    // Reset do timer de inatividade
    resetIdleTimer();
    
    setIsRecording(false);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
    setRecordingDuration(0);
    setLocalRecordingDuration(0);
  }, [setIsRecording, setRecordingDuration, resetIdleTimer]);

  const handleToggleAudioOutput = useCallback(() => {
    // Reset do timer de inatividade
    resetIdleTimer();
    
    setAudioOutputEnabled(!audioOutputEnabled);
  }, [audioOutputEnabled, setAudioOutputEnabled, resetIdleTimer]);

  const handleItemClick = useCallback((article: PDFArticle) => {
    // Reset do timer de inatividade
    resetIdleTimer();
    
    // Abrir o PDF no visualizador interno
    setSelectedPdf(article);
  }, [resetIdleTimer]);

  const handleClosePdfViewer = useCallback(() => {
    // Reset do timer de inatividade
    resetIdleTimer();
    
    setSelectedPdf(null);
  }, [resetIdleTimer]);

  const handleArticleChat = useCallback((article: PDFArticle) => {
    // Reset do timer de inatividade
    resetIdleTimer();
    
    // Navegar para chat específico do artigo
    if (onNavigateToArticleChat) {
      onNavigateToArticleChat(article.author, article.title);
    }
  }, [resetIdleTimer, onNavigateToArticleChat]);

  // Função para normalizar texto (remover acentos e converter para minúsculas)
  const normalizeText = (text: string): string => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .trim();
  };

  // Função para filtrar artigos baseado no termo de pesquisa
  const availableDepartments = useMemo(() => {
    return ['Física', 'Química', 'Estatística', 'Matemática'];
  }, []);

  const filteredArticles = useMemo(() => {
    const matchesSearch = (article: PDFArticleWithMetadata) => {
      if (!searchTerm.trim()) return true;
      const normalizedTerm = normalizeText(searchTerm);
      return (
        normalizeText(article.title).includes(normalizedTerm) ||
        normalizeText(article.author).includes(normalizedTerm) ||
        normalizeText(article.filename).includes(normalizedTerm) ||
        (article.publication_title && normalizeText(article.publication_title).includes(normalizedTerm)) ||
        (article.journal && normalizeText(article.journal).includes(normalizedTerm)) ||
        (article.department && normalizeText(article.department).includes(normalizedTerm)) ||
        (article.year && article.year.toString().includes(normalizedTerm)) ||
        (article.keywords && article.keywords.some(keyword => normalizeText(keyword).includes(normalizedTerm)))
      );
    };

    const matchesDepartment = (article: PDFArticleWithMetadata) => {
      if (!selectedDepartment) return true;
      return (article.department || "").toLowerCase() === selectedDepartment.toLowerCase();
    };

    return pdfArticles.filter(a => matchesSearch(a) && matchesDepartment(a));
  }, [pdfArticles, searchTerm, selectedDepartment]);

  // Função para limpar pesquisa
  const handleClearSearch = useCallback(() => {
    setSearchTerm("");
    resetIdleTimer();
  }, [resetIdleTimer]);





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
          <div className="flex items-center gap-3">
            {onBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  resetIdleTimer();
                  onBack();
                }}
                className="text-white/70 hover:text-white hover:bg-white/10 p-1"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <h1 className="text-xl font-semibold text-white">
              Museu do +C
            </h1>
            <p className="text-sm text-white/70">Explore documentos e recursos acadêmicos</p>
          </div>
          <div />
        </div>
      </motion.div>

      {/* Chat Input - COMENTADO PARA DESABILITAR */}
      {/* <div className="p-4 border-b border-white/10 bg-black/10 relative z-10">
        <ChatInput
          value={messageValue}
          onChange={setMessageValue}
          onSend={handleSend}
          isRecording={isRecording}
          recordingDuration={localRecordingDuration}
          onStartRecording={handleStartRecording}
          onStopRecording={handleStopRecording}
          onCancelRecording={handleCancelRecording}
          audioOutputEnabled={audioOutputEnabled}
          onToggleAudioOutput={handleToggleAudioOutput}
          disabled={false}
          keyboardVisible={keyboardVisible}
          showAudioToggle={true}
          transparentBackground={true}
        />
      </div> */}

      {/* Search Box */}
      <div className="p-4 border-b border-white/10 bg-black/10 relative z-20">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
            <svg className="h-5 w-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              resetIdleTimer();
            }}
            placeholder="Pesquisar por nome do professor, título do artigo, departamento ou palavras-chave..."
            className="w-full pl-10 pr-24 py-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all duration-200 relative z-0"
          />
          {/* Botão de filtros */}
          <button
            onClick={() => setIsFilterOpen((v) => !v)}
            className="absolute inset-y-0 right-8 pr-2 flex items-center text-white/70 hover:text-white transition-colors z-10"
            aria-label="Abrir filtros"
          >
            <Filter className="h-5 w-5" />
          </button>
          {searchTerm && (
            <button
              onClick={handleClearSearch}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/60 hover:text-white transition-colors z-10"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          {/* Dropdown de filtros */}
          {isFilterOpen && (
            <div className="absolute top-full right-0 mt-2 w-80 bg-black/80 border border-white/10 rounded-lg shadow-xl p-4 z-30 backdrop-blur-md">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-white">Filtros</h4>
                <button className="text-white/60 hover:text-white" onClick={() => setIsFilterOpen(false)} aria-label="Fechar filtros">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Departamento */}
              <div className="mb-3">
                <label className="block text-xs text-white/60 mb-1">Departamento</label>
                <select
                  value={selectedDepartment || ""}
                  onChange={(e) => setSelectedDepartment(e.target.value || null)}
                  className="w-full bg-white text-black text-sm rounded-md px-3 py-2 border border-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                >
                  <option value="">Todos</option>
                  {availableDepartments.map(dep => (
                    <option key={dep} value={dep}>{dep}</option>
                  ))}
                </select>
              </div>


              <div className="flex items-center justify-between pt-2">
                <button
                  className="text-xs text-white/70 hover:text-white underline underline-offset-4"
                  onClick={() => { setSelectedDepartment(null); }}
                >
                  Limpar filtros
                </button>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  onClick={() => setIsFilterOpen(false)}
                >
                  Aplicar
                </Button>
              </div>
            </div>
          )}
        </div>
        {searchTerm && (
          <div className="mt-2 text-sm text-white/60">
            {filteredArticles.length === 0 ? (
              <span>Nenhum resultado encontrado para "{searchTerm}"</span>
            ) : (
              <span>{filteredArticles.length} resultado{filteredArticles.length !== 1 ? 's' : ''} encontrado{filteredArticles.length !== 1 ? 's' : ''}</span>
            )}
          </div>
        )}
      </div>

      {/* Gallery Content */}
      <div className="flex-1 overflow-y-auto p-4 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
          <div className="flex items-center justify-center col-span-full py-8">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
              <p className="text-sm text-white/70">Carregando artigos...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center col-span-full py-8">
            <div className="flex flex-col items-center gap-3 text-center">
              <Loader2 className="w-12 h-12 text-red-400 animate-spin" />
              <p className="text-sm text-white/70">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="mt-2"
              >
                Tentar novamente
              </Button>
            </div>
          </div>
        ) : filteredArticles.length > 0 ? (
          filteredArticles.map((article) => (
            <motion.div
              key={`${article.id || ''}-${article.filename || ''}-${article.url || ''}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.random() * 0.2 }}
            >
              <motion.div
                className="relative bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden group hover:bg-white/10 hover:border-white/20 transition-all duration-300 shadow-lg hover:shadow-xl"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <div 
                  className="bg-gradient-to-br from-cyan-500/5 via-purple-500/5 to-blue-500/5 cursor-pointer p-5"
                  onClick={() => handleItemClick(article)}
                >
                  <div className="flex flex-col">
                    {/* Header com título e botão de chat */}
                    <div className="mb-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-base font-semibold text-white leading-tight flex-1 pr-3">
                          {article.publication_title || article.title}
                        </h3>
                        {/* Botão de chat individual */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleArticleChat(article);
                          }}
                          className="bg-cyan-500/20 border-cyan-400/30 text-cyan-300 hover:bg-cyan-500/30 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-200 flex-shrink-0"
                        >
                          <MessageCircle className="w-3 h-3 mr-1" />
                          Chat
                        </Button>
                      </div>
                      
                        {/* Autor e Ano */}
                        <div className="flex items-center justify-between">
                          {article.author && article.author !== article.title && (
                            <p className="text-sm text-white/80 font-medium">
                              {article.author.toUpperCase()}
                            </p>
                          )}
                          {article.year && (
                            <span className="text-xs bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded-full font-medium">
                              {article.year}
                            </span>
                          )}
                        </div>
                    </div>
                    
                    {/* Informações do artigo */}
                    <div className="space-y-3">
                      {/* Departamento */}
                      {article.department && (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-purple-400 rounded-full flex-shrink-0"></div>
                          <span className="text-sm text-purple-300 font-medium">
                            {article.department}
                          </span>
                        </div>
                      )}
                      
                      {/* Revista */}
                      {article.journal && (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0"></div>
                          <span className="text-sm text-white/70 truncate">
                            {article.journal}
                          </span>
                        </div>
                      )}
                      
                      {/* Keywords */}
                      {article.keywords && article.keywords.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-cyan-400 rounded-full flex-shrink-0"></div>
                            <span className="text-xs text-white/60 font-medium">Palavras-chave:</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {article.keywords.slice(0, 4).map((keyword, index) => (
                              <span 
                                key={index}
                                className="text-xs bg-cyan-500/15 text-cyan-300 px-2.5 py-1 rounded-lg border border-cyan-400/20"
                              >
                                {keyword}
                              </span>
                            ))}
                            {article.keywords.length > 4 && (
                              <span className="text-xs text-white/50 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                                +{article.keywords.length - 4}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Footer com ação */}
                    <div className="mt-4 pt-3 border-t border-white/10">
                      <p className="text-xs text-white/60 text-center">
                        Clique para visualizar o artigo
                      </p>
                    </div>
                  </div>
                </div>
                
              </motion.div>
            </motion.div>
          ))
        ) : (
          <div className="flex items-center justify-center col-span-full py-8">
            <div className="flex flex-col items-center gap-3 text-center">
              <BookOpen className="w-12 h-12 text-gray-400" />
              <p className="text-sm text-white/70">
                {searchTerm ? `Nenhum artigo encontrado para "${searchTerm}"` : "Nenhum artigo encontrado"}
              </p>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* PdfViewer Modal */}
      {selectedPdf && (
        isMobile ? (
          <PdfViewerMobile
            articleId={selectedPdf.id}
            articleTitle={selectedPdf.title}
            onClose={handleClosePdfViewer}
          />
        ) : (
          <PdfViewer
            articleId={selectedPdf.id}
            articleTitle={selectedPdf.title}
            onClose={handleClosePdfViewer}
          />
        )
      )}

    </div>
  );
}
