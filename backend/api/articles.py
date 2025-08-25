from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List
import os
import glob
from pathlib import Path

# Configurar logger
from utils.logger import setup_logger
logger = setup_logger(__name__)

router = APIRouter(prefix="/articles", tags=["articles"])

class PDFArticle(BaseModel):
    id: str
    filename: str
    title: str  # Nome do professor
    author: str  # Nome do professor
    size: int
    url: str  # Caminho do arquivo

@router.get("/pdfs", response_model=List[PDFArticle])
async def get_pdf_articles():
    """
    Retorna todos os PDFs de artigos disponíveis na pasta articles.
    Os nomes dos arquivos correspondem aos nomes dos professores.
    """
    try:
        # Caminho para a pasta articles
        articles_dir = Path("articles")
        
        if not articles_dir.exists():
            logger.warning("Pasta articles não encontrada")
            return []
        
        # Buscar todos os arquivos PDF na pasta articles
        pdf_files = glob.glob(str(articles_dir / "*.pdf"))
        
        articles = []
        for pdf_path in pdf_files:
            try:
                # Obter informações do arquivo
                file_path = Path(pdf_path)
                filename = file_path.name
                file_size = file_path.stat().st_size
                
                # O nome do professor é o nome do arquivo sem a extensão .pdf
                professor_name = file_path.stem
                
                article = PDFArticle(
                    id=professor_name,  # Usar nome do professor como ID
                    filename=filename,
                    title=professor_name,  # Nome do professor como título
                    author=professor_name,  # Nome do professor como autor
                    size=file_size,
                    url=str(file_path)  # Caminho do arquivo como URL
                )
                articles.append(article)
                
            except Exception as e:
                logger.error(f"Erro ao processar arquivo {pdf_path}: {str(e)}")
                continue
        
        # Ordenar por nome do professor
        articles.sort(key=lambda x: x.title.lower())
        
        logger.info(f"Retornando {len(articles)} artigos PDF encontrados")
        return articles
        
    except Exception as e:
        logger.error(f"Erro ao buscar artigos PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro interno do servidor: {str(e)}")

@router.get("/pdfs/{professor_name}")
async def get_pdf_by_professor(professor_name: str):
    """
    Retorna informações de um PDF específico pelo nome do professor.
    """
    try:
        # Caminho para a pasta articles
        articles_dir = Path("articles")
        
        if not articles_dir.exists():
            raise HTTPException(status_code=404, detail="Pasta articles não encontrada")
        
        # Buscar arquivo PDF específico
        pdf_files = glob.glob(str(articles_dir / f"*{professor_name}*.pdf"))
        
        if not pdf_files:
            raise HTTPException(status_code=404, detail=f"PDF não encontrado para o professor: {professor_name}")
        
        # Retornar o primeiro arquivo encontrado
        pdf_path = Path(pdf_files[0])
        filename = pdf_path.name
        file_size = pdf_path.stat().st_size
        
        article = PDFArticle(
            id=professor_name,  # Usar nome do professor como ID
            filename=filename,
            title=professor_name,  # Nome do professor como título
            author=professor_name,  # Nome do professor como autor
            size=file_size,
            url=str(pdf_path)  # Caminho do arquivo como URL
        )
        
        logger.info(f"Retornando PDF para professor: {professor_name}")
        return article
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao buscar PDF do professor {professor_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro interno do servidor: {str(e)}")

@router.get("/pdfs/{professor_name}/download", response_class=FileResponse)
async def download_pdf(professor_name: str):
    """
    Retorna um arquivo PDF específico pelo nome do professor usando FileResponse.
    Esta rota permite que o frontend baixe e visualize o PDF diretamente.
    """
    try:
        # Caminho para a pasta articles
        articles_dir = Path("articles")
        
        if not articles_dir.exists():
            raise HTTPException(status_code=404, detail="Pasta articles não encontrada")
        
        # Buscar arquivo PDF específico
        pdf_files = glob.glob(str(articles_dir / f"*{professor_name}*.pdf"))
        
        if not pdf_files:
            raise HTTPException(status_code=404, detail=f"PDF não encontrado para o professor: {professor_name}")
        
        # Retornar o primeiro arquivo encontrado
        pdf_path = Path(pdf_files[0])
        
        if not pdf_path.exists():
            raise HTTPException(status_code=404, detail=f"Arquivo PDF não encontrado: {pdf_path}")
        
        # Usar FileResponse para servir o arquivo
        return FileResponse(
            path=str(pdf_path),
            media_type='application/pdf',
            filename=pdf_path.name
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao servir PDF do professor {professor_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro interno do servidor: {str(e)}")

@router.get("/pdfs/{professor_name}/view", response_class=FileResponse)
async def view_pdf(professor_name: str):
    """
    Retorna um arquivo PDF específico para visualização em iframe.
    Esta rota configura headers apropriados para exibição inline.
    """
    try:
        # Caminho para a pasta articles
        articles_dir = Path("articles")
        
        if not articles_dir.exists():
            raise HTTPException(status_code=404, detail="Pasta articles não encontrada")
        
        # Buscar arquivo PDF específico
        pdf_files = glob.glob(str(articles_dir / f"*{professor_name}*.pdf"))
        
        if not pdf_files:
            raise HTTPException(status_code=404, detail=f"PDF não encontrado para o professor: {professor_name}")
        
        # Retornar o primeiro arquivo encontrado
        pdf_path = Path(pdf_files[0])
        
        if not pdf_path.exists():
            raise HTTPException(status_code=404, detail=f"Arquivo PDF não encontrado: {pdf_path}")
        
        # Usar FileResponse para servir o arquivo com headers para iframe
        response = FileResponse(
            path=str(pdf_path),
            media_type='application/pdf',
            filename=pdf_path.name
        )
        
        # Configurar headers para permitir visualização em iframe
        response.headers["Content-Disposition"] = "inline"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao servir PDF do professor {professor_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro interno do servidor: {str(e)}")
