import React, { useState } from 'react';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMicrophone } from '@fortawesome/free-solid-svg-icons';

const MicContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
`;

const MicButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 20px;
  border-radius: 50%;
  transition: all 0.3s ease;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    border: 2px solid #ff4444;
    animation: ${props => props.isRecording ? 'pulse 2s infinite' : 'none'};
    left: 0;
    top: 0;
  }

  @keyframes pulse {
    0% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.5);
      opacity: 0.5;
    }
    100% {
      transform: scale(2);
      opacity: 0;
    }
  }
`;

const MicIcon = styled(FontAwesomeIcon)`
  font-size: 48px;
  color: ${props => props.isRecording ? '#ff4444' : '#333'};
`;

const AudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // We'll implement actual recording functionality later
  };

  return (
    <MicContainer>
      <MicButton isRecording={isRecording} onClick={toggleRecording}>
        <MicIcon icon={faMicrophone} isRecording={isRecording} />
      </MicButton>
    </MicContainer>
  );
};

export default AudioRecorder;
