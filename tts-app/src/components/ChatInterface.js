import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  TextField, 
  Paper, 
  Typography, 
  CircularProgress,
  IconButton,
  Divider,
  Alert,
  Badge,
  Tooltip
} from '@mui/material';
import { Send as SendIcon, Mic as MicIcon, FiberManualRecord as RecordIcon, Stop as StopIcon, Close as CloseIcon } from '@mui/icons-material';
import styled from 'styled-components';
import { v4 as uuidv4 } from 'uuid';

const ChatContainer = styled(Paper)`
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  background-color: #ffffff;
  box-shadow: none;
  border-radius: 0;
  overflow: hidden;
`;

const MessagesContainer = styled(Box)`
  flex-grow: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  
  /* Estilização da barra de rolagem */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 10px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 10px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }
`;

const MessageBubble = styled(Box)`
  max-width: 70%;
  padding: 12px 18px;
  border-radius: 20px;
  margin: 5px 0;
  word-wrap: break-word;
  align-self: ${props => props.isUser ? 'flex-end' : 'flex-start'};
  background-color: ${props => props.isUser ? '#1976d2' : '#f0f0f0'};
  color: ${props => props.isUser ? '#ffffff' : '#000000'};
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
`;

const InputContainer = styled(Box)`
  display: flex;
  gap: 12px;
  align-items: center;
  background-color: #f9f9f9;
  padding: 16px 24px;
  border-top: 1px solid #eaeaea;
`;

const StyledTextField = styled(TextField)`
  .MuiOutlinedInput-root {
    border-radius: 20px;
    background-color: white;
    
    fieldset {
      border-color: transparent;
    }
    
    &:hover fieldset {
      border-color: rgba(25, 118, 210, 0.2);
    }
    
    &.Mui-focused fieldset {
      border-color: rgba(25, 118, 210, 0.5);
    }
  }
`;

const StyledIconButton = styled(IconButton)`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: ${props => props.isrecording === 'true' ? 'rgba(244, 67, 54, 0.1)' : 'rgba(25, 118, 210, 0.1)'};
  color: ${props => props.isrecording === 'true' ? '#f44336' : '#1976d2'};
  
  &:hover {
    background-color: ${props => props.isrecording === 'true' ? 'rgba(244, 67, 54, 0.2)' : 'rgba(25, 118, 210, 0.2)'};
  }
`;

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [wasCancelled, setWasCancelled] = useState(false);
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    // Gerar um session_id usando UUID quando o componente é montado
    const generatedSessionId = uuidv4();
    setSessionId(generatedSessionId);
    console.log('Session ID gerado:', generatedSessionId);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = inputMessage;
    setInputMessage('');
    setMessages(prev => [...prev, { text: userMessage, isUser: true }]);
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8000/chat/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage, session_id: sessionId }),
      });

      if (!response.ok) {
        throw new Error('Erro na comunicação com o servidor');
      }

      const data = await response.json();
      setMessages(prev => [...prev, { text: data.response, isUser: false }]);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      setMessages(prev => [...prev, { 
        text: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.', 
        isUser: false 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  // Funções para gravação de áudio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          sampleSize: 16,
        } 
      });

      // Configuração específica para o MediaRecorder
      const mimeType = 'audio/webm';
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 16000
      });

      audioChunksRef.current = [];
      setWasCancelled(false);

      // Coleta os dados a cada 250ms
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Inicia a gravação coletando dados a cada 250ms
      mediaRecorderRef.current.start(250);
      setIsRecording(true);
      setError(null);
      
      console.log('Gravação iniciada');
    } catch (err) {
      console.error('Erro ao acessar microfone:', err);
      setError('Erro ao acessar microfone. Por favor, verifique as permissões.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      console.log('Parando gravação');
      try {
        // Primeiro paramos a gravação
        mediaRecorderRef.current.stop();
        
        // Depois paramos as tracks de áudio
        if (mediaRecorderRef.current.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => {
            track.stop();
          });
        }
        
        // Só então atualizamos o estado
        setIsRecording(false);

        // Se não foi cancelado, processa o áudio
        if (!wasCancelled) {
          // Converte os chunks em um blob
          const audioBlob = new Blob(audioChunksRef.current, { 
            type: 'audio/webm' 
          });
          
          console.log('Áudio gravado, tamanho:', audioBlob.size);
          sendAudioToBackend(audioBlob);
        }
      } catch (err) {
        console.error('Erro ao parar gravação:', err);
        setError('Erro ao parar gravação. Por favor, tente novamente.');
        // Forçamos a atualização do estado mesmo em caso de erro
        setIsRecording(false);
      }
    }
  };

  const sendAudioToBackend = async (audioBlob) => {
    try {
      // Verificamos se o blob tem dados
      if (audioBlob.size === 0) {
        console.log('Blob de áudio vazio, ignorando envio');
        return;
      }

      setIsLoading(true);
      setIsProcessingAudio(true);
      console.log('Enviando áudio para transcrição...');

      // Garantir que o blob tenha o tipo MIME correto
      const audioFile = new File([audioBlob], 'recording.webm', { 
        type: 'audio/webm' 
      });
      
      const formData = new FormData();
      formData.append('audio', audioFile);

      const response = await fetch('http://localhost:8000/transcribe/', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Transcrição recebida:', data);
      
      if (data.error) {
        setError(`Erro na transcrição: ${data.error}`);
      } else {
        // Adiciona a transcrição como uma mensagem do usuário
        const transcribedText = data.text;
        setMessages(prev => [...prev, { text: transcribedText, isUser: true }]);
        
        // Envia a transcrição para o chatbot
        const chatResponse = await fetch('http://localhost:8000/chat/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: transcribedText, session_id: sessionId }),
        });

        if (!chatResponse.ok) {
          throw new Error('Erro na comunicação com o servidor de chat');
        }

        const chatData = await chatResponse.json();
        setMessages(prev => [...prev, { text: chatData.response, isUser: false }]);
      }
    } catch (err) {
      console.error('Erro ao processar áudio:', err);
      setError(`Erro ao processar áudio: ${err.message}`);
    } finally {
      setIsLoading(false);
      setIsProcessingAudio(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      console.log('Cancelando gravação');
      try {
        // Marcamos que a gravação foi cancelada
        setWasCancelled(true);
        
        // Primeiro paramos a gravação
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
        
        // Depois paramos as tracks de áudio
        if (mediaRecorderRef.current.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => {
            track.stop();
          });
        }
        
        // Limpamos os dados de áudio
        audioChunksRef.current = [];
        
        // Só então atualizamos o estado
        setIsRecording(false);
        setError(null);
      } catch (err) {
        console.error('Erro ao cancelar gravação:', err);
        // Forçamos a atualização do estado mesmo em caso de erro
        setIsRecording(false);
      }
    }
  };

  return (
    <ChatContainer elevation={0}>
      {error && (
        <Alert severity="error" sx={{ m: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}
      
      <MessagesContainer>
        {messages.map((message, index) => (
          <MessageBubble key={index} isUser={message.isUser}>
            <Typography variant="body1">
              {message.text}
            </Typography>
          </MessageBubble>
        ))}
        {(isLoading || isProcessingAudio) && (
          <Box display="flex" justifyContent="center" my={2}>
            <CircularProgress size={24} />
          </Box>
        )}
        <div ref={messagesEndRef} />
      </MessagesContainer>

      <InputContainer>
        <StyledTextField
          fullWidth
          variant="outlined"
          placeholder="Digite sua mensagem..."
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          multiline
          maxRows={4}
          disabled={isLoading || isRecording || isProcessingAudio}
          size="small"
        />
        <StyledIconButton 
          onClick={handleSendMessage}
          disabled={isLoading || isRecording || isProcessingAudio || !inputMessage.trim()}
          isrecording="false"
        >
          <SendIcon />
        </StyledIconButton>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {isRecording && (
            <Tooltip title="Cancelar gravação">
              <StyledIconButton 
                onClick={cancelRecording}
                disabled={isLoading || isProcessingAudio}
                sx={{
                  backgroundColor: 'rgba(244, 67, 54, 0.1)',
                  color: '#f44336',
                  width: 40,
                  height: 40,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: 'rgba(244, 67, 54, 0.3)',
                  }
                }}
              >
                <CloseIcon />
              </StyledIconButton>
            </Tooltip>
          )}
          <StyledIconButton 
            onClick={toggleRecording}
            disabled={isLoading || isProcessingAudio}
            isrecording={isRecording.toString()}
            sx={{
              backgroundColor: isRecording ? 'rgba(244, 67, 54, 0.2)' : 'rgba(25, 118, 210, 0.1)',
              color: isRecording ? '#f44336' : '#1976d2',
              width: 40,
              height: 40,
              transition: 'all 0.3s ease',
              animation: isRecording ? 'pulse 2s infinite' : 'none',
              '@keyframes pulse': {
                '0%': { transform: 'scale(1)', opacity: 1 },
                '50%': { transform: 'scale(1.1)', opacity: 0.8 },
                '100%': { transform: 'scale(1)', opacity: 1 },
              },
              '&:hover': {
                backgroundColor: isRecording ? 'rgba(244, 67, 54, 0.3)' : 'rgba(25, 118, 210, 0.2)',
              }
            }}
          >
            {isRecording ? <StopIcon /> : <MicIcon />}
          </StyledIconButton>
        </Box>
      </InputContainer>
    </ChatContainer>
  );
};

export default ChatInterface; 