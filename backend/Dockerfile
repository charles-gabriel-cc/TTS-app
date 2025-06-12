# Dockerfile funcional com CUDA 11.8 e Python 3.10.11
FROM nvidia/cuda:11.8.0-devel-ubuntu20.04

# Evitar prompts interativos
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC

# Instalar dependências do sistema e Python 3.10
RUN apt-get update && apt-get install -y \
    software-properties-common \
    && add-apt-repository ppa:deadsnakes/ppa \
    && apt-get update && apt-get install -y \
    python3.10 \
    python3.10-dev \
    python3.10-distutils \
    python3-pip \
    curl \
    git \
    build-essential \
    ffmpeg \
    libsndfile1 \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Configurar Python 3.10 como padrão
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3.10 1
RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.10 1

# Instalar pip para Python 3.10
RUN curl -sS https://bootstrap.pypa.io/get-pip.py | python3.10

# Verificar versão Python
RUN python --version && python -c "import sys; print(sys.version)"

# Instalar Rust para py-rust-stemmers
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:$PATH"

# Definir diretório de trabalho
WORKDIR /app

# Copiar requirements
COPY requirements-fixed.txt ./requirements.txt

# Atualizar pip e instalar dependências básicas
RUN python -m pip install --no-cache-dir --upgrade pip wheel setuptools

# Instalar PyTorch com CUDA 11.8 primeiro
RUN python -m pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# Instalar outras dependências Python
RUN python -m pip install --no-cache-dir -r requirements.txt

# Instalar fastembed-gpu e qdrant-client
RUN python -m pip install --no-cache-dir fastembed-gpu
RUN python -m pip install --no-cache-dir "qdrant-client[fastembed-gpu]"

# Copiar código da aplicação
COPY . .

# Criar diretórios necessários
RUN mkdir -p logs temp uploads data

# Expor porta
EXPOSE 8000

# Variáveis de ambiente
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV NVIDIA_VISIBLE_DEVICES=all
ENV CUDA_VISIBLE_DEVICES=0

# Script de inicialização
RUN echo '#!/bin/bash\n\
echo "=== TTS-APP com CUDA 11.8 e Python $(python --version) ==="\n\
echo "Verificando CUDA..."\n\
nvidia-smi\n\
echo "Aguardando Qdrant ficar disponível..."\n\
while ! curl -s http://qdrant:6333/health > /dev/null 2>&1; do\n\
  sleep 2\n\
done\n\
echo "Qdrant está disponível!"\n\
echo "Iniciando aplicação Python..."\n\
python server.py\n\
' > /app/entrypoint.sh && chmod +x /app/entrypoint.sh

# Comando de inicialização
CMD ["/app/entrypoint.sh"] 