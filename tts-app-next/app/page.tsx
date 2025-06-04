'use client'

import styled from 'styled-components'
import dynamic from 'next/dynamic'

const ChatInterface = dynamic(() => import('@/components/ChatInterface'), {
  ssr: false
})

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
`

export default function Home() {
  return (
    <AppContainer>
      <ChatInterface />
    </AppContainer>
  )
} 