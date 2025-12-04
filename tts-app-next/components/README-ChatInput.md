# Componente ChatInput

O `ChatInput` é um componente reutilizável para entrada de texto e áudio em interfaces de chat. Ele foi extraído do `ModernChatInterface` para permitir uso independente em outros locais da aplicação.

## Características

- ✅ Campo de texto com auto-ajuste de altura
- ✅ Gravação de áudio integrada
- ✅ Toggle para ativar/desativar saída de áudio
- ✅ Suporte a teclado móvel
- ✅ Envio com Enter (Shift+Enter para nova linha)
- ✅ Interface responsiva e moderna
- ✅ Totalmente customizável

## Uso Básico

```tsx
import { ChatInput } from "@/components/ChatInput";

function MyChatComponent() {
  const [inputValue, setInputValue] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [audioOutputEnabled, setAudioOutputEnabled] = useState(false);

  const handleSend = () => {
    console.log("Mensagem enviada:", inputValue);
    setInputValue("");
  };

  const handleStopRecording = (audioBlob: Blob) => {
    console.log("Áudio recebido:", audioBlob);
    // Processar o áudio aqui
  };

  return (
    <ChatInput
      value={inputValue}
      onChange={setInputValue}
      onSend={handleSend}
      isRecording={isRecording}
      recordingDuration={0}
      onStartRecording={() => setIsRecording(true)}
      onStopRecording={handleStopRecording}
      onCancelRecording={() => setIsRecording(false)}
      audioOutputEnabled={audioOutputEnabled}
      onToggleAudioOutput={setAudioOutputEnabled}
    />
  );
}
```

## Props

### Obrigatórias

| Prop | Tipo | Descrição |
|------|------|-----------|
| `value` | `string` | Valor atual do campo de texto |
| `onChange` | `(value: string) => void` | Callback quando o texto muda |
| `onSend` | `() => void` | Callback quando a mensagem é enviada |
| `isRecording` | `boolean` | Se está gravando áudio |
| `recordingDuration` | `number` | Duração da gravação em segundos |
| `onStartRecording` | `() => void` | Callback para iniciar gravação |
| `onStopRecording` | `(audioBlob: Blob) => void` | Callback quando gravação para |
| `onCancelRecording` | `() => void` | Callback para cancelar gravação |
| `audioOutputEnabled` | `boolean` | Se saída de áudio está ativada |
| `onToggleAudioOutput` | `(enabled: boolean) => void` | Callback para toggle de áudio |

### Opcionais

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| `disabled` | `boolean` | `false` | Se o componente está desabilitado |
| `keyboardVisible` | `boolean` | `false` | Se o teclado móvel está visível |
| `placeholder` | `string` | `"Digite sua mensagem..."` | Placeholder do campo |
| `className` | `string` | - | Classes CSS adicionais |
| `showAudioToggle` | `boolean` | `true` | Se mostra o toggle de áudio |

## Exemplos de Uso

### ChatInput Simples (Sem Áudio)

```tsx
<ChatInput
  value={inputValue}
  onChange={setInputValue}
  onSend={handleSend}
  isRecording={false}
  recordingDuration={0}
  onStartRecording={() => {}}
  onStopRecording={() => {}}
  onCancelRecording={() => {}}
  audioOutputEnabled={false}
  onToggleAudioOutput={() => {}}
  showAudioToggle={false}
  placeholder="Digite algo..."
/>
```

### ChatInput com Gravação de Áudio

```tsx
const [isRecording, setIsRecording] = useState(false);
const [recordingDuration, setRecordingDuration] = useState(0);

const handleStartRecording = () => {
  setIsRecording(true);
  setRecordingDuration(0);
  // Iniciar timer para duração
  const interval = setInterval(() => {
    setRecordingDuration(prev => prev + 1);
  }, 1000);
};

const handleStopRecording = (audioBlob: Blob) => {
  setIsRecording(false);
  setRecordingDuration(0);
  // Processar o áudio
  console.log("Áudio recebido:", audioBlob);
};

<ChatInput
  value={inputValue}
  onChange={setInputValue}
  onSend={handleSend}
  isRecording={isRecording}
  recordingDuration={recordingDuration}
  onStartRecording={handleStartRecording}
  onStopRecording={handleStopRecording}
  onCancelRecording={() => setIsRecording(false)}
  audioOutputEnabled={audioOutputEnabled}
  onToggleAudioOutput={setAudioOutputEnabled}
/>
```

### ChatInput com Suporte a Teclado Móvel

```tsx
const [keyboardVisible, setKeyboardVisible] = useState(false);

// Detectar mudanças no teclado (exemplo para Capacitor)
useEffect(() => {
  const handleKeyboardShow = () => setKeyboardVisible(true);
  const handleKeyboardHide = () => setKeyboardVisible(false);
  
  // Adicionar listeners do teclado
  return () => {
    // Remover listeners
  };
}, []);

<ChatInput
  value={inputValue}
  onChange={setInputValue}
  onSend={handleSend}
  isRecording={isRecording}
  recordingDuration={recordingDuration}
  onStartRecording={handleStartRecording}
  onStopRecording={handleStopRecording}
  onCancelRecording={handleCancelRecording}
  audioOutputEnabled={audioOutputEnabled}
  onToggleAudioOutput={setAudioOutputEnabled}
  keyboardVisible={keyboardVisible}
/>
```

## Funcionalidades

### Gravação de Áudio
- Usa a Web Audio API para gravação
- Suporte a cancelamento de gravação
- Timer visual durante a gravação
- Retorna um Blob com o áudio gravado

### Auto-ajuste de Altura
- O textarea cresce automaticamente conforme o conteúdo
- Altura máxima de 120px
- Scroll automático quando necessário

### Teclado Móvel
- Detecção automática de teclado visível
- Scroll automático para manter o input visível
- Ajuste de layout quando o teclado aparece

### Envio de Mensagem
- Enter para enviar
- Shift+Enter para nova linha
- Validação de mensagem vazia
- Estado de loading/disabled

## Estilização

O componente usa Tailwind CSS e pode ser customizado através da prop `className`. As cores e estilos seguem o tema da aplicação principal.

### Classes CSS Principais
- `bg-white/5 backdrop-blur-sm` - Fundo translúcido
- `border border-white/10` - Bordas sutis
- `text-white placeholder:text-white/50` - Texto e placeholder
- `from-cyan-500 to-teal-400` - Gradientes para botões

## Integração com APIs

O componente é agnóstico em relação às APIs. Você pode integrar com qualquer backend:

```tsx
const handleSend = async () => {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: inputValue })
    });
    const data = await response.json();
    // Processar resposta
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
  }
};

const handleStopRecording = async (audioBlob: Blob) => {
  try {
    const formData = new FormData();
    formData.append('audio', audioBlob);
    
    const response = await fetch('/api/speech-to-text', {
      method: 'POST',
      body: formData
    });
    const { text } = await response.json();
    // Processar texto transcrito
  } catch (error) {
    console.error('Erro ao processar áudio:', error);
  }
};
```

## Arquivos Relacionados

- `ChatInput.tsx` - Componente principal
- `ChatInputExample.tsx` - Exemplos de uso
- `ModernChatInterface.tsx` - Uso original no chat principal
