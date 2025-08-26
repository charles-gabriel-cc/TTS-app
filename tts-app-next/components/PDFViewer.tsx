"use client";

import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { X, Download, Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { api } from '@/services/api';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configuração do worker do PDF.js (mesma usada no mobile)
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;
}

interface PdfViewerProps {
  articleId: string;
  articleTitle: string;
  onClose: () => void;
}

const PdfViewer: React.FC<PdfViewerProps> = ({ articleId, articleTitle, onClose }) => {
  const [pdfFile, setPdfFile] = useState<Blob | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);



  useEffect(() => {
    const loadPdf = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const blob = await api.downloadPDF(articleId);
        setPdfFile(blob);
      } catch (err) {
        console.error('Erro ao carregar PDF:', err);
        setError('Erro ao carregar o PDF. Tente novamente.');
      } finally {
        setIsLoading(false);
      }
    };

    loadPdf();
  }, [articleId]);

  const handleDownload = async () => {
    try {
      const blob = await api.downloadPDF(articleId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${articleTitle}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao baixar PDF:', err);
      setError('Erro ao baixar o PDF.');
    }
  };

  const handleDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const handlePreviousPage = () => setPageNumber(prev => Math.max(prev - 1, 1));
  const handleNextPage = () => setPageNumber(prev => Math.min(prev + 1, numPages));
  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 3.0));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handleClose = () => onClose();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full h-full max-w-6xl max-h-[90vh] bg-white rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
          <div className="flex items-center gap-3">
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
              Baixar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClose}
              className="flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Fechar
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

        {/* Content */}
        <div className="flex-1 relative overflow-auto bg-gray-50">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <p className="text-sm text-gray-600">Carregando PDF...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
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

          {pdfFile && !isLoading && (
            <div className="flex justify-center p-4">
              <Document
                file={pdfFile}
                onLoadSuccess={handleDocumentLoadSuccess}
                onLoadError={(docError) => {
                  console.error('[PDFViewer] Erro ao carregar documento:', docError);
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
                  pageNumber={pageNumber}
                  scale={scale}
                  rotate={rotation}
                  className="shadow-lg"
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  onLoadError={(pageError) => {
                    console.error('[PDFViewer] Erro ao carregar página:', pageError);
                  }}
                />
              </Document>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PdfViewer;
