# Componente ChatWithGallery

O `ChatWithGallery` é um componente que combina um campo de entrada de chat com uma galeria vertical scrollável de recursos. É ideal para criar uma interface híbrida onde os usuários podem tanto fazer perguntas quanto explorar materiais disponíveis.

## ✨ Nova Funcionalidade: Transição Suave com Mensagem

**Quando o usuário enviar uma mensagem na galeria, ele transiciona suavemente para o chat completo já com a mensagem enviada automaticamente.**

### 🎬 **Animações Suaves**

- **Transição vertical suave** entre galeria e chat
- **Efeito de fade** com movimento sutil (y: 20px)
- **Fundo consistente** durante toda a transição
- **Animações do botão** de voltar com hover e tap
- **Timing otimizado** para experiência fluida
- **Easing personalizado** para movimento natural
- **Sem flash de fundo branco** durante transições

### 🔄 **Estados Compartilhados**

- **Botão de microfone** funciona normalmente em ambas as telas
- **Estado do toggle de áudio** é preservado durante a transição
- **Estados de gravação** são mantidos consistentes
- **Contexto React** compartilha todos os estados importantes

## Características

- ✅ ChatInput integrado no topo
- ✅ Galeria vertical scrollável
- ✅ Preview das últimas mensagens
- ✅ **Transição suave** para chat completo com mensagem
- ✅ **Estados compartilhados** entre galeria e chat
- ✅ Diferentes tipos de recursos (imagens, documentos, vídeos, áudio)
- ✅ **Animações elegantes** com Framer Motion
- ✅ Interface responsiva
- ✅ Navegação para chat completo
- ✅ Seleção de itens da galeria

## Uso Básico

```tsx
import { ChatWithGallery } from "@/components/ChatWithGallery";
import { ChatProvider } from "@/contexts/ChatContext";

function MyApp() {
  const handleNavigateToChat = (message?: string) => {
    // message contém a mensagem que o usuário digitou
    console.log("Mensagem para enviar:", message);
    // Navegar para o chat completo
  };

  return (
    <ChatProvider>
      <ChatWithGallery onNavigateToChat={handleNavigateToChat} />
    </ChatProvider>
  );
}
```

## Props

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| `onNavigateToChat` | `(message?: string) => void` | - | Callback para navegar para o chat completo com mensagem opcional |
| `className` | `string` | - | Classes CSS adicionais |

## Estrutura do Componente

### 1. Header
- Título e descrição
- Botão para navegar para chat completo (opcional)

### 2. Chat Input Section
- Campo de texto com gravação de áudio
- Toggle para saída de áudio
- Preview das últimas mensagens
- **Transição automática ao enviar**
- **Estados preservados durante transição**

### 3. Gallery Section
- Grid responsivo de recursos
- Diferentes tipos de mídia
- Ações de hover (download, abrir)
- Seleção visual de itens

## Fluxo de Transição

1. **Usuário digita mensagem** na galeria
2. **Clica em enviar** ou pressiona Enter
3. **Animação suave** de transição vertical
4. **Mensagem é enviada automaticamente** no chat
5. **Resposta do assistente** aparece normalmente

### 🎬 **Detalhes da Animação**

```tsx
// Fundo consistente que não muda durante a transição
<div className="absolute inset-0 bg-gradient-to-br from-emerald-400 via-teal-500 via-cyan-500 via-purple-500 via-violet-500 to-pink-500"></div>

// Transição da galeria para o chat
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0, y: -20 }}

// Botão de voltar com animação
initial={{ opacity: 0, y: -20, scale: 0.9 }}
animate={{ opacity: 1, y: 0, scale: 1 }}
whileHover={{ scale: 1.05 }}
whileTap={{ scale: 0.95 }}

// Posicionamento absoluto para evitar gaps
className="absolute inset-0 z-10"
```

## Contexto de Chat

O componente usa um contexto React para compartilhar o estado da mensagem e outros estados importantes:

```tsx
// Contexto para mensagem pendente e estados compartilhados
const { 
  pendingMessage, 
  setPendingMessage, 
  clearPendingMessage,
  audioOutputEnabled,
  setAudioOutputEnabled,
  isRecording,
  setIsRecording,
  recordingDuration,
  setRecordingDuration
} = useChatContext();
```

### 🔄 **Estados Compartilhados**

- **`audioOutputEnabled`**: Estado do toggle de resposta com áudio
- **`isRecording`**: Estado atual de gravação
- **`recordingDuration`**: Duração da gravação atual
- **`pendingMessage`**: Mensagem pendente para envio

## Exemplos de Uso

### Exemplo com Transição Completa

```tsx
import { useState } from 'react';
import { ChatWithGallery } from './ChatWithGallery';
import ModernChatInterface from './ModernChatInterface';
import { ChatProvider, useChatContext } from '@/contexts/ChatContext';

function App() {
  const [currentView, setCurrentView] = useState<'gallery' | 'chat'>('gallery');
  const { setPendingMessage } = useChatContext();

  const handleNavigateToChat = (message?: string) => {
    setCurrentView('chat');
    if (message) {
      setPendingMessage(message); // Mensagem será enviada automaticamente
    }
  };

  const handleBackToGallery = () => {
    setCurrentView('gallery');
  };

  if (currentView === 'chat') {
    return (
      <div className="h-screen">
        <ModernChatInterface />
        <button onClick={handleBackToGallery}>
          ← Voltar à Galeria
        </button>
      </div>
    );
  }

  return <ChatWithGallery onNavigateToChat={handleNavigateToChat} />;
}

// Wrapper com provider
export default function AppWrapper() {
  return (
    <ChatProvider>
      <App />
    </ChatProvider>
  );
}
```

### Exemplo Simples

```tsx
import { ChatWithGallery } from './ChatWithGallery';
import { ChatProvider } from '@/contexts/ChatContext';

function SimpleExample() {
  return (
    <ChatProvider>
      <ChatWithGallery />
    </ChatProvider>
  );
}
```

## Tipos de Recursos Suportados

### Image
- Ícone: 📷
- Cor: Azul
- Metadados: Thumbnail

### Document
- Ícone: 📄
- Cor: Verde
- Metadados: Tamanho do arquivo

### Video
- Ícone: ▶️
- Cor: Roxo
- Metadados: Duração

### Audio
- Ícone: ⏸️
- Cor: Laranja
- Metadados: Duração

## Personalização

### Customizando os Dados da Galeria

Para personalizar os itens da galeria, você pode modificar o array `galleryItems` no componente:

```tsx
const galleryItems: GalleryItem[] = [
  {
    id: "1",
    title: "Meu Documento",
    description: "Descrição do documento",
    type: "document",
    size: "1.5 MB",
    url: "/path/to/document"
  },
  // ... mais itens
];
```

### Customizando Cores e Estilos

O componente usa Tailwind CSS e pode ser customizado através da prop `className`:

```tsx
<ChatWithGallery 
  className="bg-gradient-to-br from-blue-900 to-purple-900"
  onNavigateToChat={handleNavigateToChat}
/>
```

## Funcionalidades

### Chat Input
- Herda todas as funcionalidades do `ChatInput`
- Gravação de áudio
- Toggle de saída de áudio
- Preview de mensagens
- **Transição automática ao enviar**
- **Estados preservados durante transição**

### Galeria
- Grid responsivo (1 coluna mobile, 2 desktop, 3 large)
- Animações de entrada com delay escalonado
- Hover effects com ações
- Seleção visual de itens
- Scroll suave

### Navegação
- Botão opcional para ir ao chat completo
- Transições suaves entre views
- Estado persistente
- **Mensagem compartilhada via contexto**
- **Estados de áudio preservados**

## Integração com APIs

O componente é agnóstico em relação às APIs. Você pode integrar com qualquer backend:

```tsx
const handleNavigateToChat = async (message?: string) => {
  if (message) {
    // Processar a mensagem antes da transição
    console.log("Mensagem para processar:", message);
  }
  
  // Navegar para o chat
  setCurrentView('chat');
};
```

## Responsividade

O componente é totalmente responsivo:

- **Mobile**: 1 coluna na galeria
- **Tablet**: 2 colunas na galeria  
- **Desktop**: 3 colunas na galeria

## Performance

- Lazy loading de componentes
- Animações otimizadas com `will-change`
- Debounced scroll events
- Memoização de callbacks
- Contexto otimizado para mensagens
- Estados compartilhados para evitar re-renders

## Arquivos Relacionados

- `ChatWithGallery.tsx` - Componente principal
- `ChatWithGalleryExample.tsx` - Exemplos de uso
- `ChatInput.tsx` - Componente de entrada usado
- `ModernChatInterface.tsx` - Chat completo para navegação
- `ChatContext.tsx` - Contexto para mensagens pendentes e estados compartilhados
