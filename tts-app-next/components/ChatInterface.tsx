'use client'

import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { v4 as uuidv4 } from 'uuid'
import AudioRecorder from './AudioRecorder'
import { api } from '@/services/api'
import { Switch } from '@mui/material'
import ReactMarkdown from 'react-markdown'

interface Message {
  id: string
  text: string
  sender: 'user' | 'assistant'
  timestamp: Date
  audio?: string // Base64 audio data
  audioFormat?: string // 'mp3' | 'wav'
}

const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  height: 100vh;
`

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const MessageBubble = styled.div<{ isUser: boolean }>`
  padding: 10px 15px;
  border-radius: 15px;
  max-width: 70%;
  align-self: ${props => props.isUser ? 'flex-end' : 'flex-start'};
  background-color: ${props => props.isUser ? '#007bff' : '#e9ecef'};
  color: ${props => props.isUser ? 'white' : 'black'};
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const AudioButton = styled.button`
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
  align-self: flex-start;

  &:hover {
    background-color: #218838;
  }
`

const InputContainer = styled.div`
  display: flex;
  gap: 10px;
  padding: 20px;
  background-color: white;
  border-top: 1px solid #dee2e6;
`

const Input = styled.input`
  flex: 1;
  padding: 10px;
  border: 1px solid #dee2e6;
  border-radius: 5px;
  font-size: 16px;
`

const Button = styled.button`
  padding: 10px 20px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;

  &:hover {
    background-color: #0056b3;
  }

  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
`

const ToggleContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px;
  background-color: white;
  border-bottom: 1px solid #dee2e6;
`

const ToggleLabel = styled.span`
  font-size: 14px;
  color: #666;
`

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [ttsEnabled, setTtsEnabled] = useState(false)
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null)
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null)

  // Função para reproduzir áudio a partir de Base64
  const playAudio = (audioBase64: string, format: string = 'mp3', messageId?: string) => {
    try {
      // Se o mesmo áudio está tocando, pausar
      if (currentAudio && playingMessageId === messageId) {
        currentAudio.pause()
        currentAudio.currentTime = 0
        setCurrentAudio(null)
        setPlayingMessageId(null)
        return
      }

      // Parar qualquer áudio que esteja tocando
      if (currentAudio) {
        currentAudio.pause()
        currentAudio.currentTime = 0
        setCurrentAudio(null)
        setPlayingMessageId(null)
      }

      // Decodificar Base64 para bytes
      const audioBytes = atob(audioBase64)
      const audioArray = new Uint8Array(audioBytes.length)
      for (let i = 0; i < audioBytes.length; i++) {
        audioArray[i] = audioBytes.charCodeAt(i)
      }
      
      // Criar blob de áudio
      const audioBlob = new Blob([audioArray], { type: `audio/${format}` })
      const audioUrl = URL.createObjectURL(audioBlob)
      
      // Criar e reproduzir elemento audio
      const audio = new Audio(audioUrl)
      setCurrentAudio(audio)
      if (messageId) {
        setPlayingMessageId(messageId)
      }
      
      audio.play()
      
      // Limpar URL quando terminar ou parar
      const cleanup = () => {
        URL.revokeObjectURL(audioUrl)
        setCurrentAudio(null)
        setPlayingMessageId(null)
      }
      
      audio.onended = cleanup
      audio.onerror = cleanup
      
    } catch (error) {
      console.error('Erro ao reproduzir áudio:', error)
      setCurrentAudio(null)
      setPlayingMessageId(null)
    }
  }

  const handleSendMessage = async () => {
    if (inputText.trim() && !isLoading) {
      setIsLoading(true)
      try {
        const userMessage: Message = {
          id: uuidv4(),
          text: inputText,
          sender: 'user',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, userMessage])
        setInputText('')

        // Enviar mensagem para o backend usando o endpoint apropriado
        const response = await api.sendChatMessage(inputText, ttsEnabled)
        
        // Adicionar resposta do assistente
        const assistantMessage: Message = {
          id: uuidv4(),
          text: response.text,
          sender: 'assistant',
          timestamp: new Date(),
          audio: response.audio,
          audioFormat: response.audioFormat
        }
        setMessages(prev => [...prev, assistantMessage])
        
        // Se há áudio e TTS está habilitado, reproduzir automaticamente
        if (response.audio && ttsEnabled) {
          playAudio(response.audio, response.audioFormat, assistantMessage.id)
        }
      } catch (error) {
        console.error('Error sending message:', error)
        const errorMessage: Message = {
          id: uuidv4(),
          text: 'Desculpe, ocorreu um erro ao processar sua mensagem.',
          sender: 'assistant',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, errorMessage])
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleAudioRecording = async (audioBlob: Blob) => {
    if (!isLoading) {
      setIsLoading(true)
      try {
        // Converter áudio em texto
        const text = await api.speechToText(audioBlob)
        
        // Adicionar mensagem do usuário
        const userMessage: Message = {
          id: uuidv4(),
          text: text,
          sender: 'user',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, userMessage])

        // Enviar mensagem para o backend
        const response = await api.sendChatMessage(text, ttsEnabled)
        
        // Adicionar resposta do assistente
        const assistantMessage: Message = {
          id: uuidv4(),
          text: response.text,
          sender: 'assistant',
          timestamp: new Date(),
          audio: response.audio,
          audioFormat: response.audioFormat
        }
        setMessages(prev => [...prev, assistantMessage])
        
        // Se há áudio e TTS está habilitado, reproduzir automaticamente
        if (response.audio && ttsEnabled) {
          playAudio(response.audio, response.audioFormat, assistantMessage.id)
        }
      } catch (error) {
        console.error('Error processing audio:', error)
        const errorMessage: Message = {
          id: uuidv4(),
          text: 'Desculpe, não consegui processar o áudio.',
          sender: 'assistant',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, errorMessage])
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSendMessage()
    }
  }

  return (
    <ChatContainer>
      <ToggleContainer>
        <ToggleLabel>Resposta com áudio</ToggleLabel>
        <Switch
          checked={ttsEnabled}
          onChange={(e) => setTtsEnabled(e.target.checked)}
          color="primary"
        />
      </ToggleContainer>
      <MessagesContainer>
        {messages.map(message => (
          <MessageBubble key={message.id} isUser={message.sender === 'user'}>
            <ReactMarkdown
              components={{
                p: ({ children }) => <span>{children}</span>,
                strong: ({ children }) => <strong style={{ fontWeight: 'bold' }}>{children}</strong>,
                em: ({ children }) => <em style={{ fontStyle: 'italic' }}>{children}</em>,
              }}
            >
              {message.text}
            </ReactMarkdown>
            {message.audio && message.sender === 'assistant' && (
              <AudioButton 
                onClick={() => playAudio(message.audio!, message.audioFormat, message.id)}
                style={{
                  backgroundColor: playingMessageId === message.id ? '#dc3545' : '#28a745'
                }}
              >
                {playingMessageId === message.id ? '⏸️ Pausar áudio' : '🔊 Reproduzir áudio'}
              </AudioButton>
            )}
          </MessageBubble>
        ))}
      </MessagesContainer>
      <InputContainer>
        <AudioRecorder onRecordingComplete={handleAudioRecording} />
        <Input
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Digite sua mensagem..."
          disabled={isLoading}
        />
        <Button onClick={handleSendMessage} disabled={isLoading}>
          {isLoading ? 'Enviando...' : 'Enviar'}
        </Button>
      </InputContainer>
    </ChatContainer>
  )
}

export default ChatInterface 