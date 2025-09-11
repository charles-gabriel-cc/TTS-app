"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
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
  // Zoom/Pan por CSS transform para suavidade
  const [zoom, setZoom] = useState<number>(1.0);
  const [translateX, setTranslateX] = useState<number>(0);
  const [translateY, setTranslateY] = useState<number>(0);
  const [rotation, setRotation] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState<boolean>(false);
  
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Refs para detecção de pinch-to-zoom
  const initialDistance = useRef<number>(0);
  const initialScale = useRef<number>(1.0);
  const isPinching = useRef<boolean>(false);
  // Pointer Events: rastrear múltiplos ponteiros para pinch no Android
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pointerInitialDistance = useRef<number>(0);
  const initialZoomRef = useRef<number>(1.0);
  const initialTranslateRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pinchFocalContentRef = useRef<{ x: number; y: number } | null>(null);
  const lastPanPointRef = useRef<{ x: number; y: number } | null>(null);
  const isPanningRef = useRef<boolean>(false);
  const pageWrapperRef = useRef<HTMLDivElement>(null);
  const baseSizeRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });

  // Atualizar initialScale quando scale mudar
  useEffect(() => {
    if (!isPinching.current) {
      initialScale.current = zoom;
    }
  }, [zoom]);



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

  const clampTranslate = useCallback((tx: number, ty: number, z: number) => {
    const containerRect = contentRef.current?.getBoundingClientRect();
    const baseWidth = baseSizeRef.current.width;
    const baseHeight = baseSizeRef.current.height;
    if (!containerRect || !baseWidth || !baseHeight) return { x: tx, y: ty };
    const scaledWidth = baseWidth * z;
    const scaledHeight = baseHeight * z;
    const minX = Math.min(0, containerRect.width - scaledWidth);
    const minY = Math.min(0, containerRect.height - scaledHeight);
    const maxX = 0;
    const maxY = 0;
    return {
      x: Math.min(maxX, Math.max(minX, tx)),
      y: Math.min(maxY, Math.max(minY, ty)),
    };
  }, []);

  const handleZoomIn = () => {
    const newZ = Math.min(zoom + 0.2, 3.0);
    const containerRect = contentRef.current?.getBoundingClientRect();
    const center = containerRect ? { x: containerRect.width / 2, y: containerRect.height / 2 } : { x: 0, y: 0 };
    const contentPoint = { x: (center.x - translateX) / zoom, y: (center.y - translateY) / zoom };
    const newTranslate = { x: center.x - contentPoint.x * newZ, y: center.y - contentPoint.y * newZ };
    const clamped = clampTranslate(newTranslate.x, newTranslate.y, newZ);
    setZoom(newZ);
    setTranslateX(clamped.x);
    setTranslateY(clamped.y);
  };

  const handleZoomOut = () => {
    const newZ = Math.max(zoom - 0.2, 1.0);
    const containerRect = contentRef.current?.getBoundingClientRect();
    const center = containerRect ? { x: containerRect.width / 2, y: containerRect.height / 2 } : { x: 0, y: 0 };
    const contentPoint = { x: (center.x - translateX) / zoom, y: (center.y - translateY) / zoom };
    const newTranslate = { x: center.x - contentPoint.x * newZ, y: center.y - contentPoint.y * newZ };
    const clamped = clampTranslate(newTranslate.x, newTranslate.y, newZ);
    setZoom(newZ);
    setTranslateX(clamped.x);
    setTranslateY(clamped.y);
    if (newZ === 1.0) {
      setTranslateX(0);
      setTranslateY(0);
    }
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  // Removido: swipe por touch; manteremos apenas pinch-to-zoom via Pointer Events e botões de navegação

  // ===== Pointer Events para pinch-to-zoom (mais confiável no Android) =====
  const getPointerDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Capturar o ponteiro e armazenar posição
    const target = e.currentTarget as HTMLDivElement;
    try { target.setPointerCapture?.(e.pointerId); } catch {}
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.current.size === 2) {
      const [p1, p2] = Array.from(activePointers.current.values());
      pointerInitialDistance.current = getPointerDistance(p1, p2);
      initialScale.current = zoom;
      isPinching.current = true;
      initialZoomRef.current = zoom;
      initialTranslateRef.current = { x: translateX, y: translateY };
      // ponto focal em coordenadas de conteúdo
      const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      pinchFocalContentRef.current = { x: (mid.x - translateX) / zoom, y: (mid.y - translateY) / zoom };
    } else if (activePointers.current.size === 1) {
      lastPanPointRef.current = { x: e.clientX, y: e.clientY };
    }
  }, [zoom, translateX, translateY]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!activePointers.current.has(e.pointerId)) return;
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.current.size >= 2 && pointerInitialDistance.current > 0) {
      e.preventDefault();
      const [p1, p2] = Array.from(activePointers.current.values());
      const currentDistance = getPointerDistance(p1, p2);
      if (!isFinite(currentDistance) || currentDistance <= 0) return;
      const scaleFactor = currentDistance / pointerInitialDistance.current;
      const newScale = Math.max(1.0, Math.min(3.0, initialScale.current * scaleFactor));
      isPinching.current = true;
      const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      const focal = pinchFocalContentRef.current || { x: (mid.x - translateX) / (zoom || 1), y: (mid.y - translateY) / (zoom || 1) };
      const targetTranslate = { x: mid.x - focal.x * newScale, y: mid.y - focal.y * newScale };
      const clamped = clampTranslate(targetTranslate.x, targetTranslate.y, newScale);
      setZoom(prevScale => {
        const smoothed = prevScale + (newScale - prevScale) * 0.3;
        return Math.max(1.0, Math.min(3.0, smoothed));
      });
      setTranslateX(clamped.x);
      setTranslateY(clamped.y);
    } else if (activePointers.current.size === 1 && zoom > 1 && lastPanPointRef.current) {
      e.preventDefault();
      const last = lastPanPointRef.current;
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      let nextX = translateX + dx;
      let nextY = translateY + dy;
      const clamped = clampTranslate(nextX, nextY, zoom);
      setTranslateX(clamped.x);
      setTranslateY(clamped.y);
      lastPanPointRef.current = { x: e.clientX, y: e.clientY };
      isPanningRef.current = true;
    }
  }, [zoom, translateX, translateY, clampTranslate]);

  const endPointerPinchIfNeeded = () => {
    if (isPinching.current && activePointers.current.size < 2) {
      isPinching.current = false;
      pointerInitialDistance.current = 0;
    }
  };

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    activePointers.current.delete(e.pointerId);
    try { (e.currentTarget as HTMLDivElement).releasePointerCapture?.(e.pointerId); } catch {}
    endPointerPinchIfNeeded();
    if (activePointers.current.size === 0) {
      // pequeno atraso para evitar conflito com fim do gesto
      setTimeout(() => { isPanningRef.current = false; }, 50);
    }
  }, []);

  const handlePointerCancel = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    activePointers.current.delete(e.pointerId);
    try { (e.currentTarget as HTMLDivElement).releasePointerCapture?.(e.pointerId); } catch {}
    endPointerPinchIfNeeded();
    if (activePointers.current.size === 0) {
      isPanningRef.current = false;
    }
  }, []);

  // Botão de download removido no mobile

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
            onClick={handleClose}
            disabled={loading}
            className="flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Fechar</span>
          </Button>
        </div>
      </div>

      

      {/* Gesture Indicator */}
      <div className="px-3 py-2 bg-blue-50 border-b border-blue-200 relative">
        <div className="flex items-center justify-center gap-2 text-xs text-blue-600">
          <button
            onClick={handlePreviousPage}
            disabled={pageNumber <= 1}
            className="h-7 w-7 rounded-full bg-white border border-blue-200 text-blue-600 flex items-center justify-center disabled:opacity-40"
            aria-label="Página anterior"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="mx-1">Navegue pelas páginas</span>
          <button
            onClick={handleNextPage}
            disabled={pageNumber >= numPages}
            className="h-7 w-7 rounded-full bg-white border border-blue-200 text-blue-600 flex items-center justify-center disabled:opacity-40"
            aria-label="Próxima página"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        {/* Contador de páginas */}
        <div className="absolute bottom-1 right-3 text-xs text-blue-400 font-medium">
          {pageNumber} / {numPages}
        </div>
      </div>

      {/* Content */}
      <div 
        ref={contentRef}
        className="flex-1 overflow-auto bg-gray-50"
        style={{ touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
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
               <div
                 ref={pageWrapperRef}
                 style={{
                   transform: `translate(${translateX}px, ${translateY}px) scale(${zoom}) rotate(${rotation}deg)`,
                   transformOrigin: '0 0',
                   willChange: 'transform',
                 }}
               >
                 <Page
                   pageNumber={Math.max(1, Math.min(pageNumber, numPages))}
                   scale={1.0}
                   rotate={0}
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
                     // medir tamanho base da página (sem zoom)
                     const canvas = pageWrapperRef.current?.querySelector('canvas');
                     if (canvas) {
                       const rect = canvas.getBoundingClientRect();
                       if (rect.width && rect.height) {
                         baseSizeRef.current = { width: rect.width, height: rect.height };
                       }
                     }
                   }}
                 />
               </div>
             </Document>
           </div>
         )}
      </div>
    </div>
  );
};

export default PdfViewerMobile;
