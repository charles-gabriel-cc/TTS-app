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
LOCAL_MODEL_TYPE = "ollama"  # "ollama", "llamacpp", "localai", "transformers"
LOCAL_MODEL_NAME = "llama3.2:1b"  # Nome do modelo local (ex: "llama2", "mistral", "codellama")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = "gpt-3.5-turbo"  # Usado apenas quando USE_LOCAL_MODEL = False
