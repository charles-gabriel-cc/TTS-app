import os
import tempfile
import whisper
import subprocess
import numpy as np
from utils.logger import setup_logger

# Configurar logger
logger = setup_logger(__name__)

# Diretório de cache fixo para os modelos Whisper
WHISPER_CACHE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "whisper_cache")

class TranscriptionService:
    def __init__(self, model_name="base"):
        """
        Inicializa o serviço de transcrição com o modelo Whisper especificado.
        
        Args:
            model_name (str): Nome do modelo Whisper a ser usado (tiny, base, small, medium, large)
        """
        logger.info(f"Inicializando serviço de transcrição com modelo: {model_name}")
        
        # Criar diretório de cache se não existir
        os.makedirs(WHISPER_CACHE_DIR, exist_ok=True)
        logger.info(f"Diretório de cache do Whisper: {WHISPER_CACHE_DIR}")
        
        # Definir a variável de ambiente para o cache do Whisper
        os.environ["WHISPER_CACHE_DIR"] = WHISPER_CACHE_DIR
        
        # Verificar se o modelo já existe no cache
        model_files = [
            f"{model_name}.pt",
            f"{model_name}.en.pt"
        ]
        
        cached_model_exists = any(
            os.path.exists(os.path.join(WHISPER_CACHE_DIR, model_file))
            for model_file in model_files
        )
        
        if cached_model_exists:
            logger.info(f"Modelo {model_name} encontrado no cache, carregando...")
        else:
            logger.info(f"Modelo {model_name} não encontrado no cache, será baixado...")
        
        # Carregar o modelo (usará o cache se disponível)
        self.model = whisper.load_model(model_name, download_root=WHISPER_CACHE_DIR)
        
        logger.info(f"Modelo {model_name} carregado com sucesso!")
        
        # Aquecer o modelo na inicialização
        self._warm_up_model()

    def _warm_up_model(self):
        """
        Aquece o modelo Whisper com um áudio vazio/sintético para otimizar performance.
        """
        try:
            logger.info("Aquecendo modelo Whisper...")
            
            # Criar um áudio sintético de silêncio (16kHz, 1 segundo, mono)
            sample_rate = 16000
            duration = 1.0  # 1 segundo
            samples = int(sample_rate * duration)
            
            # Gerar áudio de silêncio com um pouco de ruído baixo para simular áudio real
            audio_data = np.random.normal(0, 0.001, samples).astype(np.float32)
            
            # Transcrever o áudio sintético para aquecer o modelo
            result = self.model.transcribe(audio_data)
            
            logger.info("Modelo Whisper aquecido com sucesso")
            
        except Exception as e:
            logger.warning(f"Falha ao aquecer modelo Whisper: {str(e)}")
            # Não falhar a inicialização se o aquecimento falhar
            pass

    async def transcribe_audio(self, audio_file):
        """
        Transcreve um arquivo de áudio usando o modelo Whisper.
        
        Args:
            audio_file: Arquivo de áudio a ser transcrito
            
        Returns:
            str: Texto transcrito do áudio
        """
        try:
            # Criar arquivo temporário para salvar o áudio original
            with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_file:
                temp_path = temp_file.name
                content = await audio_file.read()
                temp_file.write(content)
            
            logger.info(f"Arquivo de áudio original salvo temporariamente em: {temp_path}")
            logger.info(f"Tamanho do arquivo: {len(content)} bytes")
            
            # Criar arquivo temporário para o áudio convertido
            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as converted_file:
                converted_path = converted_file.name
            
            # Converter o áudio para WAV usando FFmpeg com configurações mais simples
            try:
                logger.info(f"Convertendo áudio para WAV: {converted_path}")
                ffmpeg_cmd = [
                    "ffmpeg",
                    "-i", temp_path,
                    "-acodec", "pcm_s16le",
                    "-ar", "16000",
                    "-ac", "1",
                    "-f", "wav",
                    "-y",
                    converted_path
                ]
                logger.info(f"Comando FFmpeg: {' '.join(ffmpeg_cmd)}")
                
                result = subprocess.run(
                    ffmpeg_cmd,
                    check=True,
                    capture_output=True,
                    text=True
                )
                
                logger.info("FFmpeg stdout: " + result.stdout)
                if result.stderr:
                    logger.info("FFmpeg stderr: " + result.stderr)
                
                # Verificar se o arquivo convertido foi criado e tem tamanho
                if os.path.exists(converted_path):
                    file_size = os.path.getsize(converted_path)
                    logger.info(f"Arquivo WAV criado com sucesso. Tamanho: {file_size} bytes")
                else:
                    raise Exception("Arquivo WAV não foi criado")
                
                # Transcrever o áudio convertido
                result = self.model.transcribe(converted_path)
                transcribed_text = result["text"]
                
                # Limpar arquivos temporários
                os.unlink(temp_path)
                os.unlink(converted_path)
                
                logger.info("Transcrição concluída com sucesso")
                return transcribed_text
                
            except subprocess.CalledProcessError as e:
                logger.error(f"Erro na conversão do áudio: {e.stderr}")
                logger.error(f"Comando que falhou: {' '.join(e.cmd)}")
                raise Exception(f"Erro na conversão do áudio: {e.stderr}")
            
        except Exception as e:
            logger.error(f"Erro durante a transcrição: {str(e)}")
            raise Exception(f"Erro durante a transcrição: {str(e)}")
