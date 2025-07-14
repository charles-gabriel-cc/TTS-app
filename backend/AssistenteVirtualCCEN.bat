@echo off
echo ====================================
echo    Iniciando Backend TTS-APP
echo ====================================

echo.
echo 1. Verificando se Docker Desktop esta rodando...
docker version >nul 2>&1
if %errorlevel% neq 0 (
    echo Docker Desktop nao esta rodando. Iniciando...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    echo Aguardando Docker Desktop inicializar...
    timeout /t 15 /nobreak
    echo Verificando novamente...
    :check_docker
    docker version >nul 2>&1
    if %errorlevel% neq 0 (
        echo Ainda aguardando Docker Desktop...
        timeout /t 5 /nobreak
        goto check_docker
    )
    echo Docker Desktop esta rodando!
) else (
    echo Docker Desktop ja esta rodando!
)

echo.
echo 2. Parando containers anteriores (se houver)...
docker-compose -f docker-compose.yml down

echo.
echo 3. Subindo containers...
docker-compose -f docker-compose.yml up -d

echo.
echo 4. Aguardando containers ficarem prontos...
timeout /t 5 /nobreak

echo.
echo 5. Verificando status dos containers...
docker-compose -f docker-compose.yml ps

echo.
echo 6. Entrando no container e executando servidor...
echo Para sair, pressione Ctrl+C e depois 'exit'
echo.

docker exec -it tts-app-backend bash -c "python server.py" 