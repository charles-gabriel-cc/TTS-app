"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ChatInput } from "@/components/ChatInput";
import { useChatContext } from '@/contexts/ChatContext';

import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/services/api";
import { 
  GraduationCap, 
  Users, 
  MessageCircle, 
  FileText,
  X,
  BookOpen,
  FileImage,
  Video,
  Loader2
} from "lucide-react";

interface ChatWithGalleryProps {
  onNavigateToChat?: (message?: string) => void;
}

interface PDFArticle {
  id: string;
  filename: string;
  title: string;
  author: string;
  size: number;
  url: string;
}

// Dados de exemplo para a galeria (mantidos como fallback)
const fallbackGalleryItems = [
  {
    id: 1,
    type: 'pdf',
    title: 'Manual do Estudante',
    description: 'Guia completo para novos alunos',
    url: '/api/documents/manual-estudante.pdf',
    icon: FileText
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

export default function ChatWithGallery({ onNavigateToChat }: ChatWithGalleryProps) {

  const [pdfArticles, setPdfArticles] = useState<PDFArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messageValue, setMessageValue] = useState("");
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [localRecordingDuration, setLocalRecordingDuration] = useState(0);

  // Contexto para estados compartilhados
  const { 
    audioOutputEnabled, 
    setAudioOutputEnabled,
    isRecording,
    setIsRecording,
    recordingDuration,
    setRecordingDuration
  } = useChatContext();

  // Buscar PDFs da API quando o componente montar
  useEffect(() => {
    const fetchPDFs = async () => {
      try {
        setLoading(true);
        setError(null);
        const articles = await api.getPDFArticles();
        setPdfArticles(articles);
      } catch (err) {
        console.error('Erro ao buscar PDFs:', err);
        setError('Erro ao carregar artigos');
      } finally {
        setLoading(false);
      }
    };

    fetchPDFs();
  }, []);

  const handleSend = useCallback(() => {
    // Enviar mensagem e navegar para o chat
    if (messageValue.trim() && onNavigateToChat) {
      onNavigateToChat(messageValue.trim());
      setMessageValue(""); // Limpar o input após enviar
    }
  }, [messageValue, onNavigateToChat]);

  const handleStartRecording = useCallback(() => {
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
  }, [setIsRecording, setRecordingDuration, localRecordingDuration]);

  const handleStopRecording = useCallback(async (audioBlob: Blob) => {
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
  }, [setIsRecording, setRecordingDuration, onNavigateToChat]);

  const handleCancelRecording = useCallback(() => {
    setIsRecording(false);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
    setRecordingDuration(0);
    setLocalRecordingDuration(0);
  }, [setIsRecording, setRecordingDuration]);

  const handleToggleAudioOutput = useCallback(() => {
    setAudioOutputEnabled(!audioOutputEnabled);
  }, [audioOutputEnabled, setAudioOutputEnabled]);

  const handleItemClick = useCallback((article: PDFArticle) => {
    // TODO: Implementar nova funcionalidade de visualização
    console.log('Item clicado:', article);
    // Por enquanto, apenas abre o PDF em uma nova aba
    window.open(article.url, '_blank');
  }, []);



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
          <div>
            <h1 className="text-xl font-semibold text-white flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-cyan-400" />
              Galeria do CCEN
            </h1>
            <p className="text-sm text-white/70">Explore documentos e recursos acadêmicos</p>
          </div>
          <Button
            variant="outline"
            onClick={() => onNavigateToChat?.()}
            className="bg-white/10 backdrop-blur-sm hover:bg-white/20 border-white/30 text-white"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Chat Completo
          </Button>
        </div>
      </motion.div>

      {/* Chat Input */}
      <div className="p-4 border-b border-white/10 bg-black/10">
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
          keyboardVisible={false}
          showAudioToggle={true}
        />
      </div>

      {/* Gallery Content */}
      <div className="flex-1 overflow-y-auto p-4">
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
              <FileText className="w-12 h-12 text-red-400" />
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
        ) : pdfArticles.length > 0 ? (
          pdfArticles.map((article) => (
            <motion.div
              key={article.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.random() * 0.2 }}
            >
              <motion.div
                className="relative bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden cursor-pointer group hover:bg-white/10 hover:border-white/20 transition-all duration-200"
                onClick={() => handleItemClick(article)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="aspect-[3/4] flex items-center justify-center bg-gradient-to-br from-cyan-500/10 to-purple-500/10">
                  <div className="flex flex-col items-center gap-3 text-center p-4">
                    <FileText className="w-12 h-12 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
                    <div>
                      <h3 className="text-sm font-medium text-white truncate max-w-32">
                        {article.title}
                      </h3>
                      <p className="text-xs text-white/60 mt-1">
                        Clique para visualizar
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Overlay de hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.div>
            </motion.div>
          ))
        ) : (
          <div className="flex items-center justify-center col-span-full py-8">
            <div className="flex flex-col items-center gap-3 text-center">
              <FileText className="w-12 h-12 text-gray-400" />
              <p className="text-sm text-white/70">Nenhum artigo encontrado</p>
            </div>
          </div>
        )}
        </div>
      </div>


    </div>
  );
}
