import os
import re
import uuid
import hashlib
from typing import List, Dict, Optional
import pandas as pd
from llama_index.readers.file import PDFReader
from llama_index.core.node_parser import SemanticSplitterNodeParser
from llama_index.embeddings.ollama import OllamaEmbedding
from qdrant_client import QdrantClient, models
from qdrant_client.models import Distance, VectorParams, PointStruct
from utils.logger import setup_logger

logger = setup_logger(__name__)

class ArticleService:
    def __init__(self, qdrant_client: QdrantClient, embed_model_name: str = "all-minilm:l6-v2"):
        self.qdrant_client = qdrant_client
        self.embed_model_name = embed_model_name
        self.collection_name = "ccen-artigos"
        
        # Inicializar modelo de embedding
        ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        self.embed_model = OllamaEmbedding(model_name=embed_model_name, base_url=ollama_base_url)
        self.parser = SemanticSplitterNodeParser.from_defaults(embed_model=self.embed_model)
        
        # Carregar metadados do CSV
        self.professor_metadata = self._load_professor_metadata()
        
    def _load_professor_metadata(self) -> Dict[str, Dict]:
        """Carrega metadados dos professores do CSV"""
        try:
            csv_path = "articles/professores_ccen_completo.csv"
            if os.path.exists(csv_path):
                df = pd.read_csv(csv_path)
                metadata = {}
                for _, row in df.iterrows():
                    nome_completo = row.get('nome_completo', '')
                    if pd.notna(nome_completo) and nome_completo.strip():
                        metadata[nome_completo] = {
                            'professor_nome': row.get('professor_nome', ''),
                            'doi_link': row.get('doi_link', '')
                        }
                return metadata
            return {}
        except Exception as e:
            logger.warning(f"Erro ao carregar metadados dos professores: {e}")
            return {}
    
    def create_articles_collection(self):
        """Cria a coleção de artigos se não existir"""
        try:
            # Verificar se a coleção já existe
            collections = [c.name for c in self.qdrant_client.get_collections().collections]
            
            if self.collection_name not in collections:
                # Criar coleção
                self.qdrant_client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(size=384, distance=Distance.COSINE)
                )
                logger.info(f"✅ Coleção '{self.collection_name}' criada.")
            else:
                logger.info(f"⚠️ Coleção '{self.collection_name}' já existe.")
            
            # Criar índices para busca eficiente
            self._create_collection_indexes()
            
        except Exception as e:
            logger.error(f"Erro ao criar coleção de artigos: {e}")
            
    def _create_collection_indexes(self):
        """Cria índices para campos importantes"""
        campos_indexados = [
            "article_id", 
            "nome_professor", 
            "nome_completo_professor",
            "doi", 
            "titulo", 
            "ano", 
            "revista",
            "keywords"
        ]
        
        for campo in campos_indexados:
            try:
                self.qdrant_client.create_payload_index(
                    collection_name=self.collection_name,
                    field_name=campo,
                    field_schema=models.TextIndexParams(
                        type="text",
                        tokenizer=models.TokenizerType.MULTILINGUAL,
                        min_token_len=2,
                        max_token_len=20,
                        lowercase=True,
                    ),
                )
                logger.info(f"🔧 Índice criado para '{campo}'.")
            except Exception as e:
                if "already exists" in str(e).lower():
                    logger.info(f"⚠️ Índice para '{campo}' já existe.")
                else:
                    logger.error(f"❌ Erro ao criar índice para '{campo}': {e}")
    
    def _extract_article_metadata(self, pdf_path: str, nome_professor: str) -> Dict:
        """Extrai metadados do artigo do PDF"""
        try:
            documents = PDFReader().load_data(pdf_path)
            full_text = " ".join([doc.text for doc in documents])
            
            # Gerar ID único para o artigo
            article_id = self._generate_article_id(pdf_path, nome_professor)
            
            # Extrair título (geralmente nas primeiras linhas)
            titulo = self._extract_title(full_text)
            
            # Extrair abstract
            abstract = self._extract_abstract(full_text)
            
            # Extrair ano
            ano = self._extract_year(full_text)
            
            # Extrair revista/journal
            revista = self._extract_journal(full_text)
            
            # Extrair keywords
            keywords = self._extract_keywords(full_text)
            
            # Obter metadados do CSV
            professor_meta = self.professor_metadata.get(nome_professor, {})
            
            metadata = {
                "article_id": article_id,
                "nome_professor": nome_professor,
                "nome_completo_professor": nome_professor,
                "professor_nome_curto": professor_meta.get('professor_nome', ''),
                "doi": professor_meta.get('doi_link', ''),
                "titulo": titulo,
                "abstract": abstract,
                "ano": ano,
                "revista": revista,
                "keywords": keywords,
                "source": pdf_path,
                "tipo_de_documento": "artigo"
            }
            
            return metadata
            
        except Exception as e:
            logger.error(f"Erro ao extrair metadados de {pdf_path}: {e}")
            return {
                "article_id": self._generate_article_id(pdf_path, nome_professor),
                "nome_professor": nome_professor,
                "nome_completo_professor": nome_professor,
                "source": pdf_path,
                "tipo_de_documento": "artigo"
            }
    
    def _generate_article_id(self, pdf_path: str, nome_professor: str) -> str:
        """Gera ID único para o artigo"""
        content = f"{pdf_path}_{nome_professor}"
        return hashlib.md5(content.encode()).hexdigest()[:12]
    
    def _extract_title(self, text: str) -> str:
        """Extrai título do artigo"""
        lines = text.split('\n')
        # Procurar por linhas que parecem títulos (geralmente nas primeiras 10 linhas)
        for i, line in enumerate(lines[:10]):
            line = line.strip()
            if len(line) > 10 and len(line) < 200 and not line.lower().startswith(('abstract', 'resumo')):
                # Se a linha seguinte está vazia ou é muito diferente, provavelmente é um título
                if i + 1 < len(lines) and (not lines[i + 1].strip() or len(lines[i + 1]) < len(line) * 0.5):
                    return line
        
        # Fallback: primeira linha não vazia
        for line in lines[:5]:
            if line.strip() and len(line.strip()) > 10:
                return line.strip()[:200]
        
        return "Título não identificado"
    
    def _extract_abstract(self, text: str) -> str:
        """Extrai abstract do artigo"""
        # Procurar por seções de abstract/resumo
        patterns = [
            r'(?i)abstract\s*[:\-]?\s*(.*?)(?=\n\s*\n|\n\s*1\.|\n\s*introduction|\n\s*keywords)',
            r'(?i)resumo\s*[:\-]?\s*(.*?)(?=\n\s*\n|\n\s*1\.|\n\s*introdução|\n\s*palavras)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.DOTALL)
            if match:
                abstract = match.group(1).strip()
                if len(abstract) > 50:  # Abstract deve ter pelo menos 50 caracteres
                    return abstract[:500]  # Limitar tamanho
        
        return ""
    
    def _extract_year(self, text: str) -> str:
        """Extrai ano de publicação"""
        # Procurar por anos no formato 20XX nas primeiras linhas
        lines = text.split('\n')[:20]
        for line in lines:
            years = re.findall(r'\b(20[0-2][0-9])\b', line)
            if years:
                return years[0]
        
        # Procurar em todo o texto como fallback
        years = re.findall(r'\b(20[0-2][0-9])\b', text)
        if years:
            return years[0]
        
        return ""
    
    def _extract_journal(self, text: str) -> str:
        """Extrai nome da revista/journal"""
        # Procurar por padrões comuns de journals
        journal_patterns = [
            r'(?i)published\s+in\s+([^,\n]+)',
            r'(?i)journal\s+of\s+([^,\n]+)',
            r'(?i)proceedings\s+of\s+([^,\n]+)',
            r'(?i)conference\s+on\s+([^,\n]+)',
        ]
        
        for pattern in journal_patterns:
            match = re.search(pattern, text)
            if match:
                journal = match.group(1).strip()
                if len(journal) > 5 and len(journal) < 100:
                    return journal
        
        return ""
    
    def _extract_keywords(self, text: str) -> List[str]:
        """Extrai keywords do artigo"""
        # Procurar seção de keywords
        keywords_patterns = [
            r'(?i)keywords?\s*[:\-]?\s*(.*?)(?=\n\s*\n|\n\s*1\.|\n\s*introduction)',
            r'(?i)palavras?[\s\-]chave\s*[:\-]?\s*(.*?)(?=\n\s*\n|\n\s*1\.)',
        ]
        
        for pattern in keywords_patterns:
            match = re.search(pattern, text, re.DOTALL)
            if match:
                keywords_text = match.group(1).strip()
                # Separar por vírgulas, ponto e vírgula, ou quebras de linha
                keywords = re.split(r'[,;.\n]', keywords_text)
                keywords = [kw.strip() for kw in keywords if kw.strip() and len(kw.strip()) > 2]
                return keywords[:10]  # Limitar a 10 keywords
        
        return []
    
    def process_articles_directory(self, articles_dir: str = "articles"):
        """Processa todos os artigos do diretório"""
        if not os.path.exists(articles_dir):
            logger.error(f"Diretório {articles_dir} não encontrado")
            return
        
        logger.info(f"Iniciando processamento dos artigos em {articles_dir}")
        
        processed_count = 0
        error_count = 0
        
        for root, dirs, files in os.walk(articles_dir):
            for file in files:
                if file.lower().endswith(".pdf"):
                    try:
                        caminho_pdf = os.path.join(root, file)
                        
                        # Nome do professor é o nome do arquivo sem extensão
                        nome_professor = os.path.splitext(file)[0]
                        
                        # Verificar se já foi processado
                        if self._article_already_processed(nome_professor, caminho_pdf):
                            logger.info(f"⏭️ Já processado: {nome_professor}")
                            continue
                        
                        logger.info(f"\n📄 Processando artigo: {file}")
                        
                        # Extrair metadados
                        metadata = self._extract_article_metadata(caminho_pdf, nome_professor)
                        
                        # Processar PDF e criar embeddings
                        self._process_article_pdf(caminho_pdf, metadata)
                        
                        processed_count += 1
                        logger.info(f"✅ Artigo processado: {nome_professor}")
                        
                    except Exception as e:
                        error_count += 1
                        logger.error(f"❌ Erro ao processar {file}: {e}")
        
        logger.info(f"\n🚀 Processamento finalizado!")
        logger.info(f"📊 Artigos processados: {processed_count}")
        logger.info(f"❌ Erros: {error_count}")
    
    def _article_already_processed(self, nome_professor: str, source_path: str) -> bool:
        """Verifica se o artigo já foi processado"""
        try:
            response = self.qdrant_client.scroll(
                collection_name=self.collection_name,
                scroll_filter=models.Filter(
                    must=[
                        models.FieldCondition(
                            key="nome_professor",
                            match=models.MatchValue(value=nome_professor)
                        ),
                        models.FieldCondition(
                            key="source",
                            match=models.MatchValue(value=source_path)
                        )
                    ]
                ),
                limit=1
            )
            return len(response[0]) > 0
        except Exception as e:
            logger.warning(f"Erro ao verificar se artigo foi processado: {e}")
            return False
    
    def _process_article_pdf(self, pdf_path: str, metadata: Dict):
        """Processa PDF e cria embeddings"""
        try:
            # Ler e dividir em chunks
            documents = PDFReader().load_data(pdf_path)
            nodes = self.parser.get_nodes_from_documents(documents)
            
            # Criar pontos para inserção
            points = []
            for i, node in enumerate(nodes):
                texto = node.text
                vetor = self.embed_model.get_text_embedding(texto)
                
                # Adicionar metadados específicos do chunk
                chunk_metadata = metadata.copy()
                chunk_metadata.update({
                    "text": texto,
                    "chunk_index": i,
                    "chunk_id": f"{metadata['article_id']}_chunk_{i}"
                })
                
                ponto = PointStruct(
                    id=str(uuid.uuid4()),
                    vector=vetor,
                    payload=chunk_metadata
                )
                points.append(ponto)
            
            # Inserir na coleção
            if points:
                self.qdrant_client.upsert(
                    collection_name=self.collection_name, 
                    points=points
                )
                logger.info(f"✅ Inseridos {len(points)} chunks do artigo {metadata['nome_professor']}")
            
        except Exception as e:
            logger.error(f"Erro ao processar PDF {pdf_path}: {e}")
    
    def get_articles_for_gallery(self, limit: int = 50) -> List[Dict]:
        """Retorna artigos para exibição na galeria"""
        try:
            # Usar scroll para obter artigos únicos (um por article_id)
            articles = {}
            
            response = self.qdrant_client.scroll(
                collection_name=self.collection_name,
                limit=limit * 3,  # Pegar mais que necessário para filtrar duplicatas
                with_payload=True,
                with_vectors=False
            )
            
            for point in response[0]:
                article_id = point.payload.get('article_id')
                if article_id and article_id not in articles:
                    articles[article_id] = {
                        'id': article_id,
                        'title': point.payload.get('titulo', 'Título não disponível'),
                        'author': point.payload.get('nome_professor', ''),
                        'year': point.payload.get('ano', ''),
                        'journal': point.payload.get('revista', ''),
                        'doi': point.payload.get('doi', ''),
                        'abstract': point.payload.get('abstract', ''),
                        'keywords': point.payload.get('keywords', []),
                        'source': point.payload.get('source', '')
                    }
                
                if len(articles) >= limit:
                    break
            
            return list(articles.values())
            
        except Exception as e:
            logger.error(f"Erro ao buscar artigos para galeria: {e}")
            return []
    
    def get_article_by_id(self, article_id: str) -> Optional[Dict]:
        """Retorna detalhes completos de um artigo"""
        try:
            response = self.qdrant_client.scroll(
                collection_name=self.collection_name,
                scroll_filter=models.Filter(
                    must=[
                        models.FieldCondition(
                            key="article_id",
                            match=models.MatchValue(value=article_id)
                        )
                    ]
                ),
                limit=1,
                with_payload=True,
                with_vectors=False
            )
            
            if response[0]:
                point = response[0][0]
                return {
                    'id': article_id,
                    'title': point.payload.get('titulo', ''),
                    'author': point.payload.get('nome_professor', ''),
                    'year': point.payload.get('ano', ''),
                    'journal': point.payload.get('revista', ''),
                    'doi': point.payload.get('doi', ''),
                    'abstract': point.payload.get('abstract', ''),
                    'keywords': point.payload.get('keywords', []),
                    'source': point.payload.get('source', ''),
                    'full_metadata': point.payload
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Erro ao buscar artigo {article_id}: {e}")
            return None
    
    def search_within_article(self, article_id: str, query: str, limit: int = 5) -> List[Dict]:
        """Busca semântica dentro de um artigo específico"""
        try:
            query_vector = self.embed_model.embed_query(query)
            
            results = self.qdrant_client.search(
                collection_name=self.collection_name,
                query_filter=models.Filter(
                    must=[
                        models.FieldCondition(
                            key="article_id",
                            match=models.MatchValue(value=article_id)
                        )
                    ]
                ),
                query_vector=query_vector,
                limit=limit,
                with_payload=True
            )
            
            contexts = []
            for result in results:
                contexts.append({
                    'text': result.payload.get('text', ''),
                    'chunk_index': result.payload.get('chunk_index', 0),
                    'score': result.score,
                    'title': result.payload.get('titulo', ''),
                    'author': result.payload.get('nome_professor', '')
                })
            
            return contexts
            
        except Exception as e:
            logger.error(f"Erro ao buscar dentro do artigo {article_id}: {e}")
            return []
