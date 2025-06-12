from llama_index.readers.file import PDFReader
from llama_index.core.node_parser import SemanticSplitterNodeParser
from llama_index.embeddings.ollama import OllamaEmbedding
from qdrant_client import QdrantClient, models
from qdrant_client.models import Distance, VectorParams, PointStruct
import os
import uuid

def create_collection(embed_model, qdrant_client, collection_name, diretorio):
    ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    embed_model = OllamaEmbedding(model_name=embed_model, base_url=ollama_base_url)
    parser = SemanticSplitterNodeParser.from_defaults(embed_model=embed_model)

    # 3. Cria a coleção se não existir
    if collection_name not in [c.name for c in qdrant_client.get_collections().collections]:
        qdrant_client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(size=384, distance=Distance.COSINE)
        )
        print(f"✅ Coleção '{collection_name}' criada.")
    else:
        print(f"⚠️ Coleção '{collection_name}' já existe.")

    from qdrant_client.models import PayloadSchemaType

    # ⚙️ Criação manual de índices em coleção já existente
    campos_indexados = ["id_lattes", "nome_professor", "departamento"]

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
                print(f"⚠️ Índice para '{campo}' já existe, ignorando.")
            else:
                print(f"❌ Erro ao criar índice para '{campo}': {e}")

    # 4. Percorre e processa PDFs
    for root, dirs, files in os.walk(diretorio):
        for file in files:
            if file.lower().endswith(".pdf"):
                try:
                    caminho_pdf = os.path.join(root, file)

                    # Extrai o id do lattes (sem extensão)
                    id_lattes = os.path.splitext(file)[0]

                    # Extrai o nome do departamento (pasta logo abaixo de 'ccen-docentes')
                    caminho_relativo = os.path.relpath(root, diretorio)
                    partes = caminho_relativo.split(os.sep)
                    departamento = partes[0] if partes else "desconhecido"

                    # ⚠️ Verifica se o id_lattes já está no Qdrant
                    response = qdrant_client.scroll(
                        collection_name=collection_name,
                        scroll_filter={"must": [{"key": "id_lattes", "match": {"value": id_lattes}}]},
                        limit=1
                    )
                    if response[0]:  # Já existe vetor com esse id_lattes
                        print(f"⏭️ Já processado: {id_lattes}, pulando...")
                        continue

                    print(f"\n📄 Processando: {caminho_pdf}")
                    print(f"🔎 Departamento: {departamento} | ID Lattes: {id_lattes}")

                    # Lê e divide em nós
                    documents = PDFReader().load_data(caminho_pdf)
                    nodes = parser.get_nodes_from_documents(documents)

                    # Extrai o nome do professor da primeira linha
                    nome_professor = documents[0].text.strip().split("\n")[1]

                    # Converte cada nó em vetor e insere
                    points = []
                    for node in nodes:
                        texto = node.text
                        vetor = embed_model.get_text_embedding(texto)
                        ponto = PointStruct(
                            id=str(uuid.uuid4()),
                            vector=vetor,
                            payload={
                                "id_lattes": id_lattes,
                                "nome_professor": nome_professor,
                                "departamento": departamento,
                                "source": caminho_pdf,
                                "text": texto
                            }
                        )
                        points.append(ponto)

                    if points:
                        qdrant_client.upsert(collection_name=collection_name, points=points)
                        print(f"✅ Inseridos {len(points)} vetores de '{file}'")
                except Exception as e:
                    print(f"❌ Erro ao processar '{file}': {e}")

    print("\n🚀 Finalizado!")
