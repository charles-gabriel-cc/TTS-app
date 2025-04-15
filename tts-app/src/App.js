import React from 'react';
import AudioRecorder from './components/AudioRecorder';
import styled from 'styled-components';

const AppContainer = styled.div`
  text-align: center;
  background-color: #f5f5f5;
  min-height: 100vh;
`;

function App() {
  return (
    <AppContainer>
      <AudioRecorder />
    </AppContainer>
  );
}

export default App;
