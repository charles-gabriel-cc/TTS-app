"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Plus, MessageCircle, Users, BookOpen, X } from "lucide-react";
import ChatSession from "./ChatSession";
import { useChatContext } from "@/contexts/ChatContext";

interface ChatTab {
  id: string;
  name: string;
  type: 'general' | 'academic' | 'research';
}

export default function MultiChatExample() {
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [tabs, setTabs] = useState<ChatTab[]>([
    { id: 'general', name: 'Chat Geral', type: 'general' },
    { id: 'academic', name: 'Aconselhamento Acadêmico', type: 'academic' },
    { id: 'research', name: 'Pesquisa e Publicações', type: 'research' }
  ]);

  const { createSession, sessions } = useChatContext();

  const handleCreateNewChat = () => {
    const newTabId = `chat_${Date.now()}`;
    const newTab: ChatTab = {
      id: newTabId,
      name: `Novo Chat ${tabs.length + 1}`,
      type: 'general'
    };
    
    setTabs(prev => [...prev, newTab]);
    createSession(newTab.name);
    setActiveTab(newTabId);
  };

  const handleCloseTab = (tabId: string) => {
    setTabs(prev => prev.filter(tab => tab.id !== tabId));
    if (activeTab === tabId) {
      setActiveTab(tabs[0]?.id || null);
    }
  };

  const getChatConfig = (type: string) => {
    switch (type) {
      case 'academic':
        return {
          title: "Aconselhamento Acadêmico",
          description: "Obtenha orientações sobre cursos, disciplinas e carreira acadêmica",
          suggestedActions: [
            { id: "1", text: "Quais disciplinas devo cursar primeiro?" },
            { id: "2", text: "Como funciona o sistema de créditos?" },
            { id: "3", text: "Quais são as opções de pós-graduação?" },
            { id: "4", text: "Como posso participar de projetos de pesquisa?" }
          ]
        };
      case 'research':
        return {
          title: "Pesquisa e Publicações",
          description: "Informações sobre pesquisas, publicações e grupos de estudo",
          suggestedActions: [
            { id: "1", text: "Quais são as linhas de pesquisa ativas?" },
            { id: "2", text: "Como posso publicar um artigo científico?" },
            { id: "3", text: "Quais são os grupos de pesquisa disponíveis?" },
            { id: "4", text: "Como funciona a colaboração internacional?" }
          ]
        };
      default:
        return {
          title: "Assistente Virtual do CCEN",
          description: "Conheça os professores do CCEN. Obtenha informações sobre os professores, suas áreas de atuação, acesso aos seus currículos lattes e outras informações.",
          suggestedActions: [
            { id: "1", text: "Conte-me sobre os professores do CCEN" },
            { id: "2", text: "Quais são as áreas de pesquisa?" },
            { id: "3", text: "Como acessar currículos?" },
            { id: "4", text: "Fale sobre as publicações científicas" }
          ]
        };
    }
  };

  const getTabIcon = (type: string) => {
    switch (type) {
      case 'academic':
        return <BookOpen className="w-4 h-4" />;
      case 'research':
        return <Users className="w-4 h-4" />;
      default:
        return <MessageCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-emerald-400 via-teal-500 via-cyan-500 via-purple-500 via-violet-500 to-pink-500">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-xl border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white">Múltiplos Chats</h1>
          <Button
            onClick={handleCreateNewChat}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Chat
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-black/10 backdrop-blur-sm border-b border-white/10 p-2">
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${activeTab === tab.id 
                  ? 'bg-white/20 text-white border border-white/30' 
                  : 'bg-white/5 text-white/70 hover:bg-white/10 border border-transparent'
                }
              `}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {getTabIcon(tab.type)}
              <span className="truncate">{tab.name}</span>
              {tabs.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseTab(tab.id);
                  }}
                  className="ml-2 hover:bg-white/20 rounded-full p-1"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Chat Content */}
      <div className="flex-1 relative">
        <AnimatePresence mode="wait">
          {activeTab && (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0"
            >
              <ChatSession
                sessionId={activeTab}
                sessionName={tabs.find(t => t.id === activeTab)?.name}
                {...getChatConfig(tabs.find(t => t.id === activeTab)?.type || 'general')}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {!activeTab && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-white/70">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h2 className="text-xl font-semibold mb-2">Nenhum chat selecionado</h2>
              <p className="text-sm">Selecione um chat existente ou crie um novo</p>
            </div>
          </div>
        )}
      </div>

      {/* Session Info */}
      <div className="bg-black/20 backdrop-blur-sm border-t border-white/10 p-2">
        <div className="text-xs text-white/60 text-center">
          {sessions.length} sessão{sessions.length !== 1 ? 'ões' : ''} ativa{sessions.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}
