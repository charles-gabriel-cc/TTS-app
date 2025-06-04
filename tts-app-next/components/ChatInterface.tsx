'use client'

import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { v4 as uuidv4 } from 'uuid'
import AudioRecorder from './AudioRecorder'
import { api } from '@/services/api'

interface Message {
  id: string
  text: string
  sender: 'user' | 'assistant'
  timestamp: Date
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

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)

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

        // Enviar mensagem para o backend
        const response = await api.sendChatMessage(inputText)
        
        // Adicionar resposta do assistente
        const assistantMessage: Message = {
          id: uuidv4(),
          text: response.text,
          sender: 'assistant',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])
      } catch (error) {
        console.error('Error sending message:', error)
        // Adicionar mensagem de erro
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
        const response = await api.sendChatMessage(text)
        
        // Adicionar resposta do assistente
        const assistantMessage: Message = {
          id: uuidv4(),
          text: response.text,
          sender: 'assistant',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])
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
      <MessagesContainer>
        {messages.map(message => (
          <MessageBubble key={message.id} isUser={message.sender === 'user'}>
            {message.text}
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