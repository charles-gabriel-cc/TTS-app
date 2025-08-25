"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download, Loader2 } from 'lucide-react';
import { api } from '@/services/api';

interface PdfViewerProps {
  articleId: string;
  articleTitle: string;
  onClose: () => void;
}

const PdfViewer: React.FC<PdfViewerProps> = ({ articleId, articleTitle, onClose }) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadPdf = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Usar URL direta para visualização em iframe
        const url = api.getPDFViewUrl(articleId);
        setPdfUrl(url);
        
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
              onClick={onClose}
              className="flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Fechar
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 relative">
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

          {pdfUrl && !isLoading && (
            <iframe
              src={pdfUrl}
              title={articleTitle}
              className="w-full h-full border-0"
              style={{ minHeight: '600px' }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default PdfViewer;
