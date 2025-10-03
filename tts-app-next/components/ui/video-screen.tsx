"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2, VolumeX, Maximize } from "lucide-react";

type VideoScreenProps = {
  isVisible: boolean;
  onBack: () => void;
};

// Configuração do vídeo - facilita a troca futura
const VIDEO_CONFIG = {
  // Para usar o vídeo oficial, substitua o src abaixo
  src: "/videos/teste.mp4", // Vídeo atual
  // src: "/videos/video-oficial.mp4", // Descomente quando tiver o vídeo oficial
  title: "Vídeo Introdutório - CCEN",
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

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

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

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

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
              className="absolute inset-0 w-full h-full object-contain bg-black"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onClick={togglePlay}
            />

            {/* Video Controls Overlay - Responsivo */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg">
              <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4 lg:p-6">
                {/* Progress Bar */}
                <div className="mb-3 md:mb-4 lg:mb-6">
                  <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1 md:h-2 bg-white/30 rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 md:space-x-4 lg:space-x-6">
                    <button
                      onClick={togglePlay}
                      className="p-2 md:p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5 md:w-6 md:h-6 lg:w-8 lg:h-8 text-white" />
                      ) : (
                        <Play className="w-5 h-5 md:w-6 md:h-6 lg:w-8 lg:h-8 text-white" />
                      )}
                    </button>

                    <button
                      onClick={toggleMute}
                      className="p-2 md:p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                    >
                      {isMuted ? (
                        <VolumeX className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-white" />
                      ) : (
                        <Volume2 className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-white" />
                      )}
                    </button>

                    <span className="text-white text-xs md:text-sm lg:text-lg font-medium hidden sm:block">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>

                  <button
                    onClick={toggleFullscreen}
                    className="p-2 md:p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                  >
                    <Maximize className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-white" />
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          border: 2px solid #000;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          border: 2px solid #000;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }

        .slider::-webkit-slider-track {
          height: 4px;
          border-radius: 2px;
        }
        
        .slider::-moz-range-track {
          height: 4px;
          border-radius: 2px;
        }

        @media (min-width: 768px) {
          .slider::-webkit-slider-thumb {
            width: 18px;
            height: 18px;
            border: 3px solid #000;
          }
          
          .slider::-moz-range-thumb {
            width: 18px;
            height: 18px;
            border: 3px solid #000;
          }

          .slider::-webkit-slider-track {
            height: 6px;
            border-radius: 3px;
          }
          
          .slider::-moz-range-track {
            height: 6px;
            border-radius: 3px;
          }
        }

        @media (min-width: 1024px) {
          .slider::-webkit-slider-thumb {
            width: 20px;
            height: 20px;
          }
          
          .slider::-moz-range-thumb {
            width: 20px;
            height: 20px;
          }

          .slider::-webkit-slider-track {
            height: 8px;
            border-radius: 4px;
          }
          
          .slider::-moz-range-track {
            height: 8px;
            border-radius: 4px;
          }
        }
      `}</style>
    </div>
  );
}


