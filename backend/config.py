import os
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

# Configurações do servidor
SERVER_HOST = "0.0.0.0"
SERVER_PORT = 8000

# Configurações do Whisper
WHISPER_MODEL = "base"  # ou "tiny", "small", "medium", "large"

# Configurações do Chat
USE_LOCAL_MODEL = True  # Alternar entre modelo local e OpenAI
MODEL_NAME = "phi4:latest"
EMBED_MODEL = "all-minilm:l6-v2"
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
USE_LOCAL_COLLECTION = True
COLLECTION_NAME = "ccen-docentes-vetores"
QDRANT_URL = 'URL'
QDRANT_API_KEY = 'API_KEY'
DOCS = "ccen-docentes"