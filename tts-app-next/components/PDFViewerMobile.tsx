"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { X, Download, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { api } from '@/services/api';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configuração do worker do PDF.js
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;
}

interface PdfViewerMobileProps {
  articleId: string;
  articleTitle: string;
  onClose: () => void;
}

const PdfViewerMobile: React.FC<PdfViewerMobileProps> = ({ articleId, articleTitle, onClose }) => {
  const [pdfFile, setPdfFile] = useState<Blob | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState<boolean>(false);
  
  // Refs para detecção de swipe
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const touchEndY = useRef<number>(0);
  const contentRef = useRef<HTMLDivElement>(null);



  // Log inicial do componente
  console.log('[PDFViewerMobile] Componente inicializado:', { articleId, articleTitle });

  useEffect(() => {
    const loadPdf = async () => {
      console.log('[PDFViewerMobile] Iniciando carregamento do PDF:', articleId);
      
      try {
        setLoading(true);
        setError(null);
        
        console.log('[PDFViewerMobile] Chamando api.downloadPDF...');
        // Buscar o PDF como blob
        const blob = await api.downloadPDF(articleId);
        
        console.log('[PDFViewerMobile] PDF baixado com sucesso:', {
          blobSize: blob.size,
          blobType: blob.type,
          articleId
        });
        
        setPdfFile(blob);
        console.log('[PDFViewerMobile] PDF definido no estado');
        
      } catch (err) {
        console.error('[PDFViewerMobile] Erro ao carregar PDF:', {
          error: err,
          message: err instanceof Error ? err.message : 'Erro desconhecido',
          articleId
        });
        setError('Erro ao carregar o PDF. Tente novamente.');
      } finally {
        setLoading(false);
        console.log('[PDFViewerMobile] Carregamento finalizado');
      }
    };

    loadPdf();
  }, [articleId]);

  const handleDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    console.log('[PDFViewerMobile] Documento carregado com sucesso:', {
      numPages,
      articleId,
      articleTitle
    });
    setNumPages(numPages);
    setPageNumber(1);
  };

  const handlePreviousPage = () => {
    setPageNumber(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setPageNumber(prev => Math.min(prev + 1, numPages));
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 3.0));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  // Funções para detecção de swipe
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
    touchEndY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(() => {
    // Só processar swipe se há páginas disponíveis
    if (numPages === 0) {
      console.log('[PDFViewerMobile] Swipe ignorado - nenhuma página disponível');
      return;
    }
    
    const minSwipeDistance = 50; // Distância mínima para considerar um swipe
    const maxVerticalDistance = 100; // Distância máxima vertical para evitar conflito com scroll
    
    const deltaX = touchEndX.current - touchStartX.current;
    const deltaY = Math.abs(touchEndY.current - touchStartY.current);
    
    console.log('[PDFViewerMobile] Swipe detectado:', {
      deltaX,
      deltaY,
      minSwipeDistance,
      maxVerticalDistance,
      isValid: Math.abs(deltaX) > minSwipeDistance && deltaY < maxVerticalDistance
    });
    
    // Verificar se é um swipe horizontal válido
    if (Math.abs(deltaX) > minSwipeDistance && deltaY < maxVerticalDistance) {
      if (deltaX > 0) {
        // Swipe para direita - página anterior
        console.log('[PDFViewerMobile] Swipe para direita detectado - página anterior');
        setPageNumber(prev => {
          const newPage = Math.max(prev - 1, 1);
          console.log('[PDFViewerMobile] Mudando página:', { prev, newPage });
          return newPage;
        });
      } else {
        // Swipe para esquerda - próxima página
        console.log('[PDFViewerMobile] Swipe para esquerda detectado - próxima página');
        setPageNumber(prev => {
          const newPage = Math.min(prev + 1, numPages);
          console.log('[PDFViewerMobile] Mudando página:', { prev, newPage, numPages });
          return newPage;
        });
      }
    }
  }, [numPages]);

  const handleDownload = async () => {
    console.log('[PDFViewerMobile] Iniciando download do PDF:', articleId);
    
    try {
      const blob = await api.downloadPDF(articleId);
      console.log('[PDFViewerMobile] PDF baixado para download:', {
        blobSize: blob.size,
        blobType: blob.type
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${articleTitle}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('[PDFViewerMobile] Download iniciado com sucesso');
    } catch (err) {
      console.error('[PDFViewerMobile] Erro ao baixar PDF:', {
        error: err,
        message: err instanceof Error ? err.message : 'Erro desconhecido'
      });
      setError('Erro ao baixar o PDF.');
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300); // Tempo da animação de saída
  };

  return (
    <div className={`fixed inset-0 z-50 flex flex-col transition-all duration-300 ${
      isClosing ? 'animate-slide-down' : 'animate-slide-up'
    } bg-white`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-50 border-b shadow-sm">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-gray-900 truncate">
            {articleTitle}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Baixar</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={loading}
            className="flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Fechar</span>
          </Button>
        </div>
      </div>

            {/* Controls */}
      <div className="flex items-center justify-between p-3 bg-gray-100 border-b">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousPage}
            disabled={pageNumber <= 1}
            className="flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Anterior</span>
          </Button>
          
          <span className="text-sm font-medium px-2">
            {pageNumber} de {numPages}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={pageNumber >= numPages}
            className="flex items-center gap-1"
          >
            <span className="hidden sm:inline">Próxima</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomOut}
            disabled={scale <= 0.5}
            className="flex items-center gap-1"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          
          <span className="text-sm font-medium px-2 min-w-[60px] text-center">
            {Math.round(scale * 100)}%
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            disabled={scale >= 3.0}
            className="flex items-center gap-1"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRotate}
            className="flex items-center gap-1"
          >
            <RotateCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Swipe Indicator */}
      <div className="px-3 py-2 bg-blue-50 border-b border-blue-200">
        <div className="flex items-center justify-center gap-2 text-xs text-blue-600">
          <ChevronLeft className="w-3 h-3" />
          <span>Deslize para navegar entre páginas</span>
          <ChevronRight className="w-3 h-3" />
        </div>
      </div>

      {/* Content */}
      <div 
        ref={contentRef}
        className="flex-1 overflow-auto bg-gray-50"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-sm text-gray-600">Carregando PDF...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3 text-center">
              <p className="text-sm text-red-600">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
              >
                Tentar novamente
              </Button>
            </div>
          </div>
        )}

                 {pdfFile && !loading && (
           <div className="flex justify-center p-4">
             <Document
               file={pdfFile}
               onLoadSuccess={handleDocumentLoadSuccess}
               onLoadError={(error) => {
                 console.error('[PDFViewerMobile] Erro ao carregar documento:', {
                   error,
                   articleId,
                   blobSize: pdfFile.size,
                   blobType: pdfFile.type
                 });
               }}
               loading={
                 <div className="flex items-center justify-center p-8">
                   <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                 </div>
               }
               error={
                 <div className="text-center p-8">
                   <p className="text-red-600">Erro ao carregar o PDF</p>
                   <p className="text-sm text-gray-500 mt-2">Verifique o console para mais detalhes</p>
                 </div>
               }
             >
               <Page
                 pageNumber={Math.max(1, Math.min(pageNumber, numPages))}
                 scale={scale}
                 rotate={rotation}
                 className="shadow-lg"
                 renderTextLayer={true}
                 renderAnnotationLayer={true}
                 onLoadError={(error) => {
                   console.error('[PDFViewerMobile] Erro ao carregar página:', {
                     error,
                     pageNumber,
                     numPages,
                     articleId
                   });
                 }}
                 onRenderSuccess={() => {
                   console.log('[PDFViewerMobile] Página renderizada com sucesso:', {
                     pageNumber,
                     numPages,
                     scale,
                     rotation,
                     articleId
                   });
                 }}
               />
             </Document>
           </div>
         )}
      </div>
    </div>
  );
};

export default PdfViewerMobile;
