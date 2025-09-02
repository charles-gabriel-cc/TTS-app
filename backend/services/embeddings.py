from llama_index.readers.file import PDFReader
from llama_index.core.node_parser import SemanticSplitterNodeParser
from llama_index.embeddings.ollama import OllamaEmbedding
from qdrant_client import QdrantClient, models
from qdrant_client.models import Distance, VectorParams, PointStruct
import os
import uuid
import re
import hashlib
import pandas as pd
from typing import List, Dict

def create_curriculos_collection(embed_model, qdrant_client, collection_name, diretorio):
    """
    Cria e popula a coleção de currículos dos professores.
    """
    print(f"🚀 Criando coleção de currículos: {collection_name}")
    
    ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    embed_model = OllamaEmbedding(model_name=embed_model, base_url=ollama_base_url)
    parser = SemanticSplitterNodeParser.from_defaults(embed_model=embed_model)

    # Cria a coleção se não existir
    if collection_name not in [c.name for c in qdrant_client.get_collections().collections]:
        qdrant_client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(size=384, distance=Distance.COSINE)
        )
        print(f"✅ Coleção '{collection_name}' criada.")
    else:
        print(f"⚠️ Coleção '{collection_name}' já existe.")

    # Criação de índices para currículos
    campos_indexados = ["id_lattes", "nome_professor", "departamento", "tipo_de_documento"]

    for campo in campos_indexados:
        try:
            qdrant_client.create_payload_index(
                collection_name=collection_name,
                field_name=campo,
                field_schema=models.TextIndexParams(
                    type="text",
                    tokenizer=models.TokenizerType.MULTILINGUAL,
                    min_token_len=2,
                    max_token_len=15,
                    lowercase=True,
                ),
            )
            print(f"🔧 Índice criado para '{campo}'.")
        except Exception as e:
            if "already exists" in str(e).lower():
                print(f"⚠️ Índice para '{campo}' já existe.")
            else:
                print(f"❌ Erro ao criar índice para '{campo}': {e}")

    # Verificar se diretório existe
    if not os.path.exists(diretorio):
        print(f"⚠️ Diretório '{diretorio}' não encontrado. Pulando processamento de currículos.")
        return

    processed_count = 0
    error_count = 0

    # Processar PDFs dos currículos
    for root, dirs, files in os.walk(diretorio):
        for file in files:
            if file.lower().endswith(".pdf"):
                try:
                    caminho_pdf = os.path.join(root, file)
                    id_lattes = os.path.splitext(file)[0]
                    
                    # Extrai o nome do departamento
                    caminho_relativo = os.path.relpath(root, diretorio)
                    partes = caminho_relativo.split(os.sep)
                    departamento = partes[0] if partes else "desconhecido"

                    # Verifica se já foi processado
                    response = qdrant_client.scroll(
                        collection_name=collection_name,
                        scroll_filter={"must": [{"key": "metadata.id_lattes", "match": {"value": id_lattes}}]},
                        limit=1
                    )
                    if response[0]:
                        print(f"⏭️ Currículo já processado: {id_lattes}")
                        continue

                    print(f"\n📄 Processando currículo: {file}")
                    print(f"🔎 Departamento: {departamento} | ID Lattes: {id_lattes}")

                    # Processar PDF
                    documents = PDFReader().load_data(caminho_pdf)
                    nodes = parser.get_nodes_from_documents(documents)
                    nome_professor = documents[0].text.strip().split("\n")[1]

                    # Criar pontos para inserção
                    points = []
                    for node in nodes:
                        texto = node.text
                        vetor = embed_model.get_text_embedding(texto)
                        ponto = PointStruct(
                            id=str(uuid.uuid4()),
                            vector=vetor,
                            payload={
                                # O conteúdo principal fica no nível superior do payload
                                "content": texto,  

                                # Todos os outros dados são agrupados em um objeto "metadata"
                                "metadata": {      
                                    "id_lattes": id_lattes,
                                    "nome_professor": nome_professor,
                                    "departamento": departamento,
                                    "source": caminho_pdf,
                                    "tipo_de_documento": "curriculo"
                                }
                            }
                        )
                        points.append(ponto)

                    if points:
                        qdrant_client.upsert(collection_name=collection_name, points=points)
                        print(f"✅ Inseridos {len(points)} chunks do currículo")
                        processed_count += 1
                        
                except Exception as e:
                    print(f"❌ Erro ao processar currículo '{file}': {e}")
                    error_count += 1

    print(f"\n📊 Currículos processados: {processed_count} | Erros: {error_count}")


def load_professor_metadata() -> Dict[str, Dict]:
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
        print(f"⚠️ Erro ao carregar metadados dos professores: {e}")
        return {}


def extract_article_metadata(pdf_path: str, nome_professor: str, professor_metadata: Dict) -> Dict:
    """Extrai metadados do artigo do PDF"""
    try:
        documents = PDFReader().load_data(pdf_path)
        full_text = " ".join([doc.text for doc in documents])
        
        # Gerar ID único para o artigo
        content = f"{pdf_path}_{nome_professor}"
        article_id = hashlib.md5(content.encode()).hexdigest()[:12]
        
        # Extrair título (geralmente nas primeiras linhas)
        lines = full_text.split('\n')
        titulo = "Título não identificado"
        for i, line in enumerate(lines[:10]):
            line = line.strip()
            if len(line) > 10 and len(line) < 200 and not line.lower().startswith(('abstract', 'resumo')):
                if i + 1 < len(lines) and (not lines[i + 1].strip() or len(lines[i + 1]) < len(line) * 0.5):
                    titulo = line
                    break
        
        # Extrair abstract
        abstract = ""
        abstract_patterns = [
            r'(?i)abstract\s*[:\-]?\s*(.*?)(?=\n\s*\n|\n\s*1\.|\n\s*introduction|\n\s*keywords)',
            r'(?i)resumo\s*[:\-]?\s*(.*?)(?=\n\s*\n|\n\s*1\.|\n\s*introdução|\n\s*palavras)',
        ]
        for pattern in abstract_patterns:
            match = re.search(pattern, full_text, re.DOTALL)
            if match:
                abstract = match.group(1).strip()[:500]
                if len(abstract) > 50:
                    break
        
        # Extrair ano
        ano = ""
        lines = full_text.split('\n')[:20]
        for line in lines:
            years = re.findall(r'\b(20[0-2][0-9])\b', line)
            if years:
                ano = years[0]
                break
        
        # Extrair keywords
        keywords = []
        keywords_patterns = [
            r'(?i)keywords?\s*[:\-]?\s*(.*?)(?=\n\s*\n|\n\s*1\.|\n\s*introduction)',
            r'(?i)palavras?[\s\-]chave\s*[:\-]?\s*(.*?)(?=\n\s*\n|\n\s*1\.)',
        ]
        for pattern in keywords_patterns:
            match = re.search(pattern, full_text, re.DOTALL)
            if match:
                keywords_text = match.group(1).strip()
                keywords = re.split(r'[,;.\n]', keywords_text)
                keywords = [kw.strip() for kw in keywords if kw.strip() and len(kw.strip()) > 2][:10]
                break
        
        # Obter metadados do CSV
        professor_meta = professor_metadata.get(nome_professor, {})
        
        return {
            "article_id": article_id,
            "nome_professor": nome_professor,
            "nome_completo_professor": nome_professor,
            "professor_nome_curto": professor_meta.get('professor_nome', ''),
            "doi": professor_meta.get('doi_link', ''),
            "titulo": titulo,
            "abstract": abstract,
            "ano": ano,
            "keywords": keywords,
            "source": pdf_path,
            "tipo_de_documento": "artigo"
        }
        
    except Exception as e:
        print(f"❌ Erro ao extrair metadados de {pdf_path}: {e}")
        return {
            "article_id": hashlib.md5(f"{pdf_path}_{nome_professor}".encode()).hexdigest()[:12],
            "nome_professor": nome_professor,
            "source": pdf_path,
            "tipo_de_documento": "artigo"
        }


def create_artigos_collection(embed_model, qdrant_client, collection_name, diretorio):
    """
    Cria e popula a coleção de artigos científicos.
    """
    print(f"🚀 Criando coleção de artigos: {collection_name}")
    
    ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    embed_model = OllamaEmbedding(model_name=embed_model, base_url=ollama_base_url)
    parser = SemanticSplitterNodeParser.from_defaults(embed_model=embed_model)

    # Cria a coleção se não existir
    if collection_name not in [c.name for c in qdrant_client.get_collections().collections]:
        qdrant_client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(size=384, distance=Distance.COSINE)
        )
        print(f"✅ Coleção '{collection_name}' criada.")
    else:
        print(f"⚠️ Coleção '{collection_name}' já existe.")

    # Criação de índices para artigos
    campos_indexados = [
        "article_id", "nome_professor", "nome_completo_professor",
        "doi", "titulo", "ano", "keywords", "tipo_de_documento"
    ]

    for campo in campos_indexados:
        try:
            qdrant_client.create_payload_index(
                collection_name=collection_name,
                field_name=campo,
                field_schema=models.TextIndexParams(
                    type="text",
                    tokenizer=models.TokenizerType.MULTILINGUAL,
                    min_token_len=2,
                    max_token_len=20,
                    lowercase=True,
                ),
            )
            print(f"🔧 Índice criado para '{campo}'.")
        except Exception as e:
            if "already exists" in str(e).lower():
                print(f"⚠️ Índice para '{campo}' já existe.")
            else:
                print(f"❌ Erro ao criar índice para '{campo}': {e}")

    # Verificar se diretório existe
    if not os.path.exists(diretorio):
        print(f"⚠️ Diretório '{diretorio}' não encontrado. Pulando processamento de artigos.")
        return

    # Carregar metadados dos professores
    professor_metadata = load_professor_metadata()
    print(f"📋 Carregados metadados de {len(professor_metadata)} professores")

    processed_count = 0
    error_count = 0

    # Processar PDFs dos artigos
    for root, dirs, files in os.walk(diretorio):
        for file in files:
            if file.lower().endswith(".pdf"):
                try:
                    caminho_pdf = os.path.join(root, file)
                    nome_professor = os.path.splitext(file)[0]

                    # Verifica se já foi processado
                    response = qdrant_client.scroll(
                        collection_name=collection_name,
                        scroll_filter=models.Filter(
                            must=[
                                models.FieldCondition(
                                    key="metadata.nome_professor",
                                    match=models.MatchValue(value=nome_professor)
                                ),
                                models.FieldCondition(
                                    key="metadata.source",
                                    match=models.MatchValue(value=caminho_pdf)
                                )
                            ]
                        ),
                        limit=1
                    )
                    if response[0]:
                        print(f"⏭️ Artigo já processado: {nome_professor}")
                        continue

                    print(f"\n📄 Processando artigo: {file}")
                    
                    # Extrair metadados
                    metadata = extract_article_metadata(caminho_pdf, nome_professor, professor_metadata)
                    print(f"📝 Título: {metadata['titulo'][:60]}...")
                    if metadata['ano']:
                        print(f"📅 Ano: {metadata['ano']}")

                    # Processar PDF
                    documents = PDFReader().load_data(caminho_pdf)
                    nodes = parser.get_nodes_from_documents(documents)

                    # Criar pontos para inserção
                    points = []
                    for i, node in enumerate(nodes):
                        texto = node.text
                        vetor = embed_model.get_text_embedding(texto)
                        
                        chunk_metadata = metadata.copy()
                        chunk_metadata.update({
                            "chunk_index": i,
                            "chunk_id": f"{metadata['article_id']}_chunk_{i}"
                        })
                        
                        ponto = PointStruct(
                            id=str(uuid.uuid4()),
                            vector=vetor,
                            payload={
                                # O conteúdo principal fica no nível superior do payload
                                "content": texto,
                                
                                # Todos os outros dados são agrupados em um objeto "metadata"
                                "metadata": chunk_metadata
                            }
                        )
                        points.append(ponto)

                    if points:
                        qdrant_client.upsert(collection_name=collection_name, points=points)
                        print(f"✅ Inseridos {len(points)} chunks do artigo")
                        processed_count += 1
                        
                except Exception as e:
                    print(f"❌ Erro ao processar artigo '{file}': {e}")
                    error_count += 1

    print(f"\n📊 Artigos processados: {processed_count} | Erros: {error_count}")


# Função compatível com o sistema atual (mantém compatibilidade)
def create_collection(embed_model, qdrant_client, collection_name, diretorio):
    """
    Função principal que cria ambas as coleções.
    Mantém compatibilidade com o sistema atual.
    """
    from config import ARTICLES_COLLECTION_NAME
    
    print("🚀 Iniciando criação das coleções...")
    
    # 1. Criar e popular coleção de currículos
    if collection_name:
        create_curriculos_collection(embed_model, qdrant_client, collection_name, diretorio)
    
    # 2. Criar e popular coleção de artigos
    try:
        create_artigos_collection(embed_model, qdrant_client, ARTICLES_COLLECTION_NAME, "articles")
    except Exception as e:
        print(f"⚠️ Erro ao processar artigos: {e}")
    
    print("\n🎉 Criação das coleções finalizada!")
