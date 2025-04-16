import React, { useState, useRef } from 'react';
import { 
  IconButton, 
  Box, 
  Paper, 
  Typography, 
  Alert, 
  CircularProgress 
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';

const AudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState(null);
  const [transcription, setTranscription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

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
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 16000
      });

      audioChunksRef.current = [];

      // Coleta os dados a cada 250ms
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        // Converte os chunks em um blob
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: 'audio/webm;codecs=opus' 
        });
        
        console.log('Áudio gravado, tamanho:', audioBlob.size);
        await sendAudioToBackend(audioBlob);
      };

      // Inicia a gravação coletando dados a cada 250ms
      mediaRecorderRef.current.start(250);
      setIsRecording(true);
      setError(null);
      setTranscription('');
      
      console.log('Gravação iniciada');
    } catch (err) {
      console.error('Erro ao acessar microfone:', err);
      setError('Erro ao acessar microfone. Por favor, verifique as permissões.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      console.log('Parando gravação');
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const sendAudioToBackend = async (audioBlob) => {
    try {
      setIsProcessing(true);
      console.log('Enviando áudio para o backend...');

      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await fetch('http://localhost:8000/transcribe/', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Resposta do backend:', data);
      
      if (data.error) {
        setError(`Erro no processamento: ${data.error}`);
      } else {
        setTranscription(data.text);
      }
    } catch (err) {
      console.error('Erro ao enviar áudio:', err);
      setError('Erro ao processar áudio. Por favor, tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      gap={2}
    >
      <IconButton 
        onClick={toggleRecording}
        disabled={isProcessing}
        sx={{
          width: 80,
          height: 80,
          border: '2px solid',
          borderColor: isRecording ? 'error.main' : 'grey.300',
          animation: isRecording ? 'pulse 2s infinite' : 'none',
          '@keyframes pulse': {
            '0%': { transform: 'scale(1)', opacity: 1 },
            '50%': { transform: 'scale(1.5)', opacity: 0.5 },
            '100%': { transform: 'scale(2)', opacity: 0 },
          },
        }}
      >
        <MicIcon 
          color={isRecording ? 'error' : 'action'} 
          sx={{ fontSize: 40 }}
        />
      </IconButton>

      {isProcessing && (
        <Box display="flex" alignItems="center" gap={1}>
          <CircularProgress size={20} />
          <Typography color="text.secondary">
            Processando áudio...
          </Typography>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ maxWidth: 600 }}>
          {error}
        </Alert>
      )}

      {transcription && (
        <Paper 
          elevation={1} 
          sx={{ 
            p: 2, 
            maxWidth: 600, 
            width: '90%',
            bgcolor: 'grey.50' 
          }}
        >
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Transcrição:
          </Typography>
          <Typography>
            {transcription}
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default AudioRecorder;
