import os
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

# Configurações do servidor
SERVER_HOST = os.getenv("SERVER_HOST")
SERVER_PORT = os.getenv("SERVER_PORT")

# Configurações do Whisper
WHISPER_MODEL = "base"  # ou "tiny", "small", "medium", "large"

# Configurações do Chat
USE_LOCAL_MODEL = True  # Alternar entre modelo local e OpenAI
MODEL_NAME = "qwen2.5:14b"
EMBED_MODEL = "all-minilm:l6-v2"
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
USE_LOCAL_COLLECTION = True
COLLECTION_NAME = "ccen-docentes"
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
DOCS = "ccen-docentes"
