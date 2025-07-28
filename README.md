# TTS-app


DEPENDENCIAS:
ollama
docker pull qdrant/qdrant
docker run -p 6333:6333 qdrant/qdrant:latest

rust
python 3.10.11
cuda v11.8
https://visualstudio.microsoft.com/pt-br/visual-cpp-build-tools/

https://github.com/openai/whisper
choco install ffmpeg

.wslconfig para configurar a ram

baixar o modelo dentro do container ollama com ollama pull

react
node.js
npm

definir quais variaveis de ambiente são fixas

SET IPCONFIG ENV_VARIABLE

permitir sites no google chrome
chrome://flags


npm run cap:build
cd android
$env:JAVA_HOME="C:\Program Files\Java\jdk-21"
.\gradlew.bat assembleDebug





gtts lendo asteristicos na mensagem, limpar com regex
proibir o envio de /nothink ou /no_think na mensagem do usuário
limpar <think></think>
aumentar o tempo de idle
não ler emojis
configurar model_name rodar docker compose
envio de qr code


# Parar todos os containers
docker compose -f docker-compose.dev.yml down

# Remover os volumes (isso apaga todos os dados persistentes)
docker volume rm backend_ollama_data backend_qdrant_data

# Subir novamente (vai recriar tudo do zero)
docker compose -f docker-compose.dev.yml up --build