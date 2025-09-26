"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Images, MessageCircle, PlayCircle, ArrowLeft } from "lucide-react";

type SelectionScreenProps = {
  isVisible: boolean;
  onSelectGallery: () => void;
  onSelectChat: () => void;
  onSelectVideo: () => void;
  onBackToIdle?: () => void;
};

export default function SelectionScreen({ isVisible, onSelectGallery, onSelectChat, onSelectVideo, onBackToIdle }: SelectionScreenProps) {
  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-6">
      {onBackToIdle && (
        <div className="absolute top-6 left-6">
          <Button
            variant="ghost"
            size="sm"
            className="text-white/80 hover:text-white hover:bg-white/10"
            onClick={onBackToIdle}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>
      )}
      <div className="w-full max-w-3xl bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-semibold text-white">Como deseja continuar?</h2>
          <p className="text-white/70 mt-2"></p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            variant="outline"
            onClick={onSelectGallery}
            className="h-28 md:h-32 bg-white/5 hover:bg-white/10 border-white/20 text-white flex flex-col items-center justify-center gap-3"
          >
            <Images className="w-6 h-6" />
            <span className="text-base">Galeria de Artigos</span>
          </Button>

          <Button
            variant="outline"
            onClick={onSelectChat}
            className="h-28 md:h-32 bg-white/5 hover:bg-white/10 border-white/20 text-white flex flex-col items-center justify-center gap-3"
          >
            <MessageCircle className="w-6 h-6" />
            <span className="text-base">Chat sobre professores</span>
          </Button>

          <Button
            variant="outline"
            onClick={onSelectVideo}
            className="h-28 md:h-32 bg-white/5 hover:bg-white/10 border-white/20 text-white flex flex-col items-center justify-center gap-3"
          >
            <PlayCircle className="w-6 h-6" />
            <span className="text-base">Conheça o CCEN (em breve)</span>
          </Button>
        </div>
      </div>
    </div>
  );
}


