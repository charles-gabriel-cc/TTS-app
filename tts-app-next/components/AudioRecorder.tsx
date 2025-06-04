'use client'

import React, { useState, useRef } from 'react'
import styled from 'styled-components'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMicrophone, faStop, faTimes } from '@fortawesome/free-solid-svg-icons'

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
    if (props.variant === 'stop') return '#dc3545'
    if (props.variant === 'cancel') return '#6c757d'
    return '#007bff'
  }};
  color: white;
  border: none;
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: ${props => {
      if (props.variant === 'stop') return '#c82333'
      if (props.variant === 'cancel') return '#5a6268'
      return '#0056b3'
    }};
  }
`

interface AudioRecorderProps {
  onRecordingComplete?: (audioBlob: Blob) => void;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecordingComplete }) => {
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const startRecording = async () => {
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
    } catch (error) {
      console.error('Error accessing microphone:', error)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = null
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
      chunksRef.current = []
      setIsRecording(false)
    }
  }

  return (
    <RecorderContainer>
      {!isRecording ? (
        <RecorderButton onClick={startRecording}>
          <FontAwesomeIcon icon={faMicrophone} />
        </RecorderButton>
      ) : (
        <>
          <RecorderButton variant="stop" onClick={stopRecording}>
            <FontAwesomeIcon icon={faStop} />
          </RecorderButton>
          <RecorderButton variant="cancel" onClick={cancelRecording}>
            <FontAwesomeIcon icon={faTimes} />
          </RecorderButton>
        </>
      )}
    </RecorderContainer>
  )
}

export default AudioRecorder 