"""
API endpoints para gerenciar artigos científicos
"""

from fastapi import APIRouter, HTTPException, Query, Path
from fastapi.responses import FileResponse, StreamingResponse
from typing import List, Dict, Optional
import os
import glob
from pydantic import BaseModel
from qdrant_client import QdrantClient
from config import QDRANT_URL, QDRANT_API_KEY, EMBED_MODEL, ARTICLES_COLLECTION_NAME
from utils.logger import setup_logger

logger = setup_logger(__name__)

# Criar router
router = APIRouter(prefix="/articles", tags=["articles"])

# Inicializar serviços (comentado temporariamente)
# qdrant_client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
# article_service = ArticleService(qdrant_client=qdrant_client, embed_model_name=EMBED_MODEL)

# Modelos Pydantic
class ArticleGalleryItem(BaseModel):
    id: str
    title: str
    author: str
    year: str
    journal: str
    doi: str
    abstract: str
    keywords: List[str]

class ArticleDetail(BaseModel):
    id: str
    title: str
    author: str
    year: str
    journal: str
    doi: str
    abstract: str
    keywords: List[str]
    source: str

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    contexts: List[Dict]
    session_id: str

class SearchResult(BaseModel):
    text: str
    chunk_index: int
    score: float
    title: str
    author: str

class PDFArticle(BaseModel):
    id: str
    filename: str
    title: str
    author: str
    size: int
    url: str

# @router.get("/gallery", response_model=List[ArticleGalleryItem])
# async def get_articles_gallery(
#     limit: int = Query(50, description="Número máximo de artigos a retornar"),
#     author: Optional[str] = Query(None, description="Filtrar por autor específico")
# ):
#     """
#     Retorna lista de artigos para exibição na galeria
#     """
#     try:
#         articles = article_service.get_articles_for_gallery(limit=limit)
#         
#         # Filtrar por autor se especificado
#         if author:
#             articles = [a for a in articles if author.lower() in a['author'].lower()]
#         
#         return [ArticleGalleryItem(**article) for article in articles]
#         
#     except Exception as e:
#         logger.error(f"Erro ao buscar galeria de artigos: {e}")
#         raise HTTPException(status_code=500, detail="Erro interno do servidor")

@router.get("/{article_id}", response_model=ArticleDetail)
async def get_article_detail(
    article_id: str = Path(..., description="ID único do artigo")
):
    """
    Retorna detalhes completos de um artigo específico
    """
    try:
        article = article_service.get_article_by_id(article_id)
        
        if not article:
            raise HTTPException(status_code=404, detail="Artigo não encontrado")
        
        return ArticleDetail(**article)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao buscar artigo {article_id}: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@router.get("/{article_id}/pdf")
async def get_article_pdf(
    article_id: str = Path(..., description="ID único do artigo")
):
    """
    Retorna o PDF do artigo para download ou visualização
    """
    try:
        article = article_service.get_article_by_id(article_id)
        
        if not article:
            raise HTTPException(status_code=404, detail="Artigo não encontrado")
        
        pdf_path = article['source']
        
        if not os.path.exists(pdf_path):
            raise HTTPException(status_code=404, detail="Arquivo PDF não encontrado")
        
        return FileResponse(
            path=pdf_path,
            media_type='application/pdf',
            filename=f"{article['author']}_{article['year']}.pdf"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao acessar PDF do artigo {article_id}: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@router.post("/{article_id}/search", response_model=List[SearchResult])
async def search_within_article(
    article_id: str = Path(..., description="ID único do artigo"),
    query: str = Query(..., description="Texto de busca semântica"),
    limit: int = Query(5, description="Número máximo de resultados")
):
    """
    Busca semântica dentro de um artigo específico
    """
    try:
        if not query.strip():
            raise HTTPException(status_code=400, detail="Query de busca é obrigatória")
        
        results = article_service.search_within_article(
            article_id=article_id,
            query=query,
            limit=limit
        )
        
        return [SearchResult(**result) for result in results]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao buscar em artigo {article_id}: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@router.post("/{article_id}/chat", response_model=ChatResponse)
async def chat_about_article(
    request: ChatRequest,
    article_id: str = Path(..., description="ID único do artigo")
):
    """
    Chat específico sobre um artigo científico
    """
    try:
        if not request.message.strip():
            raise HTTPException(status_code=400, detail="Mensagem é obrigatória")
        
        # Buscar contexto relevante no artigo
        contexts = article_service.search_within_article(
            article_id=article_id,
            query=request.message,
            limit=3
        )
        
        if not contexts:
            return ChatResponse(
                response="Não encontrei informações relevantes sobre sua pergunta neste artigo.",
                contexts=[],
                session_id=request.session_id or "default"
            )
        
        # Preparar contexto para o LLM
        context_text = "\n\n".join([f"Trecho {i+1}: {ctx['text']}" for i, ctx in enumerate(contexts)])
        
        # Por enquanto, resposta simples - depois integrar com ChatService
        response_text = f"""Com base no artigo "{contexts[0]['title']}" de {contexts[0]['author']}, 
encontrei as seguintes informações relevantes:

{context_text}

Esta resposta foi baseada na análise semântica do conteúdo do artigo."""
        
        return ChatResponse(
            response=response_text,
            contexts=contexts,
            session_id=request.session_id or "default"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro no chat sobre artigo {article_id}: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@router.get("/stats/summary")
async def get_articles_stats():
    """
    Retorna estatísticas gerais da coleção de artigos
    """
    try:
        # Obter estatísticas básicas
        articles = article_service.get_articles_for_gallery(limit=1000)
        
        # Contar por autor
        authors = {}
        years = {}
        journals = {}
        
        for article in articles:
            # Autores
            author = article['author']
            authors[author] = authors.get(author, 0) + 1
            
            # Anos
            year = article['year']
            if year:
                years[year] = years.get(year, 0) + 1
            
            # Revistas
            journal = article['journal']
            if journal:
                journals[journal] = journals.get(journal, 0) + 1
        
        return {
            "total_articles": len(articles),
            "total_authors": len(authors),
            "top_authors": sorted(authors.items(), key=lambda x: x[1], reverse=True)[:10],
            "articles_by_year": dict(sorted(years.items(), reverse=True)),
            "top_journals": sorted(journals.items(), key=lambda x: x[1], reverse=True)[:10]
        }
        
    except Exception as e:
        logger.error(f"Erro ao gerar estatísticas: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@router.get("/pdfs", response_model=List[PDFArticle])
async def get_pdf_articles():
    """
    Retorna lista de todos os PDFs de artigos disponíveis
    """
    try:
        # Caminho para a pasta de artigos
        articles_dir = os.path.join(os.path.dirname(__file__), "..", "articles")
        
        if not os.path.exists(articles_dir):
            logger.warning(f"Diretório de artigos não encontrado: {articles_dir}")
            return []
        
        # Buscar todos os arquivos PDF
        pdf_files = glob.glob(os.path.join(articles_dir, "*.pdf"))
        
        pdf_articles = []
        for pdf_path in pdf_files:
            try:
                filename = os.path.basename(pdf_path)
                file_size = os.path.getsize(pdf_path)
                
                # Extrair nome do autor do filename (assumindo formato "NOME AUTOR.pdf")
                author_name = filename.replace('.pdf', '')
                
                # Gerar ID único baseado no filename
                article_id = filename.replace('.pdf', '').replace(' ', '_').lower()
                
                # URL para download do PDF
                pdf_url = f"/api/articles/pdfs/{article_id}/download"
                
                pdf_articles.append(PDFArticle(
                    id=article_id,
                    filename=filename,
                    title=f"Artigo de {author_name}",
                    author=author_name,
                    size=file_size,
                    url=pdf_url
                ))
                
            except Exception as e:
                logger.error(f"Erro ao processar PDF {pdf_path}: {e}")
                continue
        
        # Ordenar por nome do autor
        pdf_articles.sort(key=lambda x: x.author.lower())
        
        return pdf_articles
        
    except Exception as e:
        logger.error(f"Erro ao listar PDFs: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@router.get("/pdfs/{article_id}/download")
async def download_pdf(article_id: str):
    """
    Download de um PDF específico
    """
    try:
        # Caminho para a pasta de artigos
        articles_dir = os.path.join(os.path.dirname(__file__), "..", "articles")
        
        # Buscar o arquivo PDF correspondente
        pdf_files = glob.glob(os.path.join(articles_dir, "*.pdf"))
        
        for pdf_path in pdf_files:
            filename = os.path.basename(pdf_path)
            current_id = filename.replace('.pdf', '').replace(' ', '_').lower()
            
            if current_id == article_id:
                return FileResponse(
                    path=pdf_path,
                    filename=filename,
                    media_type='application/pdf'
                )
        
        raise HTTPException(status_code=404, detail="PDF não encontrado")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao baixar PDF {article_id}: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")
