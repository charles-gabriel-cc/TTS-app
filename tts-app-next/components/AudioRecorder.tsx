'use client'

import React, { useState, useRef } from 'react'
import styled from 'styled-components'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMicrophone, faStop, faTrash } from '@fortawesome/free-solid-svg-icons'

const RecorderContainer = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
`

const RecorderButton = styled.button<{ variant?: 'stop' | 'cancel' }>`
  padding: 10px;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${props => {
    if (props.variant === 'stop') return 'rgba(255, 255, 255, 0.9)'
    if (props.variant === 'cancel') return 'rgba(255, 255, 255, 0.9)'
    return '#007bff'
  }};
  color: ${props => {
    if (props.variant === 'stop') return '#000'
    if (props.variant === 'cancel') return '#000'
    return 'white'
  }};
  border: none;
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: ${props => {
      if (props.variant === 'stop') return 'rgba(255, 255, 255, 1)'
      if (props.variant === 'cancel') return 'rgba(255, 255, 255, 1)'
      return '#0056b3'
    }};
  }
`

interface AudioRecorderProps {
  onRecordingComplete?: (audioBlob: Blob) => void;
  disabled?: boolean;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecordingComplete, disabled = false }) => {
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const startRecording = async () => {
    if (disabled) return; // Não permitir iniciar gravação se desabilitado
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/wav' })
        if (onRecordingComplete) {
          onRecordingComplete(audioBlob)
        }
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)

      // Configurar timeout de 30 segundos
      recordingTimeoutRef.current = setTimeout(() => {
        if (isRecording) {
          cancelRecording()
        }
      }, 30000) // 30 segundos

    } catch (error) {
      console.error('Error accessing microphone:', error)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      
      // Limpar timeout se existir
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current)
        recordingTimeoutRef.current = null
      }
    }
  }

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = null
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
      chunksRef.current = []
      setIsRecording(false)
      
      // Limpar timeout se existir
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current)
        recordingTimeoutRef.current = null
      }
    }
  }

  return (
    <RecorderContainer>
      {!isRecording ? (
        <RecorderButton 
          onClick={startRecording}
          disabled={disabled}
          style={{ 
            opacity: disabled ? 0.5 : 1, 
            cursor: disabled ? 'not-allowed' : 'pointer' 
          }}
        >
          <FontAwesomeIcon icon={faMicrophone} />
        </RecorderButton>
      ) : (
        <>
          <RecorderButton variant="stop" onClick={stopRecording}>
            <FontAwesomeIcon icon={faStop} />
          </RecorderButton>
          <RecorderButton variant="cancel" onClick={cancelRecording}>
            <FontAwesomeIcon icon={faTrash} />
          </RecorderButton>
        </>
      )}
    </RecorderContainer>
  )
}

export default AudioRecorder 