"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChatInput } from "@/components/ChatInput";
import { useChatContext } from '@/contexts/ChatContext';
import PDFViewer, { PDFPreview } from "@/components/PDFViewer";
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
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [pdfArticles, setPdfArticles] = useState<PDFArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    // Esta função será chamada pelo ChatInput quando uma mensagem for enviada
    // O ChatInput já gerencia o valor da mensagem internamente
  }, []);

  const handleStartRecording = useCallback(() => {
    setIsRecording(true);
    setRecordingDuration(0);
  }, [setIsRecording, setRecordingDuration]);

  const handleStopRecording = useCallback(async (audioBlob: Blob) => {
    setIsRecording(false);
    setRecordingDuration(0);
    
    // Aqui você pode processar o áudio se necessário
    // Por enquanto, vamos apenas navegar com uma mensagem de áudio
    if (onNavigateToChat) {
      onNavigateToChat("[Mensagem de áudio]");
    }
  }, [setIsRecording, setRecordingDuration, onNavigateToChat]);

  const handleCancelRecording = useCallback(() => {
    setIsRecording(false);
    setRecordingDuration(0);
  }, [setIsRecording, setRecordingDuration]);

  const handleToggleAudioOutput = useCallback(() => {
    setAudioOutputEnabled(!audioOutputEnabled);
  }, [audioOutputEnabled, setAudioOutputEnabled]);

  const handleItemClick = useCallback((article: PDFArticle) => {
    setSelectedItem(article);
    setShowPDFViewer(true);
  }, []);

  const handleCloseViewer = useCallback(() => {
    setShowPDFViewer(false);
    setSelectedItem(null);
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
          value=""
          onChange={() => {}}
          onSend={handleSend}
          isRecording={isRecording}
          recordingDuration={recordingDuration}
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
              <PDFPreview
                url={article.url}
                title={article.title}
                onClick={() => handleItemClick(article)}
              />
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

      {/* PDF Viewer Modal */}
      <AnimatePresence>
        {showPDFViewer && selectedItem && (
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-4xl max-h-[90vh] overflow-hidden"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <PDFViewer
                url={selectedItem.url}
                title={selectedItem.title}
                onClose={handleCloseViewer}
                showControls={true}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
