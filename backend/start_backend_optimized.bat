@echo off
echo ========================================
echo    TTS-APP BACKEND - OTIMIZADO
echo ========================================
echo.
echo Configuracoes otimizadas para evitar timeout:
echo - Timeout: 120 segundos
echo - Keep-alive: 5 segundos  
echo - Workers: 2
echo - Max requests: 1000
echo.

REM Verificar se o Docker está rodando
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ERRO: Docker nao esta rodando!
    echo Por favor, inicie o Docker Desktop e tente novamente.
    pause
    exit /b 1
)

REM Parar containers existentes
echo Parando containers existentes...
docker-compose down

REM Iniciar com configurações otimizadas
echo Iniciando containers com configuracoes otimizadas...
docker-compose up --build

echo.
echo ========================================
echo    BACKEND INICIADO COM SUCESSO!
echo ========================================
echo.
echo URLs disponiveis:
echo - Backend: http://localhost:8000
echo - Health Check: http://localhost:8000/health
echo - Qdrant: http://localhost:6333
echo - Ollama: http://localhost:11434
echo.
echo Para parar: Ctrl+C
echo Para ver logs: docker-compose logs -f tts-app
echo.
pause
