"use client";

import React, { useState } from "react";
import ChatWithGallery from "./ChatWithGallery";
import ModernChatInterface from "./ModernChatInterface";
import { ChatProvider, useChatContext } from "@/contexts/ChatContext";
import { motion, AnimatePresence } from "framer-motion";

function ChatWithGalleryExampleContent() {
  const [currentView, setCurrentView] = useState<'gallery' | 'chat'>('gallery');
  const { setPendingMessage } = useChatContext();

  const handleNavigateToChat = (message?: string) => {
    console.log("Navegando para chat com mensagem:", message);
    setCurrentView('chat');
    if (message) {
      setPendingMessage(message);
    }
  };

  const handleBackToGallery = () => {
    setCurrentView('gallery');
  };

  return (
    <div className="h-screen overflow-hidden">
      {/* Fundo consistente que não muda durante a transição */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 via-teal-500 via-cyan-500 via-purple-500 via-violet-500 to-pink-500"></div>
      
      <AnimatePresence>
        {currentView === 'gallery' && (
          <motion.div
            key="gallery"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ 
              opacity: 0, 
              y: -20,
              transition: { duration: 0.3, ease: "easeInOut" }
            }}
            transition={{ 
              duration: 0.4, 
              ease: [0.4, 0.0, 0.2, 1]
            }}
            className="absolute inset-0 z-10"
          >
            <ChatWithGallery onNavigateToChat={handleNavigateToChat} />
          </motion.div>
        )}
        
        {currentView === 'chat' && (
          <motion.div
            key="chat"
            initial={{ 
              opacity: 0, 
              y: 20
            }}
            animate={{ 
              opacity: 1, 
              y: 0
            }}
            exit={{ 
              opacity: 0, 
              y: -20,
              transition: { duration: 0.3, ease: "easeInOut" }
            }}
            transition={{ 
              duration: 0.4, 
              ease: [0.4, 0.0, 0.2, 1],
              delay: 0.1
            }}
            className="absolute inset-0 z-10"
          >
            <ModernChatInterface />
            <motion.button
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.3, ease: "easeOut" }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleBackToGallery}
              className="fixed top-4 left-4 z-50 bg-black/20 backdrop-blur-sm text-white px-4 py-2 rounded-lg border border-white/10 hover:bg-black/40 transition-colors"
            >
              ← Voltar à Galeria
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Exemplo com contexto
export function ChatWithGalleryExample() {
  return (
    <ChatProvider>
      <ChatWithGalleryExampleContent />
    </ChatProvider>
  );
}

// Exemplo simples sem navegação
export function SimpleChatWithGalleryExample() {
  return (
    <ChatProvider>
      <ChatWithGallery />
    </ChatProvider>
  );
}
