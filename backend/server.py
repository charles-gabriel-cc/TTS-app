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
    DOCS,
    WEBHOOK_URL
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
import httpx
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

# Log da configuração do webhook
logger.info(f"🔗 Webhook configurado: {WEBHOOK_URL}")
logger.info(f"📡 Chat service será substituído por webhook na rota /chat/")

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

# Função para testar conectividade com o webhook
async def test_webhook_connectivity():
    """Testa se o webhook está acessível"""
    try:
        logger.info(f"Testando conectividade com webhook: {WEBHOOK_URL}")
        
        async with httpx.AsyncClient() as client:
            # Teste simples de conectividade com timeout baixo
            response = await client.get(
                WEBHOOK_URL.replace("/webhook-test/", "/health"),  # Tentar endpoint de health
                timeout=httpx.Timeout(5.0, connect=3.0)
            )
            logger.info(f"✅ Webhook acessível - Status: {response.status_code}")
            return True
            
    except httpx.ConnectError as e:
        logger.error(f"❌ Erro de conexão com webhook: {e}")
        logger.error(f"Verifique se o serviço está rodando em: {WEBHOOK_URL}")
        return False
        
    except httpx.TimeoutException as e:
        logger.error(f"❌ Timeout ao conectar com webhook: {e}")
        return False
        
    except Exception as e:
        logger.error(f"❌ Erro inesperado ao testar webhook: {e}")
        return False

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

# Rota para testar conectividade com o webhook
@app.get("/test-webhook/")
async def test_webhook():
    """Testa se o webhook está acessível"""
    try:
        is_accessible = await test_webhook_connectivity()
        return {
            "webhook_url": WEBHOOK_URL,
            "accessible": is_accessible,
            "timestamp": time.time()
        }
    except Exception as e:
        logger.error(f"Erro ao testar webhook: {str(e)}")
        return {
            "webhook_url": WEBHOOK_URL,
            "accessible": False,
            "error": str(e),
            "timestamp": time.time()
        }

# Rota para chat
@app.post("/chat/")
async def chat(request: ChatRequest):
    try:
        # Limpar comandos de controle da mensagem do usuário
        cleaned_message = clean_user_message(request.message)
        logger.info(f"Mensagem original: {request.message}")
        logger.info(f"Mensagem limpa: {cleaned_message}")
        
        # Usar webhook em vez do chat_service
        webhook_url = WEBHOOK_URL
        logger.info(f"URL do webhook configurada: {webhook_url}")
        
        # Preparar dados para o webhook
        webhook_data = {
            "message": cleaned_message,
            "session_id": request.session_id,
            "context": "general"
        }
        logger.info(f"Dados preparados para webhook: {webhook_data}")
        
        logger.info(f"Iniciando requisição HTTP para webhook...")
        
        # Fazer requisição para o webhook
        try:
            async with httpx.AsyncClient() as client:
                logger.info(f"Cliente HTTP criado, enviando POST para {webhook_url}")
                
                # Configurar timeout e headers
                timeout = httpx.Timeout(30.0, connect=10.0)
                headers = {
                    "Content-Type": "application/json",
                    "User-Agent": "TTS-App-Backend/1.0"
                }
                
                logger.info(f"Configurações: timeout={timeout}, headers={headers}")
                
                webhook_response = await client.post(
                    webhook_url,
                    json=webhook_data,
                    timeout=timeout,
                    headers=headers
                )
                
                logger.info(f"Resposta recebida do webhook: status={webhook_response.status_code}")
                logger.info(f"Headers da resposta: {dict(webhook_response.headers)}")
                
                if webhook_response.status_code == 200:
                    try:
                        webhook_result = webhook_response.json()
                        logger.info(f"Resposta JSON do webhook: {webhook_result}")
                        response = webhook_result.get("response", "Desculpe, não consegui processar sua mensagem.")
                    except json.JSONDecodeError as json_err:
                        logger.error(f"Erro ao decodificar JSON da resposta: {json_err}")
                        logger.error(f"Conteúdo da resposta: {webhook_response.text}")
                        response = "Desculpe, resposta inválida do webhook."
                else:
                    logger.error(f"Webhook retornou status {webhook_response.status_code}")
                    logger.error(f"Conteúdo da resposta: {webhook_response.text}")
                    response = "Desculpe, ocorreu um erro ao processar sua mensagem."
                    
        except httpx.ConnectError as conn_err:
            logger.error(f"Erro de conexão com webhook: {conn_err}")
            logger.error(f"Detalhes da conexão: {type(conn_err).__name__}")
            response = "Desculpe, não foi possível conectar ao serviço de chat."
            
        except httpx.TimeoutException as timeout_err:
            logger.error(f"Timeout na requisição para webhook: {timeout_err}")
            response = "Desculpe, o serviço de chat demorou muito para responder."
            
        except httpx.HTTPStatusError as http_err:
            logger.error(f"Erro HTTP do webhook: {http_err}")
            logger.error(f"Status: {http_err.response.status_code}, Resposta: {http_err.response.text}")
            response = "Desculpe, erro na comunicação com o serviço de chat."
            
        except Exception as http_exc:
            logger.error(f"Erro inesperado na requisição HTTP: {http_exc}")
            logger.error(f"Tipo do erro: {type(http_exc).__name__}")
            response = "Desculpe, erro inesperado na comunicação."
        
        # Limpar tags <think> da resposta antes de retornar ao frontend
        cleaned_response = clean_response_text(response)
        logger.info(f"Resposta limpa para frontend: {cleaned_response[:100]}...")
        
        response_data = {"response": cleaned_response}
        
        return response_data
    except Exception as e:
        logger.error(f"Erro geral na rota de chat: {str(e)}")
        logger.error(f"Tipo do erro: {type(e).__name__}")
        import traceback
        logger.error(f"Traceback completo: {traceback.format_exc()}")
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
        
        # Usar webhook em vez do article_chat_service
        webhook_url = WEBHOOK_URL
        logger.info(f"URL do webhook configurada (artigo): {webhook_url}")
        
        # Preparar dados para o webhook com contexto de artigo
        webhook_data = {
            "message": cleaned_message,
            "session_id": request.session_id,
            "professor_name": request.professor_name,
            "context": "article_chat"
        }
        logger.info(f"Dados preparados para webhook (artigo): {webhook_data}")
        
        logger.info(f"Iniciando requisição HTTP para webhook (artigo)...")
        
        # Fazer requisição para o webhook
        try:
            async with httpx.AsyncClient() as client:
                logger.info(f"Cliente HTTP criado, enviando POST para {webhook_url}")
                
                # Configurar timeout e headers
                timeout = httpx.Timeout(30.0, connect=10.0)
                headers = {
                    "Content-Type": "application/json",
                    "User-Agent": "TTS-App-Backend/1.0"
                }
                
                logger.info(f"Configurações (artigo): timeout={timeout}, headers={headers}")
                
                webhook_response = await client.post(
                    webhook_url,
                    json=webhook_data,
                    timeout=timeout,
                    headers=headers
                )
                
                logger.info(f"Resposta recebida do webhook (artigo): status={webhook_response.status_code}")
                logger.info(f"Headers da resposta (artigo): {dict(webhook_response.headers)}")
                
                if webhook_response.status_code == 200:
                    try:
                        webhook_result = webhook_response.json()
                        logger.info(f"Resposta JSON do webhook (artigo): {webhook_result}")
                        response = webhook_result.get("response", "Desculpe, não consegui processar sua mensagem sobre artigos.")
                    except json.JSONDecodeError as json_err:
                        logger.error(f"Erro ao decodificar JSON da resposta (artigo): {json_err}")
                        logger.error(f"Conteúdo da resposta (artigo): {webhook_response.text}")
                        response = "Desculpe, resposta inválida do webhook para artigos."
                else:
                    logger.error(f"Webhook retornou status {webhook_response.status_code} (artigo)")
                    logger.error(f"Conteúdo da resposta (artigo): {webhook_response.text}")
                    response = "Desculpe, ocorreu um erro ao processar sua mensagem sobre artigos."
                    
        except httpx.ConnectError as conn_err:
            logger.error(f"Erro de conexão com webhook (artigo): {conn_err}")
            logger.error(f"Detalhes da conexão (artigo): {type(conn_err).__name__}")
            response = "Desculpe, não foi possível conectar ao serviço de chat de artigos."
            
        except httpx.TimeoutException as timeout_err:
            logger.error(f"Timeout na requisição para webhook (artigo): {timeout_err}")
            response = "Desculpe, o serviço de chat de artigos demorou muito para responder."
            
        except httpx.HTTPStatusError as http_err:
            logger.error(f"Erro HTTP do webhook (artigo): {http_err}")
            logger.error(f"Status: {http_err.response.status_code}, Resposta: {http_err.response.text}")
            response = "Desculpe, erro na comunicação com o serviço de chat de artigos."
            
        except Exception as http_exc:
            logger.error(f"Erro inesperado na requisição HTTP (artigo): {http_exc}")
            logger.error(f"Tipo do erro (artigo): {type(http_exc).__name__}")
            response = "Desculpe, erro inesperado na comunicação com artigos."
        
        # Limpar tags <think> da resposta antes de retornar ao frontend
        cleaned_response = clean_response_text(response)
        logger.info(f"Resposta limpa para frontend (artigo): {cleaned_response[:100]}...")
        
        response_data = {"response": cleaned_response}
        
        return response_data
    except Exception as e:
        logger.error(f"Erro geral na rota de chat de artigos: {str(e)}")
        logger.error(f"Tipo do erro (artigo): {type(e).__name__}")
        import traceback
        logger.error(f"Traceback completo (artigo): {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/article_chat_with_tts/")
async def article_chat_with_tts(request: ArticleChatRequest):
    try:
        # 1. Limpar comandos de controle da mensagem do usuário
        cleaned_message = clean_user_message(request.message)
        logger.info(f"Mensagem original (artigo TTS): {request.message}")
        logger.info(f"Mensagem limpa (artigo TTS): {cleaned_message}")
        logger.info(f"Professor filtrado: {request.professor_name}")
        
        # Usar webhook em vez do article_chat_service
        webhook_url = WEBHOOK_URL
        logger.info(f"URL do webhook configurada (artigo TTS): {webhook_url}")
        
        # Preparar dados para o webhook com contexto de artigo TTS
        webhook_data = {
            "message": cleaned_message,
            "session_id": request.session_id,
            "professor_name": request.professor_name,
            "context": "article_chat"
        }
        logger.info(f"Dados preparados para webhook (artigo TTS): {webhook_data}")
        
        logger.info(f"Iniciando requisição HTTP para webhook (artigo TTS)...")
        
        # Fazer requisição para o webhook
        try:
            async with httpx.AsyncClient() as client:
                logger.info(f"Cliente HTTP criado, enviando POST para {webhook_url}")
                
                # Configurar timeout e headers
                timeout = httpx.Timeout(30.0, connect=10.0)
                headers = {
                    "Content-Type": "application/json",
                    "User-Agent": "TTS-App-Backend/1.0"
                }
                
                logger.info(f"Configurações (artigo TTS): timeout={timeout}, headers={headers}")
                
                webhook_response = await client.post(
                    webhook_url,
                    json=webhook_data,
                    timeout=timeout,
                    headers=headers
                )
                
                logger.info(f"Resposta recebida do webhook (artigo TTS): status={webhook_response.status_code}")
                logger.info(f"Headers da resposta (artigo TTS): {dict(webhook_response.headers)}")
                
                if webhook_response.status_code == 200:
                    try:
                        webhook_result = webhook_response.json()
                        logger.info(f"Resposta JSON do webhook (artigo TTS): {webhook_result}")
                        text_response = webhook_result.get("response", "Desculpe, não consegui processar sua mensagem sobre artigos.")
                    except json.JSONDecodeError as json_err:
                        logger.error(f"Erro ao decodificar JSON da resposta (artigo TTS): {json_err}")
                        logger.error(f"Conteúdo da resposta (artigo TTS): {webhook_response.text}")
                        text_response = "Desculpe, resposta inválida do webhook para artigos."
                else:
                    logger.error(f"Webhook retornou status {webhook_response.status_code} (artigo TTS)")
                    logger.error(f"Conteúdo da resposta (artigo TTS): {webhook_response.text}")
                    text_response = "Desculpe, ocorreu um erro ao processar sua mensagem sobre artigos."
                    
        except httpx.ConnectError as conn_err:
            logger.error(f"Erro de conexão com webhook (artigo TTS): {conn_err}")
            logger.error(f"Detalhes da conexão (artigo TTS): {type(conn_err).__name__}")
            text_response = "Desculpe, não foi possível conectar ao serviço de chat de artigos."
            
        except httpx.TimeoutException as timeout_err:
            logger.error(f"Timeout na requisição para webhook (artigo TTS): {timeout_err}")
            text_response = "Desculpe, o serviço de chat de artigos demorou muito para responder."
            
        except httpx.HTTPStatusError as http_err:
            logger.error(f"Erro HTTP do webhook (artigo TTS): {http_err}")
            logger.error(f"Status: {http_err.response.status_code}, Resposta: {http_err.response.text}")
            text_response = "Desculpe, erro na comunicação com o serviço de chat de artigos."
            
        except Exception as http_exc:
            logger.error(f"Erro inesperado na requisição HTTP (artigo TTS): {http_exc}")
            logger.error(f"Tipo do erro (artigo TTS): {type(http_exc).__name__}")
            text_response = "Desculpe, erro inesperado na comunicação com artigos."
        
        # 3. Limpar texto de resposta para o frontend (remover tags <think>)
        cleaned_response = clean_response_text(text_response)
        logger.info(f"Resposta limpa para frontend (artigo TTS): {cleaned_response[:100]}...")
        
        # 4. Limpar texto para TTS (remover tags <think> e asteriscos)
        cleaned_text_for_tts = re.sub(r'<think>.*?</think>', '', text_response, flags=re.DOTALL | re.IGNORECASE)
        # Remover asteriscos
        cleaned_text_for_tts = re.sub(r'\*', '', cleaned_text_for_tts)
        # Limpar espaços extras
        cleaned_text_for_tts = re.sub(r'\s+', ' ', cleaned_text_for_tts).strip()
        logger.info(f"Texto limpo para TTS (artigo TTS): {cleaned_text_for_tts[:100]}...")
        
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
        logger.error(f"Erro geral na rota de chat com TTS para artigo: {str(e)}")
        logger.error(f"Tipo do erro (artigo TTS): {type(e).__name__}")
        import traceback
        logger.error(f"Traceback completo (artigo TTS): {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/chat_with_tts/")
async def chat_with_tts(request: ChatRequest):
    try:
        # 1. Limpar comandos de controle da mensagem do usuário
        cleaned_message = clean_user_message(request.message)
        logger.info(f"Mensagem original: {request.message}")
        logger.info(f"Mensagem limpa: {cleaned_message}")
        
        # Usar webhook em vez do chat_service
        webhook_url = WEBHOOK_URL
        logger.info(f"URL do webhook configurada (TTS): {webhook_url}")
        
        # Preparar dados para o webhook com contexto de TTS
        webhook_data = {
            "message": cleaned_message,
            "session_id": request.session_id,
            "context": "general"
        }
        logger.info(f"Dados preparados para webhook (TTS): {webhook_data}")
        
        logger.info(f"Iniciando requisição HTTP para webhook (TTS)...")
        
        # Fazer requisição para o webhook
        try:
            async with httpx.AsyncClient() as client:
                logger.info(f"Cliente HTTP criado, enviando POST para {webhook_url}")
                
                # Configurar timeout e headers
                timeout = httpx.Timeout(30.0, connect=10.0)
                headers = {
                    "Content-Type": "application/json",
                    "User-Agent": "TTS-App-Backend/1.0"
                }
                
                logger.info(f"Configurações (TTS): timeout={timeout}, headers={headers}")
                
                webhook_response = await client.post(
                    webhook_url,
                    json=webhook_data,
                    timeout=timeout,
                    headers=headers
                )
                
                logger.info(f"Resposta recebida do webhook (TTS): status={webhook_response.status_code}")
                logger.info(f"Headers da resposta (TTS): {dict(webhook_response.headers)}")
                
                if webhook_response.status_code == 200:
                    try:
                        webhook_result = webhook_response.json()
                        logger.info(f"Resposta JSON do webhook (TTS): {webhook_result}")
                        text_response = webhook_result.get("response", "Desculpe, não consegui processar sua mensagem.")
                    except json.JSONDecodeError as json_err:
                        logger.error(f"Erro ao decodificar JSON da resposta (TTS): {json_err}")
                        logger.error(f"Conteúdo da resposta (TTS): {webhook_response.text}")
                        text_response = "Desculpe, resposta inválida do webhook."
                else:
                    logger.error(f"Webhook retornou status {webhook_response.status_code} (TTS)")
                    logger.error(f"Conteúdo da resposta (TTS): {webhook_response.text}")
                    text_response = "Desculpe, ocorreu um erro ao processar sua mensagem."
                    
        except httpx.ConnectError as conn_err:
            logger.error(f"Erro de conexão com webhook (TTS): {conn_err}")
            logger.error(f"Detalhes da conexão (TTS): {type(conn_err).__name__}")
            text_response = "Desculpe, não foi possível conectar ao serviço de chat."
            
        except httpx.TimeoutException as timeout_err:
            logger.error(f"Timeout na requisição para webhook (TTS): {timeout_err}")
            text_response = "Desculpe, o serviço de chat demorou muito para responder."
            
        except httpx.HTTPStatusError as http_err:
            logger.error(f"Erro HTTP do webhook (TTS): {http_err}")
            logger.error(f"Status: {http_err.response.status_code}, Resposta: {http_err.response.text}")
            text_response = "Desculpe, erro na comunicação com o serviço de chat."
            
        except Exception as http_exc:
            logger.error(f"Erro inesperado na requisição HTTP (TTS): {http_exc}")
            logger.error(f"Tipo do erro (TTS): {type(http_exc).__name__}")
            text_response = "Desculpe, erro inesperado na comunicação."
        
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
        logger.error(f"Erro geral na rota de chat com TTS: {str(e)}")
        logger.error(f"Tipo do erro (TTS): {type(e).__name__}")
        import traceback
        logger.error(f"Traceback completo (TTS): {traceback.format_exc()}")
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
