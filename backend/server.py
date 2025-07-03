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
import re
import hashlib
import time
from collections import defaultdict
from services.transcription_service import TranscriptionService
from services.chat_service import ChatService
from utils.logger import setup_logger

from gtts import gTTS

# Configurar logger
logger = setup_logger(__name__)

# Cache de respostas para recuperação em caso de queda de conexão
# Estrutura: {session_id: {message_hash: {response_data, timestamp}}}
response_cache = defaultdict(dict)
CACHE_EXPIRY_SECONDS = 300  # 5 minutos

def generate_message_hash(message: str, use_tts: bool = False) -> str:
    """Gera hash único para a mensagem"""
    content = f"{message}_{use_tts}"
    return hashlib.md5(content.encode()).hexdigest()

def cache_response(session_id: str, message_hash: str, response_data: dict):
    """Armazena resposta no cache"""
    response_cache[session_id][message_hash] = {
        'data': response_data,
        'timestamp': time.time()
    }
    logger.info(f"Resposta cacheada para session {session_id}, hash {message_hash}")

def get_cached_response(session_id: str, message_hash: str) -> dict:
    """Recupera resposta do cache se ainda válida"""
    if session_id in response_cache and message_hash in response_cache[session_id]:
        cached = response_cache[session_id][message_hash]
        if time.time() - cached['timestamp'] < CACHE_EXPIRY_SECONDS:
            logger.info(f"Resposta recuperada do cache para session {session_id}, hash {message_hash}")
            return cached['data']
        else:
            # Remove entrada expirada
            del response_cache[session_id][message_hash]
            if not response_cache[session_id]:
                del response_cache[session_id]
    return None

def cleanup_expired_cache():
    """Remove entradas expiradas do cache"""
    current_time = time.time()
    sessions_to_remove = []
    
    for session_id, messages in response_cache.items():
        messages_to_remove = []
        for message_hash, cached in messages.items():
            if current_time - cached['timestamp'] >= CACHE_EXPIRY_SECONDS:
                messages_to_remove.append(message_hash)
        
        for message_hash in messages_to_remove:
            del messages[message_hash]
        
        if not messages:
            sessions_to_remove.append(session_id)
    
    for session_id in sessions_to_remove:
        del response_cache[session_id]

# Criar aplicação FastAPI
app = FastAPI()

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
        qdrant_url=QDRANT_URL,
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

# Função para limpar comandos de controle das mensagens do usuário
def clean_user_message(message: str) -> str:
    """Remove comandos de controle como /think, /nothink, /no_think da mensagem do usuário"""
    cleaned_message = re.sub(r'/(?:no_?think|think)', '', message, flags=re.IGNORECASE)
    return cleaned_message.strip()

# Função para limpar texto de resposta para o frontend
def clean_response_text(text: str) -> str:
    """Remove tags <think>...</think> e todo o conteúdo entre elas do texto de resposta"""
    # Remover tags <think>...</think> e todo o conteúdo entre elas
    cleaned_text = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL | re.IGNORECASE)
    # Limpar apenas espaços múltiplos na mesma linha (preservar quebras de linha)
    cleaned_text = re.sub(r'[ \t]+', ' ', cleaned_text)
    # Remover múltiplas quebras de linha consecutivas (máximo 2)
    cleaned_text = re.sub(r'\n\s*\n\s*\n+', '\n\n', cleaned_text)
    # Limpar espaços no início e fim
    cleaned_text = cleaned_text.strip()
    return cleaned_text

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
        # Limpar comandos de controle da mensagem do usuário
        cleaned_message = clean_user_message(request.message)
        logger.info(f"Mensagem original: {request.message}")
        logger.info(f"Mensagem limpa: {cleaned_message}")
        
        # Gerar hash da mensagem para cache
        message_hash = generate_message_hash(cleaned_message, False)
        
        # Verificar se já existe resposta cacheada
        cached_response = get_cached_response(request.session_id, message_hash)
        if cached_response:
            logger.info(f"Retornando resposta cacheada para: {cleaned_message[:50]}...")
            return cached_response
        
        # Processar nova mensagem
        response = await chat_service.get_response(cleaned_message, request.session_id)
        
        # Limpar tags <think> da resposta antes de retornar ao frontend
        cleaned_response = clean_response_text(response)
        logger.info(f"Resposta limpa para frontend: {cleaned_response[:100]}...")
        
        response_data = {"response": cleaned_response}
        
        # Cachear resposta para possível recuperação
        cache_response(request.session_id, message_hash, response_data)
        
        # Limpar cache expirado periodicamente
        cleanup_expired_cache()
        
        return response_data
    except Exception as e:
        logger.error(f"Erro na rota de chat: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/chat_with_tts/")
async def chat_with_tts(request: ChatRequest):
    try:
        # 1. Limpar comandos de controle da mensagem do usuário
        cleaned_message = clean_user_message(request.message)
        logger.info(f"Mensagem original: {request.message}")
        logger.info(f"Mensagem limpa: {cleaned_message}")
        
        # Gerar hash da mensagem para cache (incluindo TTS)
        message_hash = generate_message_hash(cleaned_message, True)
        
        # Verificar se já existe resposta cacheada
        cached_response = get_cached_response(request.session_id, message_hash)
        if cached_response:
            logger.info(f"Retornando resposta TTS cacheada para: {cleaned_message[:50]}...")
            return cached_response
        
        # 2. Obter a resposta de texto do chat service
        text_response = await chat_service.get_response(cleaned_message, request.session_id)
        logger.info(f"Resposta de texto gerada: {text_response[:100]}...")
        
        # 3. Limpar texto de resposta para o frontend (remover tags <think>)
        cleaned_response = clean_response_text(text_response)
        logger.info(f"Resposta limpa para frontend: {cleaned_response[:100]}...")
        
        # 4. Limpar texto para TTS (remover tags <think> e asteriscos)
        cleaned_text_for_tts = re.sub(r'<think>.*?</think>', '', text_response, flags=re.DOTALL | re.IGNORECASE)
        # Remover asteriscos
        cleaned_text_for_tts = re.sub(r'\*', '', cleaned_text_for_tts)
        # Limpar espaços extras
        cleaned_text_for_tts = re.sub(r'\s+', ' ', cleaned_text_for_tts).strip()
        logger.info(f"Texto limpo para TTS: {cleaned_text_for_tts[:100]}...")
        
        # 5. Gerar áudio usando gTTS
        logger.info("Gerando áudio com gTTS (pt-br)...")
        
        # Criar objeto gTTS para português brasileiro
        tts_obj = gTTS(text=cleaned_text_for_tts, lang='pt-br', slow=False)
        
        # Usar um arquivo temporário para o áudio
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp_audio_file:
            temp_audio_path = temp_audio_file.name
        
        # Salvar o áudio no arquivo temporário
        tts_obj.save(temp_audio_path)
        
        # 6. Ler os bytes do áudio do arquivo temporário
        with open(temp_audio_path, "rb") as audio_file:
            audio_bytes = audio_file.read()
        
        # Limpar o arquivo temporário
        os.unlink(temp_audio_path)
        
        logger.info(f"Áudio gerado com sucesso. Tamanho: {len(audio_bytes)} bytes")
        
        # 7. Codificar o áudio em Base64
        audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
        
        # 8. Criar a resposta JSON com texto limpo
        response_data = {
            "text": cleaned_response,
            "audio": audio_base64,
            "audio_format": "mp3"
        }
        
        # Cachear resposta para possível recuperação
        cache_response(request.session_id, message_hash, response_data)
        
        # Limpar cache expirado periodicamente
        cleanup_expired_cache()
        
        logger.info("Chat com TTS processado com sucesso")
        return response_data
        
    except Exception as e:
        logger.error(f"Erro na rota de chat com TTS: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint de health check para verificar status do servidor
@app.get("/health")
async def health_check():
    """
    Endpoint simples para verificar se o servidor está funcionando.
    Usado pelo sistema de conectividade do frontend.
    """
    return {
        "status": "healthy",
        "message": "Servidor está funcionando normalmente",
        "services": {
            "transcription": "ok",
            "chat": "ok",
            "tts": "ok"
        }
    }

# Rota para recuperar respostas pendentes
@app.get("/pending_responses/{session_id}")
async def get_pending_responses(session_id: str):
    """Retorna todas as respostas pendentes para uma sessão"""
    try:
        cleanup_expired_cache()  # Limpar cache expirado
        
        pending_responses = []
        if session_id in response_cache:
            for message_hash, cached in response_cache[session_id].items():
                # Verificar se não expirou
                if time.time() - cached['timestamp'] < CACHE_EXPIRY_SECONDS:
                    pending_responses.append({
                        'message_hash': message_hash,
                        'response': cached['data'],
                        'timestamp': cached['timestamp']
                    })
        
        logger.info(f"Retornando {len(pending_responses)} respostas pendentes para session {session_id}")
        return {"pending_responses": pending_responses}
        
    except Exception as e:
        logger.error(f"Erro ao buscar respostas pendentes: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    logger.info(f"Iniciando servidor em {SERVER_HOST}:{SERVER_PORT}")
    uvicorn.run(app, host=str(SERVER_HOST), port=int(SERVER_PORT))
