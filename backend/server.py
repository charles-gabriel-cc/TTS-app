from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import whisper
import tempfile
import os
import logging
import traceback

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI()

# Configurar CORS para permitir requisições do frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # URL do frontend React
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info("Iniciando carregamento do modelo Whisper...")
# Inicializar o modelo Whisper (usando o modelo 'tiny' por ser mais leve)
model = whisper.load_model("base")
logger.info("Modelo Whisper carregado com sucesso!")

@app.post("/transcribe/")
async def transcribe_audio(audio: UploadFile = File(...)):
    try:
        logger.info(f"Recebendo arquivo de áudio: {audio.filename}")
        logger.info(f"Tipo do arquivo: {audio.content_type}")
        
        # Criar um arquivo temporário para salvar o áudio
        with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as temp_audio:
            logger.info(f"Salvando áudio em: {temp_audio.name}")
            # Escrever o conteúdo do arquivo recebido
            content = await audio.read()
            logger.info(f"Tamanho do conteúdo recebido: {len(content)} bytes")
            temp_audio.write(content)
            temp_audio_path = temp_audio.name

        # Transcrever o áudio usando o Whisper
        logger.info("Iniciando transcrição com Whisper...")
        try:
            result = model.transcribe(temp_audio_path)
            logger.info("Transcrição concluída com sucesso!")
        except Exception as e:
            logger.error(f"Erro durante a transcrição: {str(e)}")
            logger.error(traceback.format_exc())
            raise
        
        # Limpar o arquivo temporário
        os.unlink(temp_audio_path)
        logger.info("Arquivo temporário removido")

        return {"text": result["text"]}
    except Exception as e:
        logger.error(f"Erro durante o processamento: {str(e)}")
        logger.error(traceback.format_exc())
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    logger.info("Iniciando servidor FastAPI na porta 8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
