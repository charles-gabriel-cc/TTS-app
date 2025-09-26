"use client";

import React from "react";
import { Button } from "@/components/ui/button";

type VideoScreenProps = {
  isVisible: boolean;
  onBack: () => void;
};

export default function VideoScreen({ isVisible, onBack }: VideoScreenProps) {
  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8 text-center">
        <h2 className="text-2xl md:text-3xl font-semibold text-white">Vídeo em breve</h2>
        <p className="text-white/70 mt-2">Este espaço exibirá um vídeo introdutório assim que estiver disponível.</p>

        <div className="mt-6">
          <Button variant="outline" onClick={onBack} className="bg-white/10 border-white/20 text-white">
            Voltar
          </Button>
        </div>
      </div>
    </div>
  );
}


