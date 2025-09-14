"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, Maximize2 } from 'lucide-react';
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
  
  // Refs para pinch-to-zoom e pan
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pointerInitialDistance = useRef<number>(0);
  const initialScale = useRef<number>(1.0);
  const pinchFocalContentRef = useRef<{ x: number; y: number } | null>(null);
  const lastPanPointRef = useRef<{ x: number; y: number } | null>(null);
  const pageWrapperRef = useRef<HTMLDivElement>(null);
  const baseSizeRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });

  // Atualizar initialScale quando scale mudar
  useEffect(() => {
    initialScale.current = zoom;
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

  // Listener para redimensionamento da tela
  useEffect(() => {
    const handleResize = () => {
      if (numPages > 0) {
        calculateInitialZoom();
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [numPages]);

  const handleDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    console.log('[PDFViewerMobile] Documento carregado com sucesso:', {
      numPages,
      articleId,
      articleTitle
    });
    setNumPages(numPages);
    setPageNumber(1);
    
    // Calcular zoom inicial para caber a página na tela
    setTimeout(() => {
      calculateInitialZoom();
    }, 100); // Pequeno delay para garantir que o DOM esteja renderizado
  };

  const calculateInitialZoom = () => {
    const container = contentRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const containerWidth = containerRect.width - 32; // Subtrair padding
    const containerHeight = containerRect.height - 32; // Subtrair padding

    // Proporção padrão de página A4 (210x297mm = 0.707)
    const pageAspectRatio = 0.707;
    
    // Calcular dimensões da página baseadas na largura do container
    const pageWidth = containerWidth;
    const pageHeight = pageWidth / pageAspectRatio;
    
    // Se a altura da página for maior que o container, ajustar pela altura
    let finalZoom = 1.0;
    if (pageHeight > containerHeight) {
      finalZoom = containerHeight / pageHeight;
    }
    
    // Garantir que o zoom não seja muito pequeno (mínimo 0.6) nem muito grande (máximo 2.0)
    finalZoom = Math.max(0.6, Math.min(finalZoom, 2.0));
    
    console.log('[PDFViewerMobile] Calculando zoom inicial:', {
      containerWidth,
      containerHeight,
      pageWidth,
      pageHeight,
      finalZoom
    });
    
    setZoom(finalZoom);
    setTranslateX(0);
    setTranslateY(0);
  };

  const handlePreviousPage = () => {
    setPageNumber(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setPageNumber(prev => Math.min(prev + 1, numPages));
  };

  const clampTranslate = useCallback((tx: number, ty: number, z: number) => {
    // Comportamento igual para todos os zooms - sempre permitir movimento livre
    // Como funciona no zoom 100%, funciona em todos os zooms
    return { x: tx, y: ty };
  }, []);

  const handleZoomIn = () => {
    const newZ = Math.min(zoom + 0.2, 3.0);
    // Com transformOrigin: 'center center', o zoom mantém a posição central
    // Não precisamos recalcular translate, apenas aplicar o novo zoom
    setZoom(newZ);
  };

  const handleZoomOut = () => {
    const newZ = Math.max(zoom - 0.2, 0.6); // Permitir zoom até 0.6 (60%)
    // Com transformOrigin: 'center center', o zoom mantém a posição central
    // Não precisamos recalcular translate, apenas aplicar o novo zoom
    setZoom(newZ);
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleResetView = () => {
    setTranslateX(0);
    setTranslateY(0);
    setRotation(0);
    calculateInitialZoom();
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
      // Ponto focal: centro entre os dois dedos
      const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      pinchFocalContentRef.current = { x: mid.x, y: mid.y };
    } else if (activePointers.current.size === 1) {
      lastPanPointRef.current = { x: e.clientX, y: e.clientY };
    }
  }, [zoom]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!activePointers.current.has(e.pointerId)) return;
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // PINCH TO ZOOM - Solução simples e definitiva
    if (activePointers.current.size >= 2 && pointerInitialDistance.current > 0) {
      e.preventDefault();
      const [p1, p2] = Array.from(activePointers.current.values());
      const currentDistance = getPointerDistance(p1, p2);
      if (!isFinite(currentDistance) || currentDistance <= 0) return;
      
      // Calcular novo zoom com sensibilidade muito baixa
      const scaleFactor = currentDistance / pointerInitialDistance.current;
      // Aplicar suavização extrema (0.2 = muito menos sensível)
      const smoothedScaleFactor = 1 + (scaleFactor - 1) * 0.2;
      const newScale = Math.max(0.6, Math.min(3.0, initialScale.current * smoothedScaleFactor));
      
      // Ponto focal: centro atual entre os dedos
      const currentMid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      const focal = pinchFocalContentRef.current;
      
      if (focal && contentRef.current) {
        // Obter dimensões do container
        const containerRect = contentRef.current.getBoundingClientRect();
        const containerCenterX = containerRect.left + containerRect.width / 2;
        const containerCenterY = containerRect.top + containerRect.height / 2;
        
        // Calcular coordenadas relativas ao centro do container
        const relativeX = currentMid.x - containerCenterX;
        const relativeY = currentMid.y - containerCenterY;
        
        // Fórmula corrigida para zoom in e zoom out
        const scaleRatio = newScale / zoom;
        
        // Calcular novo translate mantendo o ponto focal fixo
        const newTranslateX = translateX + relativeX * (1 - scaleRatio);
        const newTranslateY = translateY + relativeY * (1 - scaleRatio);
        
        setZoom(newScale);
        setTranslateX(newTranslateX);
        setTranslateY(newTranslateY);
      }
    } 
    // PAN - Movimento com um dedo
    else if (activePointers.current.size === 1 && lastPanPointRef.current) {
      e.preventDefault();
      const last = lastPanPointRef.current;
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      
      setTranslateX(translateX + dx);
      setTranslateY(translateY + dy);
      lastPanPointRef.current = { x: e.clientX, y: e.clientY };
    }
  }, [zoom, translateX, translateY]);

  const endPointerPinchIfNeeded = () => {
    if (activePointers.current.size < 2) {
      pointerInitialDistance.current = 0;
      pinchFocalContentRef.current = null;
    }
  };

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    activePointers.current.delete(e.pointerId);
    try { (e.currentTarget as HTMLDivElement).releasePointerCapture?.(e.pointerId); } catch {}
    endPointerPinchIfNeeded();
    if (activePointers.current.size === 0) {
      lastPanPointRef.current = null;
    }
  }, []);

  const handlePointerCancel = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    activePointers.current.delete(e.pointerId);
    try { (e.currentTarget as HTMLDivElement).releasePointerCapture?.(e.pointerId); } catch {}
    endPointerPinchIfNeeded();
    if (activePointers.current.size === 0) {
      lastPanPointRef.current = null;
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
            disabled={zoom <= 0.6}
            className="flex items-center gap-1"
          >
            <ZoomOut className="w-4 h-4" />
            <span className="hidden sm:inline">Zoom -</span>
          </Button>

          <span className="text-sm font-medium px-2 min-w-[3rem] text-center">
            {Math.round(zoom * 100)}%
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            disabled={zoom >= 3.0}
            className="flex items-center gap-1"
          >
            <ZoomIn className="w-4 h-4" />
            <span className="hidden sm:inline">Zoom +</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleResetView}
            className="flex items-center gap-1"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
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
                   transformOrigin: 'center center',
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
                         console.log('[PDFViewerMobile] Base size atualizado:', baseSizeRef.current);
                       }
                     }
                     
                     // Fallback: usar dimensões do container se canvas não estiver disponível
                     if (!baseSizeRef.current.width || !baseSizeRef.current.height) {
                       const containerRect = contentRef.current?.getBoundingClientRect();
                       if (containerRect) {
                         baseSizeRef.current = { 
                           width: containerRect.width - 32, // Subtrair padding
                           height: containerRect.height - 32 
                         };
                         console.log('[PDFViewerMobile] Base size fallback:', baseSizeRef.current);
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
