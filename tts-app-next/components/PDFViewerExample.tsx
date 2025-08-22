"use client";

import React, { useState } from 'react';
import PDFViewer, { PDFPreview } from './PDFViewer';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, X } from 'lucide-react';

export default function PDFViewerExample() {
  const [showViewer, setShowViewer] = useState(false);
  const [selectedPDF, setSelectedPDF] = useState<{
    url: string;
    title: string;
  } | null>(null);

  const pdfExamples = [
    {
      url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      title: 'PDF de Exemplo 1'
    },
    {
      url: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf',
      title: 'PDF de Exemplo 2'
    }
  ];

  const handlePDFClick = (pdf: typeof pdfExamples[0]) => {
    setSelectedPDF(pdf);
    setShowViewer(true);
  };

  const handleCloseViewer = () => {
    setShowViewer(false);
    setSelectedPDF(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white mb-2">
          Exemplo do PDF Viewer
        </h1>
        <p className="text-white/70">
          Clique em um PDF para visualizá-lo no viewer
        </p>
      </div>

      {/* Grid de PDFs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pdfExamples.map((pdf, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <PDFPreview
              url={pdf.url}
              title={pdf.title}
              onClick={() => handlePDFClick(pdf)}
            />
          </motion.div>
        ))}
      </div>

      {/* Modal do PDF Viewer */}
      <AnimatePresence>
        {showViewer && selectedPDF && (
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-6xl max-h-[90vh] overflow-hidden"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <PDFViewer
                url={selectedPDF.url}
                title={selectedPDF.title}
                onClose={handleCloseViewer}
                showControls={true}
                initialPage={1}
                initialScale={1.0}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Informações sobre o componente */}
      <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-cyan-400" />
          Funcionalidades do PDF Viewer
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-white/80">
          <div>
            <h3 className="font-medium text-white mb-2">Controles de Navegação</h3>
            <ul className="space-y-1">
              <li>• Navegação entre páginas</li>
              <li>• Zoom in/out (50% - 300%)</li>
              <li>• Rotação do documento</li>
              <li>• Download do PDF</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-medium text-white mb-2">Recursos Técnicos</h3>
            <ul className="space-y-1">
              <li>• Carregamento assíncrono</li>
              <li>• Tratamento de erros</li>
              <li>• Responsivo para mobile</li>
              <li>• Animações suaves</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
