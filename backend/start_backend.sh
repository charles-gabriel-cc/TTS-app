#!/bin/bash
echo "===================================="
echo "    Iniciando Backend TTS-APP"
echo "===================================="

echo
echo "1. Verificando se Docker está rodando..."
if ! docker version &> /dev/null; then
    echo "Docker não está rodando. Tentando iniciar..."
    
    # Para macOS com Docker Desktop
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "Detectado macOS. Iniciando Docker Desktop..."
        open -a Docker
        echo "Aguardando Docker Desktop inicializar..."
        sleep 15
        
        # Aguarda até Docker estar disponível
        while ! docker version &> /dev/null; do
            echo "Ainda aguardando Docker Desktop..."
            sleep 5
        done
        
    # Para Linux
    else
        echo "Detectado Linux. Iniciando serviço Docker..."
        sudo systemctl start docker
        sleep 5
        
        # Aguarda até Docker estar disponível
        while ! docker version &> /dev/null; do
            echo "Ainda aguardando Docker..."
            sleep 3
        done
    fi
    
    echo "Docker está rodando!"
else
    echo "Docker já está rodando!"
fi

echo
echo "2. Parando containers anteriores (se houver)..."
docker-compose -f docker-compose.dev.yml down

echo
echo "3. Subindo containers..."
docker-compose -f docker-compose.dev.yml up -d

echo
echo "4. Aguardando containers ficarem prontos..."
sleep 5

echo
echo "5. Verificando status dos containers..."
docker-compose -f docker-compose.dev.yml ps

echo
echo "6. Entrando no container e executando servidor..."
echo "Para sair, pressione Ctrl+C e depois 'exit'"
echo

docker exec -it tts-app-backend-dev bash -c "python server.py" 