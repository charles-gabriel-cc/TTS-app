from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from config import (
    SERVER_HOST, 
    SERVER_PORT, 
    WHISPER_MODEL, 
    OPENAI_API_KEY,
    USE_LOCAL_MODEL,
    EMBED_MODEL,
    MODEL_NAME,
    USE_LOCAL_COLLECTION,
    COLLECTION_NAME,
    QDRANT_URL,
    QDRANT_API_KEY,
    DOCS
)
import os
import base64
import io
import tempfile
from services.transcription_service import TranscriptionService
from services.chat_service import ChatService
from utils.logger import setup_logger

from gtts import gTTS

# Configurar logger
logger = setup_logger(__name__)

# Criar aplicação FastAPI
app = FastAPI()

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", f'http://{SERVER_HOST}:3000'],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializar serviços
transcription_service = TranscriptionService(model_name=WHISPER_MODEL)

# Configurar gTTS (Google Text-to-Speech)
logger.info("Configurando Google Text-to-Speech (gTTS) - Suporte nativo ao pt-br")

# Inicializar o serviço de chat
if USE_LOCAL_MODEL:
    logger.info(f"Usando modelo local: {MODEL_NAME}")
    chat_service = ChatService(
        use_local_model=True,
        model_name=MODEL_NAME,
    )
else:
    logger.info(f"Usando modelo OpenAI: {MODEL_NAME}")
    chat_service = ChatService(
        use_local_model=False,
        model_name=MODEL_NAME,
        api_key=OPENAI_API_KEY
    )

# Configurar a coleção apenas se necessário
if USE_LOCAL_COLLECTION:
    chat_service.set_collection(
        use_local_collection=True,
        collection_name=COLLECTION_NAME,
        embed_model=EMBED_MODEL,
        docs=DOCS
    )
else:
    chat_service.set_collection(
        use_local_collection=False,
        collection_name=COLLECTION_NAME,
        embed_model=EMBED_MODEL,
        qdrant_url=QDRANT_URL,
        qdrant_api_key=QDRANT_API_KEY
    )

# Modelo para requisições de chat
class ChatRequest(BaseModel):
    message: str
    session_id: str

# Rota para transcrição de áudio
@app.post("/transcribe/")
async def transcribe_audio(audio: UploadFile = File(...)):
    try:
        text = await transcription_service.transcribe_audio(audio)
        return {"text": text}
    except Exception as e:
        logger.error(f"Erro na rota de transcrição: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Rota para chat
@app.post("/chat/")
async def chat(request: ChatRequest):
    try:
        response = await chat_service.get_response(request.message, request.session_id)
        return {"response": response}
    except Exception as e:
        logger.error(f"Erro na rota de chat: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/chat_with_tts/")
async def chat_with_tts(request: ChatRequest):
    try:
        # 1. Obter a resposta de texto do chat service
        text_response = await chat_service.get_response(request.message, request.session_id)
        logger.info(f"Resposta de texto gerada: {text_response[:100]}...")
        
        # 2. Gerar áudio usando gTTS
        logger.info("Gerando áudio com gTTS (pt-br)...")
        
        # Criar objeto gTTS para português brasileiro
        tts_obj = gTTS(text=text_response, lang='pt-br', slow=False)
        
        # Usar um arquivo temporário para o áudio
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp_audio_file:
            temp_audio_path = temp_audio_file.name
        
        # Salvar o áudio no arquivo temporário
        tts_obj.save(temp_audio_path)
        
        # 3. Ler os bytes do áudio do arquivo temporário
        with open(temp_audio_path, "rb") as audio_file:
            audio_bytes = audio_file.read()
        
        # Limpar o arquivo temporário
        os.unlink(temp_audio_path)
        
        logger.info(f"Áudio gerado com sucesso. Tamanho: {len(audio_bytes)} bytes")
        
        # 4. Codificar o áudio em Base64
        audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
        
        # 5. Criar a resposta JSON
        response_data = {
            "text": text_response,
            "audio": audio_base64,
            "audio_format": "mp3"
        }
        
        logger.info("Chat com TTS processado com sucesso")
        return response_data
        
    except Exception as e:
        logger.error(f"Erro na rota de chat com TTS: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    logger.info(f"Iniciando servidor em {SERVER_HOST}:{SERVER_PORT}")
    uvicorn.run(app, host=str(SERVER_HOST), port=int(SERVER_PORT))
