"use client";

import React, { useState, useCallback } from "react";
import { ChatInput } from "./ChatInput";

export function ChatInputExample() {
  const [inputValue, setInputValue] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioOutputEnabled, setAudioOutputEnabled] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);

  const handleSend = useCallback(() => {
    if (inputValue.trim()) {
      setMessages(prev => [...prev, `Usuário: ${inputValue}`]);
      setInputValue("");
      console.log("Mensagem enviada:", inputValue);
    }
  }, [inputValue]);

  const handleStartRecording = useCallback(() => {
    setIsRecording(true);
    setRecordingDuration(0);
    console.log("Iniciando gravação...");
  }, []);

  const handleStopRecording = useCallback((audioBlob: Blob) => {
    setIsRecording(false);
    setRecordingDuration(0);
    console.log("Gravação finalizada, áudio recebido:", audioBlob);
    
    // Aqui você pode processar o áudio (enviar para API, etc.)
    setMessages(prev => [...prev, "Usuário: [Mensagem de áudio]"]);
  }, []);

  const handleCancelRecording = useCallback(() => {
    setIsRecording(false);
    setRecordingDuration(0);
    console.log("Gravação cancelada");
  }, []);

  const handleToggleAudioOutput = useCallback((enabled: boolean) => {
    setAudioOutputEnabled(enabled);
    console.log("Saída de áudio:", enabled ? "ativada" : "desativada");
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">
          Exemplo de Uso do ChatInput
        </h1>
        
        {/* Área de mensagens */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-4 h-64 overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-white/60 text-center">Nenhuma mensagem ainda...</p>
          ) : (
            messages.map((message, index) => (
              <div key={index} className="text-white mb-2 p-2 bg-white/5 rounded">
                {message}
              </div>
            ))
          )}
        </div>

        {/* Componente ChatInput */}
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSend}
          isRecording={isRecording}
          recordingDuration={recordingDuration}
          onStartRecording={handleStartRecording}
          onStopRecording={handleStopRecording}
          onCancelRecording={handleCancelRecording}
          audioOutputEnabled={audioOutputEnabled}
          onToggleAudioOutput={handleToggleAudioOutput}
          placeholder="Digite sua mensagem aqui..."
          showAudioToggle={true}
        />
      </div>
    </div>
  );
}

// Exemplo de uso mais simples, sem gravação de áudio
export function SimpleChatInputExample() {
  const [inputValue, setInputValue] = useState("");

  const handleSend = useCallback(() => {
    if (inputValue.trim()) {
      console.log("Mensagem enviada:", inputValue);
      setInputValue("");
    }
  }, [inputValue]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">
          ChatInput Simples (Sem Áudio)
        </h1>
        
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSend}
          isRecording={false}
          recordingDuration={0}
          onStartRecording={() => {}}
          onStopRecording={() => {}}
          onCancelRecording={() => {}}
          audioOutputEnabled={false}
          onToggleAudioOutput={() => {}}
          showAudioToggle={false} // Oculta o toggle de áudio
          placeholder="Digite algo..."
        />
      </div>
    </div>
  );
}
