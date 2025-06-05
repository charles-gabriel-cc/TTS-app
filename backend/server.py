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
from services.transcription_service import TranscriptionService
from services.chat_service import ChatService
from utils.logger import setup_logger

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

if __name__ == "__main__":
    import uvicorn
    logger.info(f"Iniciando servidor em {SERVER_HOST}:{SERVER_PORT}")
    uvicorn.run(app, host=str(SERVER_HOST), port=int(SERVER_PORT))
