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
    ARTICLES_COLLECTION_NAME,
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
import json
import redis
from services.transcription_service import TranscriptionService
from services.chat_service import ChatService
from utils.logger import setup_logger

from gtts import gTTS

# Configurar logger
logger = setup_logger(__name__)

# Cache de respostas via Redis para suportar múltiplos workers/processos
# Estrutura no Redis (chave): response_cache:{session_id}:{message_hash}
# Valor JSON: {"data": <response_data>, "timestamp": <epoch_seconds>}
CACHE_EXPIRY_SECONDS = 300  # 5 minutos

# Configuração do Redis (usar variável de ambiente REDIS_URL se disponível)
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)

def _cache_key(session_id: str, message_hash: str) -> str:
    return f"response_cache:{session_id}:{message_hash}"

def generate_message_hash(message: str, use_tts: bool = False) -> str:
    """Gera hash único para a mensagem"""
    content = f"{message}_{use_tts}"
    return hashlib.md5(content.encode()).hexdigest()

def cache_response(session_id: str, message_hash: str, response_data: dict):
    """Armazena resposta no Redis com expiração."""
    payload = {
        'data': response_data,
        'timestamp': time.time()
    }
    redis_client.set(_cache_key(session_id, message_hash), json.dumps(payload), ex=CACHE_EXPIRY_SECONDS)
    logger.info(f"Resposta cacheada (Redis) para session {session_id}, hash {message_hash}")

def get_cached_response(session_id: str, message_hash: str) -> dict:
    """Recupera resposta do Redis (se existir) e a remove após uso."""
    key = _cache_key(session_id, message_hash)
    cached_str = redis_client.get(key)
    if not cached_str:
        return None
    try:
        cached = json.loads(cached_str)
        logger.info(f"Resposta recuperada do cache (Redis) para session {session_id}, hash {message_hash}")
        return cached.get('data')
    finally:
        # Remover do cache após uso para evitar reutilização
        redis_client.delete(key)
        logger.info(f"Entrada de cache (Redis) removida após uso: session {session_id}, hash {message_hash}")

# Limpeza manual de expirados agora é responsabilidade do Redis (expiração nativa)

def clear_specific_cache(session_id: str, message_hash: str):
    """Remove uma entrada específica do cache (Redis)."""
    deleted = redis_client.delete(_cache_key(session_id, message_hash))
    if deleted:
        logger.info(f"Cache específico (Redis) limpo: session {session_id}, hash {message_hash}")
    else:
        logger.info(f"Nenhuma entrada de cache (Redis) encontrada para remoção: session {session_id}, hash {message_hash}")

# Criar aplicação FastAPI
app = FastAPI(
    title="TTS App Backend",
    description="Backend para aplicativo de chat com TTS e galeria de artigos científicos",
    version="1.0.0"
)

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

# Incluir routers
try:
    from api.articles import router as articles_router
    app.include_router(articles_router)
    logger.info("✅ Router de artigos incluído com sucesso")
except ImportError as e:
    logger.warning(f"⚠️ Não foi possível importar router de artigos: {e}")
except Exception as e:
    logger.error(f"❌ Erro ao incluir router de artigos: {e}")

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

# Inicializar o serviço de chat para artigos
if USE_LOCAL_MODEL:
    logger.info(f"Usando modelo local para artigos: {MODEL_NAME}")
    article_chat_service = ChatService(
        use_local_model=True,
        model_name=MODEL_NAME,
    )
else:
    logger.info(f"Usando modelo OpenAI para artigos: {MODEL_NAME}")
    article_chat_service = ChatService(
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
    # Configurar coleção de artigos para o serviço de chat de artigos
    article_chat_service.set_collection(
        use_local_collection=True,
        collection_name=ARTICLES_COLLECTION_NAME,
        embed_model=EMBED_MODEL,
        qdrant_url=QDRANT_URL,
        docs="ccen-artigos"
    )
else:
    chat_service.set_collection(
        use_local_collection=False,
        collection_name=COLLECTION_NAME,
        embed_model=EMBED_MODEL,
        qdrant_url=QDRANT_URL,
        qdrant_api_key=QDRANT_API_KEY
    )
    # Configurar coleção de artigos para o serviço de chat de artigos
    article_chat_service.set_collection(
        use_local_collection=False,
        collection_name=ARTICLES_COLLECTION_NAME,
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

# Modelo para requisições de chat específico de artigos
class ArticleChatRequest(BaseModel):
    message: str
    session_id: str
    professor_name: str  # Nome do professor para filtrar artigos

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
        
        # Processar nova mensagem SEM cache - sempre gerar nova resposta
        logger.info(f"Gerando nova resposta para: {cleaned_message[:50]}...")
        response = await chat_service.get_response(cleaned_message, request.session_id)
        
        # Limpar tags <think> da resposta antes de retornar ao frontend
        cleaned_response = clean_response_text(response)
        logger.info(f"Resposta limpa para frontend: {cleaned_response[:100]}...")
        
        response_data = {"response": cleaned_response}
        
        return response_data
    except Exception as e:
        logger.error(f"Erro na rota de chat: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Rota para chat específico de artigos
@app.post("/article_chat/")
async def article_chat(request: ArticleChatRequest):
    try:
        # Limpar comandos de controle da mensagem do usuário
        cleaned_message = clean_user_message(request.message)
        logger.info(f"Mensagem original (artigo): {request.message}")
        logger.info(f"Mensagem limpa (artigo): {cleaned_message}")
        logger.info(f"Professor filtrado: {request.professor_name}")
        
        # Processar nova mensagem SEM cache - sempre gerar nova resposta
        logger.info(f"Gerando nova resposta para artigo: {cleaned_message[:50]}...")
        
        # Usar o serviço de chat de artigos com filtro de professor
        response = await article_chat_service.get_article_response(cleaned_message, request.session_id, request.professor_name)
        
        # Limpar tags <think> da resposta antes de retornar ao frontend
        cleaned_response = clean_response_text(response)
        logger.info(f"Resposta limpa para frontend (artigo): {cleaned_response[:100]}...")
        
        response_data = {"response": cleaned_response}
        
        return response_data
    except Exception as e:
        logger.error(f"Erro na rota de chat de artigos: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/article_chat_with_tts/")
async def article_chat_with_tts(request: ArticleChatRequest):
    try:
        # 1. Limpar comandos de controle da mensagem do usuário
        cleaned_message = clean_user_message(request.message)
        logger.info(f"Mensagem original (artigo TTS): {request.message}")
        logger.info(f"Mensagem limpa (artigo TTS): {cleaned_message}")
        logger.info(f"Professor filtrado: {request.professor_name}")
        
        # Gerar nova resposta SEM cache - sempre gerar nova resposta
        logger.info(f"Gerando nova resposta TTS para artigo: {cleaned_message[:50]}...")
        
        # 2. Obter a resposta de texto do chat service de artigos
        text_response = await article_chat_service.get_article_response(cleaned_message, request.session_id, request.professor_name)
        logger.info(f"Resposta de texto gerada (artigo): {text_response[:100]}...")
        
        # 3. Limpar texto de resposta para o frontend (remover tags <think>)
        cleaned_response = clean_response_text(text_response)
        logger.info(f"Resposta limpa para frontend (artigo): {cleaned_response[:100]}...")
        
        # 4. Limpar texto para TTS (remover tags <think> e asteriscos)
        cleaned_text_for_tts = re.sub(r'<think>.*?</think>', '', text_response, flags=re.DOTALL | re.IGNORECASE)
        # Remover asteriscos
        cleaned_text_for_tts = re.sub(r'\*', '', cleaned_text_for_tts)
        # Limpar espaços extras
        cleaned_text_for_tts = re.sub(r'\s+', ' ', cleaned_text_for_tts).strip()
        logger.info(f"Texto limpo para TTS (artigo): {cleaned_text_for_tts[:100]}...")
        
        # 5. Gerar áudio usando gTTS
        logger.info("Gerando áudio com gTTS (pt-br) para artigo...")
        
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
        
        logger.info(f"Áudio gerado com sucesso para artigo. Tamanho: {len(audio_bytes)} bytes")
        
        # 7. Codificar o áudio em Base64
        audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
        
        # 8. Criar a resposta JSON com texto limpo
        response_data = {
            "text": cleaned_response,
            "audio": audio_base64,
            "audio_format": "mp3"
        }
        
        logger.info("Chat com TTS para artigo processado com sucesso")
        return response_data
        
    except Exception as e:
        logger.error(f"Erro na rota de chat com TTS para artigo: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/chat_with_tts/")
async def chat_with_tts(request: ChatRequest):
    try:
        # 1. Limpar comandos de controle da mensagem do usuário
        cleaned_message = clean_user_message(request.message)
        logger.info(f"Mensagem original: {request.message}")
        logger.info(f"Mensagem limpa: {cleaned_message}")
        
        # Gerar nova resposta SEM cache - sempre gerar nova resposta
        logger.info(f"Gerando nova resposta TTS para: {cleaned_message[:50]}...")
        
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

# Endpoint para limpar cache manualmente
@app.post("/clear_cache")
async def clear_cache():
    """
    Endpoint para limpar o cache de respostas manualmente.
    Útil para debug ou situações específicas.
    """
    try:
        # Remove todas as chaves do namespace de cache sem afetar outras chaves do Redis
        count = 0
        for key in redis_client.scan_iter(match="response_cache:*"):
            redis_client.delete(key)
            count += 1
        logger.info(f"Cache (Redis) limpo manualmente via endpoint. Chaves removidas: {count}")
        return {
            "status": "success",
            "message": "Cache limpo com sucesso",
            "cache_size": 0
        }
    except Exception as e:
        logger.error(f"Erro ao limpar cache: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint para limpar cache específico
@app.post("/clear_specific_cache")
async def clear_specific_cache_endpoint(request: dict):
    """
    Endpoint para limpar uma entrada específica do cache.
    Útil para limpar cache após uso.
    """
    try:
        session_id = request.get("session_id")
        message_hash = request.get("message_hash")
        
        if not session_id or not message_hash:
            raise HTTPException(status_code=400, detail="session_id e message_hash são obrigatórios")
        
        clear_specific_cache(session_id, message_hash)
        
        return {
            "status": "success",
            "message": "Cache específico limpo com sucesso",
            "session_id": session_id,
            "message_hash": message_hash
        }
    except Exception as e:
        logger.error(f"Erro ao limpar cache específico: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Rota para recuperar respostas pendentes
@app.get("/pending_responses/{session_id}")
async def get_pending_responses(session_id: str):
    """Retorna todas as respostas pendentes para uma sessão"""
    try:
        pending_responses = []
        prefix = f"response_cache:{session_id}:"
        for key in redis_client.scan_iter(match=prefix + "*"):
            cached_str = redis_client.get(key)
            if not cached_str:
                continue
            try:
                cached = json.loads(cached_str)
            except Exception:
                continue
            # Extrair message_hash da chave
            message_hash = key.split(":")[-1]
            pending_responses.append({
                'message_hash': message_hash,
                'response': cached.get('data'),
                'timestamp': cached.get('timestamp')
            })
        logger.info(f"Retornando {len(pending_responses)} respostas pendentes (Redis) para session {session_id}")
        return {"pending_responses": pending_responses}
    except Exception as e:
        logger.error(f"Erro ao buscar respostas pendentes: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

"""
Para iniciar o servidor em modo de produção com múltiplos workers (exemplo: 4):

Bash:
# gunicorn --bind "0.0.0.0:8000" --workers 4 --worker-class uvicorn.workers.UvicornWorker backend.server:app

Windows PowerShell (se disponível no ambiente):
# gunicorn --bind "0.0.0.0:8000" --workers 4 --worker-class uvicorn.workers.UvicornWorker backend.server:app
"""
