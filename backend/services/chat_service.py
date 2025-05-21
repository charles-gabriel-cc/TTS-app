import openai
from langchain_ollama import OllamaEmbeddings, OllamaLLM
from utils.logger import setup_logger
from qdrant_client import QdrantClient
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from services.embeddings import create_collection
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_community.chat_message_histories import ChatMessageHistory

# Configurar logger
logger = setup_logger(__name__)

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
        self.store = {}

        
        if use_local_model:
            self.llm = OllamaLLM(model=model_name, temperature=0.5)
            logger.info(f"Inicializando serviço de chat local com modelo: {model_name}")
        else:
            if not api_key:
                raise ValueError("API key é necessária para usar o modelo OpenAI")
            logger.info(f"Inicializando serviço de chat OpenAI com modelo: {model_name}")
            openai.api_key = api_key

    def set_collection(self, use_local_collection=False, collection_name=None, embed_model=None, qdrant_url=None, qdrant_api_key=None, path="./", docs=None):
        self.use_local_collection = use_local_collection
        self.collection_name = collection_name
        self.embeddings = OllamaEmbeddings(model=embed_model)
        self.path = path
        self.docs = docs

        if use_local_collection:
            self.qdrant_client = QdrantClient(url="http://localhost:6333")
        else:
            self.qdrant_url = qdrant_url
            self.qdrant_api_key = qdrant_api_key
            
            self.qdrant_client = QdrantClient(
                url=qdrant_url, 
                api_key=qdrant_api_key
            )
        create_collection(embed_model, self.qdrant_client, self.collection_name, self.docs)
        
    def search_qdrant(self, query: str) -> str:
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

    async def get_response(self, message, session_id):
        """
        Obtém uma resposta do modelo para a mensagem fornecida.
        
        Args:
            message (str): Mensagem do usuário
            
        Returns:
            str: Resposta do modelo
        """
        context = self.search_qdrant(message)
        print(context)

        system_prompt = f"""Você é um assistente simpático e informativo que responde dúvidas sobre os professores do CCEN da UFPE.

        Evite frases genéricas como "com base nas informações fornecidas". Em vez disso, seja direto e útil. Por exemplo:
        - Se não souber a resposta, diga isso de forma natural e oriente o usuário.
        - Se souber parcialmente, explique o que é conhecido e o que pode ser consultado depois.

        Fale como se estivesse ajudando um visitante num evento ou feira. Seja claro, acolhedor e evite termos técnicos ou linguagem robótica.

        \n\nDados disponíveis para contexto:

        {context}

        \n\nHistórico de conversa:

        {{history}}

        \n\nPergunta: {{message}}

        Responda à pergunta acima de forma clara e útil, com linguagem acessível ao público geral."""

        prompt = ChatPromptTemplate.from_messages([
            ('system', system_prompt),
            MessagesPlaceholder(variable_name="history"),
            ('user', '{message}')
            ])

        chain = prompt | self.llm
        
        def get_session_history(session_id: str) -> BaseChatMessageHistory:
            if session_id not in self.store:
                self.store[session_id] = ChatMessageHistory()
            return self.store[session_id]

        chain = RunnableWithMessageHistory(
            chain,
            get_session_history,
            input_messages_key="message",
            history_messages_key="history"
        )

        try:
            if self.use_local_model:
                response = chain.invoke({"message": message}, {'configurable': {'session_id': session_id}})
                return response
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
