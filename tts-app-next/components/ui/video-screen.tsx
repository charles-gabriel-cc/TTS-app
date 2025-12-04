"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
// Imports de ícones removidos - controles não são mais exibidos

type VideoScreenProps = {
  isVisible: boolean;
  onBack: () => void;
};

// Configuração do vídeo - facilita a troca futura
const VIDEO_CONFIG = {
  // Para usar o vídeo oficial, substitua o src abaixo
  src: "/videos/videoccen.mp4", // Vídeo atual
  // src: "/videos/video-oficial.mp4", // Descomente quando tiver o vídeo oficial
  title: "Conheça o CCEN",
  description: "Conheça mais sobre o Centro de Ciências Exatas e da Natureza"
};

export default function VideoScreen({ isVisible, onBack }: VideoScreenProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!isVisible) return null;

  // Funções de controle removidas - vídeo reproduz automaticamente sem interação do usuário

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  // Função handleSeek removida - não há mais controles de progresso

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Autoplay quando o componente for montado
  useEffect(() => {
    if (isVisible && videoRef.current) {
      const playVideo = async () => {
        try {
          // Garantir que o vídeo não esteja mutado
          if (videoRef.current) {
            videoRef.current.muted = false;
            setIsMuted(false);
          }
          await videoRef.current?.play();
          setIsPlaying(true);
        } catch (error) {
          console.log('Autoplay falhou:', error);
          // Se o autoplay falhar (políticas do navegador), o usuário pode clicar para reproduzir
        }
      };
      playVideo();
    }
  }, [isVisible]);

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 z-20 flex flex-col overflow-hidden"
    >
      {/* Background - Mesmo padrão do app */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 via-teal-500 via-cyan-500 via-purple-500 via-violet-500 to-pink-500 dark:from-green-600 dark:via-teal-700 dark:via-blue-700 dark:via-purple-700 dark:to-pink-600"></div>
        <div className="absolute inset-0 bg-gradient-to-tl from-green-400 via-emerald-500 via-teal-500 to-cyan-400 opacity-35"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-green-500 via-emerald-400 via-teal-400 via-blue-500 to-purple-600 opacity-25"></div>
        <div className="absolute inset-0 bg-gradient-to-bl from-purple-400 via-violet-500 via-fuchsia-500 to-pink-500 opacity-30"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 border-b border-white/10 bg-black/20 backdrop-blur-xl p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 md:space-x-4">
            <Button 
              variant="ghost" 
              onClick={onBack} 
              className="text-white hover:bg-white/20 px-2 py-1 md:px-3 md:py-2 text-sm md:text-base"
            >
              ← Voltar
            </Button>
            <div>
              <h2 className="text-lg md:text-xl lg:text-2xl font-semibold text-white">
                {VIDEO_CONFIG.title}
              </h2>
              <p className="text-white/70 text-xs md:text-sm mt-1 hidden sm:block">
                {VIDEO_CONFIG.description}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Video Container - Responsivo */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-4 md:p-6">
        <div className="relative w-full max-w-6xl group">
          {/* Video com aspect ratio responsivo */}
          <div className="relative w-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden" style={{ paddingBottom: '56.25%' /* 16:9 aspect ratio */ }}>
            <video
              ref={videoRef}
              src={VIDEO_CONFIG.src}
              className="absolute inset-0 w-full h-full object-contain bg-black pointer-events-none"
              autoPlay
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={onBack}
            />

            {/* Video Controls Overlay - OCULTADO */}
            {/* Controles removidos para impedir interação do usuário */}

          </div>
        </div>
      </div>

      {/* Estilos CSS removidos - controles não são mais exibidos */}
    </div>
  );
}


