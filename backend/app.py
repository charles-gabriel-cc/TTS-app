from langchain_ollama import OllamaEmbeddings, OllamaLLM
from qdrant_client import QdrantClient
import gradio as gr
from langchain_core.prompts import ChatPromptTemplate
from config import (
    QDRANT_URL,
    QDRANT_API_KEY,
    COLLECTION_NAME
)

embeddings = OllamaEmbeddings(model="all-minilm:l6-v2")
qdrant_client = QdrantClient(
    url=QDRANT_URL, 
    api_key=QDRANT_API_KEY
)

def search_qdrant(query: str) -> str:
    # Initialize components
    
    # Get query embedding and search
    query_vector = embeddings.embed_query(query)
    results = qdrant_client.search(
        collection_name=COLLECTION_NAME,
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

def process_query(message: str) -> str:
    # Get context from Qdrant
    context = search_qdrant(message)
    
    # Send to LLM
    llm = OllamaLLM(model="phi4:latest")
    
    system_prompt = """Você é um assistente simpático e informativo que responde dúvidas sobre os professores do CCEN da UFPE.

Evite frases genéricas como "com base nas informações fornecidas". Em vez disso, seja direto e útil. Por exemplo:
- Se não souber a resposta, diga isso de forma natural e oriente o usuário.
- Se souber parcialmente, explique o que é conhecido e o que pode ser consultado depois.

Fale como se estivesse ajudando um visitante num evento ou feira. Seja claro, acolhedor e evite termos técnicos ou linguagem robótica.

\n\nAqui estão os dados disponíveis:

{context}

Pergunta: {message}

Responda à pergunta acima de forma clara e útil, com linguagem acessível ao público geral."""

    full_prompt = system_prompt
    
    # Get and return response
    return llm.invoke(full_prompt)

# Create Gradio interface
iface = gr.Interface(
    fn=process_query,
    inputs=gr.Textbox(
        label="Sua pergunta:",
        placeholder="Digite sua pergunta aqui..."
    ),
    outputs=gr.Textbox(label="Resposta"),
    title="CCEN-UFPE",
    #description="Faça perguntas sobre os professores do Centro de Ciências Exatas e da Natureza da UFPE",
    examples=["Me fale sobre os professores do departamento de matemática", 
              "Quais são os professores do departamento de física que trabalham com física quântica?"
              ]
)

if __name__ == "__main__":
    iface.launch(share=True)
