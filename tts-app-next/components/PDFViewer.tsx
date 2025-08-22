"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Download, 
  X,
  FileText,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PDFViewerProps {
  url: string;
  title?: string;
  onClose?: () => void;
  className?: string;
  showControls?: boolean;
  initialPage?: number;
  initialScale?: number;
}

interface PDFViewerState {
  numPages: number;
  pageNumber: number;
  scale: number;
  rotation: number;
  loading: boolean;
  error: string | null;
  pdfLoaded: boolean;
}

// Componente wrapper para carregar o PDF apenas no cliente
function PDFViewerContent({ 
  url, 
  title = "Documento PDF",
  onClose,
  className,
  showControls = true,
  initialPage = 1,
  initialScale = 1.0
}: PDFViewerProps) {
  const [state, setState] = useState<PDFViewerState>({
    numPages: 0,
    pageNumber: initialPage,
    scale: initialScale,
    rotation: 0,
    loading: true,
    error: null,
    pdfLoaded: false
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const [Document, setDocument] = useState<any>(null);
  const [Page, setPage] = useState<any>(null);

  // Carregar react-pdf dinamicamente apenas no cliente
  useEffect(() => {
    const loadPDF = async () => {
      try {
        const reactPdf = await import('react-pdf');
        const { Document: Doc, Page: Pg, pdfjs } = reactPdf;
        
        // Configurar worker do PDF.js
        if (typeof window !== 'undefined' && pdfjs) {
          pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
        }
        
        setDocument(() => Doc);
        setPage(() => Pg);
        setState(prev => ({ ...prev, pdfLoaded: true }));
      } catch (error) {
        console.error('Erro ao carregar react-pdf:', error);
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          error: 'Erro ao carregar o visualizador de PDF' 
        }));
      }
    };

    loadPDF();
  }, []);

  // Função para carregar o documento
  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setState(prev => ({
      ...prev,
      numPages,
      loading: false,
      error: null
    }));
  }, []);

  // Função para lidar com erros
  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('Erro ao carregar PDF:', error);
    setState(prev => ({
      ...prev,
      loading: false,
      error: 'Erro ao carregar o documento PDF'
    }));
  }, []);

  // Navegação de páginas
  const goToPreviousPage = useCallback(() => {
    setState(prev => ({
      ...prev,
      pageNumber: Math.max(1, prev.pageNumber - 1)
    }));
  }, []);

  const goToNextPage = useCallback(() => {
    setState(prev => ({
      ...prev,
      pageNumber: Math.min(prev.numPages, prev.pageNumber + 1)
    }));
  }, []);

  // Controles de zoom
  const zoomIn = useCallback(() => {
    setState(prev => ({
      ...prev,
      scale: Math.min(3.0, prev.scale + 0.25)
    }));
  }, []);

  const zoomOut = useCallback(() => {
    setState(prev => ({
      ...prev,
      scale: Math.max(0.5, prev.scale - 0.25)
    }));
  }, []);

  // Rotação
  const rotate = useCallback(() => {
    setState(prev => ({
      ...prev,
      rotation: (prev.rotation + 90) % 360
    }));
  }, []);

  // Download do PDF
  const downloadPDF = useCallback(async () => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = title.endsWith('.pdf') ? title : `${title}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Erro ao baixar PDF:', error);
    }
  }, [url, title]);

  // Renderizar página atual
  const renderPage = () => {
    if (!state.pdfLoaded) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            <p className="text-sm text-white/70">Carregando visualizador...</p>
          </div>
        </div>
      );
    }

    if (state.loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            <p className="text-sm text-white/70">Carregando documento...</p>
          </div>
        </div>
      );
    }

    if (state.error) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3 text-center">
            <FileText className="w-12 h-12 text-red-400" />
            <p className="text-sm text-white/70">{state.error}</p>
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
      );
    }

    if (!Document || !Page) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3 text-center">
            <FileText className="w-12 h-12 text-red-400" />
            <p className="text-sm text-white/70">Visualizador não disponível</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex justify-center">
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            </div>
          }
          error={
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-3 text-center">
                <FileText className="w-12 h-12 text-red-400" />
                <p className="text-sm text-white/70">Erro ao carregar PDF</p>
              </div>
            </div>
          }
        >
          <Page
            pageNumber={state.pageNumber}
            scale={state.scale}
            rotate={state.rotation}
            className="shadow-lg"
            loading={
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
              </div>
            }
          />
        </Document>
      </div>
    );
  };

  return (
    <motion.div
      ref={containerRef}
      className={cn(
        "relative bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden",
        className
      )}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/20">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-cyan-400" />
          <div>
            <h3 className="text-sm font-medium text-white truncate max-w-48">
              {title}
            </h3>
            {state.numPages > 0 && (
              <p className="text-xs text-white/60">
                Página {state.pageNumber} de {state.numPages}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="w-8 h-8 hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Controles */}
      {showControls && (
        <div className="flex items-center justify-between p-3 border-b border-white/10 bg-black/10">
          <div className="flex items-center gap-2">
            {/* Navegação */}
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPreviousPage}
              disabled={state.pageNumber <= 1}
              className="w-8 h-8 hover:bg-white/10 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <span className="text-sm text-white/70 min-w-16 text-center">
              {state.pageNumber} / {state.numPages || '?'}
            </span>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={goToNextPage}
              disabled={state.pageNumber >= state.numPages}
              className="w-8 h-8 hover:bg-white/10 disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom */}
            <Button
              variant="ghost"
              size="icon"
              onClick={zoomOut}
              disabled={state.scale <= 0.5}
              className="w-8 h-8 hover:bg-white/10 disabled:opacity-50"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            
            <span className="text-sm text-white/70 min-w-12 text-center">
              {Math.round(state.scale * 100)}%
            </span>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={zoomIn}
              disabled={state.scale >= 3.0}
              className="w-8 h-8 hover:bg-white/10 disabled:opacity-50"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>

            {/* Rotação */}
            <Button
              variant="ghost"
              size="icon"
              onClick={rotate}
              className="w-8 h-8 hover:bg-white/10"
            >
              <RotateCw className="w-4 h-4" />
            </Button>

            {/* Download */}
            <Button
              variant="ghost"
              size="icon"
              onClick={downloadPDF}
              className="w-8 h-8 hover:bg-white/10"
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Conteúdo do PDF */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {renderPage()}
      </div>
    </motion.div>
  );
}

// Componente principal com verificação de cliente
export default function PDFViewer(props: PDFViewerProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="relative bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            <p className="text-sm text-white/70">Carregando...</p>
          </div>
        </div>
      </div>
    );
  }

  return <PDFViewerContent {...props} />;
}

// Componente de preview para galeria
export function PDFPreview({ 
  url, 
  title = "Documento PDF",
  onClick,
  className 
}: {
  url: string;
  title?: string;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <motion.div
      className={cn(
        "relative bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden cursor-pointer group",
        "hover:bg-white/10 hover:border-white/20 transition-all duration-200",
        className
      )}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="aspect-[3/4] flex items-center justify-center bg-gradient-to-br from-cyan-500/10 to-purple-500/10">
        <div className="flex flex-col items-center gap-3 text-center p-4">
          <FileText className="w-12 h-12 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
          <div>
            <h3 className="text-sm font-medium text-white truncate max-w-32">
              {title}
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
  );
}
