"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@/services/api';

interface PDFArticle {
  id: string;
  filename: string;
  title: string;
  author: string;
  size: number;
  url: string;
}

interface GalleryContextType {
  // Dados da galeria
  pdfArticles: PDFArticle[];
  loading: boolean;
  error: string | null;
  
  // Funções para gerenciar o cache
  refreshGallery: () => Promise<void>;
  clearCache: () => void;
  
  // Estado do cache
  isCached: boolean;
  lastFetch: Date | null;
}

const GalleryContext = createContext<GalleryContextType | undefined>(undefined);

export function GalleryProvider({ children }: { children: ReactNode }) {
  const [pdfArticles, setPdfArticles] = useState<PDFArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  // Função para buscar artigos da API
  const fetchArticles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const articles = await api.getPDFArticles();
      setPdfArticles(articles);
      setIsCached(true);
      setLastFetch(new Date());
      
      console.log(`[Gallery Cache] ${articles.length} artigos carregados e cacheados`);
      
    } catch (err) {
      console.error('Erro ao buscar artigos:', err);
      setError('Erro ao carregar artigos');
      setIsCached(false);
    } finally {
      setLoading(false);
    }
  };

  // Função para forçar refresh da galeria
  const refreshGallery = async () => {
    console.log('[Gallery Cache] Forçando refresh da galeria...');
    setIsCached(false);
    await fetchArticles();
  };

  // Função para limpar cache
  const clearCache = () => {
    console.log('[Gallery Cache] Cache limpo');
    setPdfArticles([]);
    setIsCached(false);
    setLastFetch(null);
    setError(null);
  };

  // Carregar artigos na primeira vez que o contexto for usado
  useEffect(() => {
    if (!isCached && !loading) {
      console.log('[Gallery Cache] Carregando galeria pela primeira vez...');
      fetchArticles();
    }
  }, []);

  return (
    <GalleryContext.Provider value={{
      pdfArticles,
      loading,
      error,
      refreshGallery,
      clearCache,
      isCached,
      lastFetch
    }}>
      {children}
    </GalleryContext.Provider>
  );
}

export function useGalleryContext() {
  const context = useContext(GalleryContext);
  if (context === undefined) {
    throw new Error('useGalleryContext must be used within a GalleryProvider');
  }
  return context;
}
