import React from 'react';
import ChatInterface from './components/ChatInterface';
import styled from 'styled-components';

const AppContainer = styled.div`
  text-align: center;
  background-color: #f5f5f5;
  min-height: 100vh;
  width: 100%;
  padding: 0;
  margin: 0;
  display: flex;
  align-items: stretch;
  justify-content: stretch;
`;

function App() {
  return (
    <AppContainer>
      <ChatInterface />
    </AppContainer>
  );
}

export default App;
