import openai
from langchain_ollama import OllamaEmbeddings, OllamaLLM, ChatOllama
from utils.logger import setup_logger
from qdrant_client import QdrantClient, models
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from services.embeddings import create_collection
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_community.chat_message_histories import ChatMessageHistory

from langchain_core.messages import HumanMessage
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.tools import tool, StructuredTool
from langgraph.prebuilt import create_react_agent
from pydantic.v1 import BaseModel, Field as PydanticV1Field

# Configurar logger
logger = setup_logger(__name__)

class SearchQdrant(BaseModel):
    query: str = PydanticV1Field(description="Consulta em linguagem natural para busca semântica sobre professores, departamentos ou áreas de pesquisa do CCEN da UFPE. Use termos e conceitos relacionados ao que busca.")

class SearchTeacherInformation(BaseModel):
    name: str = PydanticV1Field(description="Nome completo ou parcial do professor do CCEN da UFPE sobre quem se deseja obter informações.")
    query: str = PydanticV1Field(description="Consulta semântica específica sobre o professor, como formação, área de pesquisa, projetos ou experiência profissional. Use conceitos e termos relacionados ao que busca.")

class getTeacherNames(BaseModel):
    query: str = PydanticV1Field(description="Solicitação para obter a lista de nomes dos professores do CCEN da UFPE (busca direta, não semântica).")

class SearchArticle(BaseModel):
    query: str = PydanticV1Field(default="", description="Consulta semântica sobre artigos científicos, publicações ou pesquisas acadêmicas dos professores do CCEN. Use termos técnicos e conceitos relacionados à área de interesse. Deixe vazio para buscar qualquer artigo do professor especificado.")
    professor_name: str = PydanticV1Field(default="", description="Nome do professor para filtrar artigos apenas deste docente. Deixe vazio para buscar artigos de todos os professores do CCEN.")

class ChatService:
    def __init__(self, use_local_model=False, model_name=None, api_key=None):
        """
        Inicializa o serviço de chat.
        
        Args:
            use_local_model (bool): Se True, usa modelo local (Ollama), caso contrário usa OpenAI
            model_name (str): Nome do modelo a ser usado
            api_key (str): Chave da API OpenAI (necessária apenas se use_local_model=False)
        """
        self.use_local_model = use_local_model
        self.model_name = model_name
        self.api_key = api_key
        self.memory = MemorySaver()

        
        if use_local_model:
            import os
            ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
            self.llm = ChatOllama(model=model_name, temperature=0.5, base_url=ollama_base_url)
            logger.info(f"Inicializando serviço de chat local com modelo: {model_name}")
        else:
            if not api_key:
                raise ValueError("API key é necessária para usar o modelo OpenAI")
            logger.info(f"Inicializando serviço de chat OpenAI com modelo: {model_name}")
            openai.api_key = api_key

                
        qdrant_tool = StructuredTool.from_function(
            func=self.search_qdrant, # Método da instância
            name="SearchQdrant", # Nome da ferramenta para o agente
            description="Busca informações gerais sobre professores do CCEN da UFPE usando similaridade semântica em base vetorial. Use esta ferramenta quando o usuário fizer perguntas amplas sobre professores, departamentos, áreas de pesquisa ou quiser uma visão geral sem focar em um professor específico. A busca encontra conteúdo semanticamente similar à consulta.", # Descrição detalhada
            args_schema=SearchQdrant, # Schema de argumentos Pydantic
        )

        teacher_information_tool = StructuredTool.from_function(
            func=self.search_teacher_information, # Método da instância
            name="SearchTeacherInformation", # Nome da ferramenta para o agente
            description="Busca informações específicas sobre um professor do CCEN da UFPE usando similaridade semântica em base vetorial filtrada por nome. Use esta ferramenta quando o usuário mencionar o nome de um professor específico e quiser saber detalhes sobre ele, como formação, pesquisas, projetos ou experiência. A busca combina filtro por nome com similaridade semântica do conteúdo.", # Descrição detalhada
            args_schema=SearchTeacherInformation, # Schema de argumentos Pydantic
        )

        teacher_names_tool = StructuredTool.from_function(
            func=self.get_teacher_names, # Método da instância
            name="GetTeacherNames", # Nome da ferramenta para o agente
            description="Obtém a lista completa dos nomes dos professores do CCEN da UFPE diretamente da base de dados (não usa busca semântica). Use esta ferramenta quando o usuário quiser saber quais professores existem no centro ou precisar de uma lista de nomes para referência.", # Descrição detalhada
            args_schema=getTeacherNames, # Schema de argumentos Pydantic
        )

        article_tool = StructuredTool.from_function(
            func=self.search_article, # Método da instância
            name="SearchArticle", # Nome da ferramenta para o agente
            description="Busca e apresenta artigos científicos publicados pelos professores do CCEN da UFPE. Use esta ferramenta EXCLUSIVAMENTE quando o usuário perguntar sobre: publicações científicas, artigos acadêmicos, pesquisas publicadas, produção científica, papers ou trabalhos publicados. A ferramenta retorna artigos com informações contextualizadas que devem ser apresentadas de forma clara e didática ao usuário em português brasileiro.", # Descrição detalhada
            args_schema=SearchArticle, # Schema de argumentos Pydantic
        )

        self.tools = [qdrant_tool, 
                      teacher_information_tool, 
                      article_tool,
                      #teacher_names_tool
                      ]
        
        self.prompt = f"""
        Você é um assistente simpático e informativo que responde dúvidas sobre os professores do CCEN da UFPE, áreas de pesquisa e atuação e informações sobre seu curriculo e trabalhos academicos, 


                Evite frases genéricas como "com base nas informações fornecidas". Em vez disso, seja direto e útil. Por exemplo:
                - Se não souber a resposta, diga isso de forma natural e oriente o usuário.
                - Se souber parcialmente, explique o que é conhecido e o que pode ser consultado depois.
                - Você não deve fazer suposições sobre nenhuma informação que não tenha certeza.
                - Se o material de consulta estiver em inglês, traduza para português brasileiro.
                - Considere que o usuário tenho pouco conhecimento sobre o conteudo abordado então resumir o conteudo e fornecer informações relevantes.

                Fale como se estivesse ajudando um visitante num evento ou feira. Seja claro, acolhedor e evite termos técnicos ou linguagem robótica
                Responde sempre em PORTUGUÊS BRASILEIRO.
                                                 """
        
        self.agent_executor = create_react_agent(self.llm, self.tools, checkpointer=self.memory, prompt=self.prompt)
        self.agent_executor.invoke({"messages": [HumanMessage(content="Aquecendo agente")]}, {'configurable': {'thread_id': 0}})
        print("Agente aquecido")    
        

    def set_collection(self, use_local_collection=False, collection_name=None, embed_model=None, qdrant_url=None, qdrant_api_key=None, path="./", docs=None):
        self.use_local_collection = use_local_collection
        self.collection_name = collection_name
        import os
        ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        self.embeddings = OllamaEmbeddings(model=embed_model, base_url=ollama_base_url)
        self.path = path
        self.docs = docs

        if use_local_collection:
            self.qdrant_client = QdrantClient(url=qdrant_url or "http://localhost:6333")
        else:
            self.qdrant_url = qdrant_url
            self.qdrant_api_key = qdrant_api_key
            
            self.qdrant_client = QdrantClient(
                url=qdrant_url, 
                api_key=qdrant_api_key
            )
        create_collection(embed_model, self.qdrant_client, self.collection_name, self.docs)

    def get_teacher_names(self, query: str) -> list[str]:
        """
        Get the names of the teachers in the CCEN of UFPE.
        """
        results = self.qdrant_client.facet(
            collection_name=self.collection_name,
            key="nome_professor",
            limit=50000
        )
        unique_teacher_names = [hit.value for hit in results.hits]

        return  "Nomes completos dos professores do ccen:\n" + "\n".join(unique_teacher_names)
    
    def search_teacher_information(self, name: str, query: str) -> str:
        """
        Search for information about a specific teacher in the CCEN of UFPE.
        """
        query_vector = self.embeddings.embed_query(query)

        teacher_filter = models.Filter(
            must=[
                models.FieldCondition(
                    key="nome_professor",  # O nome do campo no seu payload do Qdrant
                    #match=models.MatchValue(value=name)  # O valor que você quer que seja igual
                    match=models.MatchText(
                        text=name  # A string de busca para texto completo
                        )
                )
            ]
        )
        results = self.qdrant_client.search(
            collection_name=self.collection_name,
            query_filter=teacher_filter,
            query_vector=query_vector,
            limit=10,
        )

        contexts = []
        for result in results:
            text = result.payload.get("text", "")
            professor = result.payload.get("nome_professor", "")
            dept = result.payload.get("departamento", "")
            contexts.append(f"Professor: {professor}\nDepartamento: {dept}\nInformação: {text}\n")
        
        return "\n".join(contexts) if contexts else "Nenhum resultado encontrado."
        
    def search_qdrant(self, query: str) -> str:
        """
        Search for information about the teachers in the Qdrant collection.
        """
        # 'self' is implicit
        # Initialize components
        
        # Get query embedding and search
        query_vector = self.embeddings.embed_query(query)
        results = self.qdrant_client.search(
            collection_name=self.collection_name,
            query_vector=query_vector,
            limit=5
        )

        # Format results
        contexts = []
        for result in results:
            text = result.payload.get("text", "")
            professor = result.payload.get("nome_professor", "")
            dept = result.payload.get("departamento", "")
            contexts.append(f"Professor: {professor}\nDepartamento: {dept}\nInformação: {text}\n")
        
        return "\n".join(contexts) if contexts else "Nenhum resultado encontrado."

    def search_article(self, query: str, professor_name: str = "") -> str:
        """
        Search for scientific articles in the Qdrant collection.
        Filters by document type 'artigo' and optionally by professor name.
        """
        try:
            query_vector = self.embeddings.embed_query(query)
            
            # Criar filtros
            filters = [
                models.FieldCondition(
                    key="tipo_de_documento",
                    match=models.MatchValue(value="artigo")
                )
            ]
            
            # Adicionar filtro de professor se especificado
            if professor_name and professor_name.strip():
                filters.append(
                    models.FieldCondition(
                        key="nome_professor",
                        match=models.MatchText(text=professor_name.strip())
                    )
                )
            
            article_filter = models.Filter(must=filters)
            
            results = self.qdrant_client.search(
                collection_name=self.collection_name,
                query_filter=article_filter,
                query_vector=query_vector,
                limit=10,
            )

            contexts = []
            for result in results:
                text = result.payload.get("text", "")
                professor = result.payload.get("nome_professor", "")
                dept = result.payload.get("departamento", "")
                title = result.payload.get("titulo", "")
                year = result.payload.get("ano", "")
                
                context = f"Professor: {professor}\nDepartamento: {dept}"
                if title:
                    context += f"\nTítulo: {title}"
                if year:
                    context += f"\nAno: {year}"
                context += f"\nConteúdo: {text}\n"
                contexts.append(context)
                
            
            if not contexts:
                if professor_name:
                    return f"Nenhum artigo encontrado para o professor '{professor_name}' com a consulta '{query}'."
                else:
                    return f"Nenhum artigo encontrado para a consulta '{query}'."
            
            # Prompt específico para apresentação de artigos científicos
            article_prompt = """
<System>INSTRUÇÃO ESPECÍFICA PARA ARTIGOS CIENTÍFICOS:

Você está apresentando artigos científicos dos professores do CCEN da UFPE. Siga estas diretrizes:

1. IDIOMA: Responda SEMPRE em português brasileiro
2. APRESENTAÇÃO DE CADA ARTIGO:
   - Professor(a) e departamento
   - Título da publicação (se disponível)
   - Explicação clara do conteúdo em linguagem simples e acessível
3. TRADUÇÃO: Se o conteúdo original estiver em inglês, traduza tudo para português
4. SIMPLIFICAÇÃO: Explique termos técnicos de forma que qualquer pessoa entenda
5. TOM: Seja acolhedor e entusiástico, como um guia apresentando descobertas interessantes
6. EVITE: Frases genéricas como "com base nas informações" ou "de acordo com os dados"

OBJETIVO: Tornar a produção científica do CCEN acessível e interessante para o público geral.</System>
"""
            contexts.append(article_prompt)
            return "\n".join(contexts)
            
        except Exception as e:
            logger.error(f"Erro ao buscar artigos: {str(e)}")
            return "Erro ao buscar artigos na base de dados."

    async def get_response(self, message, session_id):
        """
        Obtém uma resposta do modelo para a mensagem fornecida.
        
        Args:
            message (str): Mensagem do usuário
            
        Returns:
            str: Resposta do modelo
        """
        try:
            if self.use_local_model:
                response = self.agent_executor.invoke({"messages": [HumanMessage(content=message)]}, {'configurable': {'thread_id': session_id}})
                print(response['messages'][-1].content)
                return response['messages'][-1].content
            else:
                response = await openai.ChatCompletion.acreate(
                    model=self.model_name,
                    messages=[
                        {"role": "user", "content": message}
                    ]
                )
                return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Erro ao obter resposta do modelo: {str(e)}")
            raise
