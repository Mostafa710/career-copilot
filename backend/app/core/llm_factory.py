"""LLM and Embedding model factory supporting Groq (Primary) and Lightning.ai (Fallback)."""

import os
import logging
from typing import Optional, List
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from backend.app.config import settings

logger = logging.getLogger(__name__)

# Configure LangSmith environment variables if enabled
if settings.LANGCHAIN_TRACING_V2 and settings.LANGCHAIN_API_KEY:
    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    os.environ["LANGCHAIN_ENDPOINT"] = settings.LANGCHAIN_ENDPOINT
    os.environ["LANGCHAIN_API_KEY"] = settings.LANGCHAIN_API_KEY
    os.environ["LANGCHAIN_PROJECT"] = settings.LANGCHAIN_PROJECT


def get_groq_llm(
    temperature: float = 0.2,
    model: Optional[str] = None,
) -> Optional[ChatGroq]:
    """Initialize Groq Chat LLM."""
    api_key = settings.GROQ_API_KEY
    if not api_key or api_key.startswith("your_"):
        return None
    
    return ChatGroq(
        api_key=api_key,
        model_name=model or settings.GROQ_MODEL,
        temperature=temperature,
        max_retries=2,
    )


def get_lightning_llm(
    temperature: float = 0.2,
    model: Optional[str] = None,
) -> Optional[ChatOpenAI]:
    """Initialize Lightning.ai Chat LLM (OpenAI compatible endpoint)."""
    api_key = settings.LIGHTNING_API_KEY
    if not api_key or api_key.startswith("your_"):
        return None
    
    return ChatOpenAI(
        api_key=api_key,
        base_url=settings.LIGHTNING_BASE_URL,
        model=model or settings.LIGHTNING_MODEL,
        temperature=temperature,
        max_retries=2,
    )


def get_llm(
    temperature: float = 0.2,
    groq_model: Optional[str] = None,
    lightning_model: Optional[str] = None,
) -> BaseChatModel:
    """
    Get primary LLM (Groq) with automatic fallback to Lightning.ai.
    If neither API key is configured in dev mode, returns a mock-capable wrapper.
    """
    primary = get_groq_llm(temperature=temperature, model=groq_model)
    fallback = get_lightning_llm(temperature=temperature, model=lightning_model)

    if primary and fallback:
        # LangChain native fallback chain
        logger.info("Using Groq LLM with Lightning.ai fallback.")
        return primary.with_fallbacks([fallback])
    elif primary:
        logger.info("Using Groq LLM (no fallback configured).")
        return primary
    elif fallback:
        logger.info("Using Lightning.ai LLM as primary.")
        return fallback
    else:
        logger.warning("No LLM API keys provided (GROQ_API_KEY or LIGHTNING_API_KEY). Using ChatGroq stub.")
        # Return ChatGroq stub for initialization; calls will prompt for key
        return ChatGroq(
            api_key="gsk_stub_for_init",
            model_name=groq_model or settings.GROQ_MODEL,
            temperature=temperature,
        )


def get_embeddings():
    """
    Returns text embedding model based on EMBEDDING_PROVIDER config.
    Defaults to local CPU-optimized HuggingFace sentence-transformers/all-MiniLM-L6-v2 (100% free).
    """
    if settings.EMBEDDING_PROVIDER == "huggingface":
        try:
            from langchain_huggingface import HuggingFaceEmbeddings
            return HuggingFaceEmbeddings(
                model_name=settings.HUGGINGFACE_EMBEDDING_MODEL,
                model_kwargs={"device": "cpu"},
                encode_kwargs={"normalize_embeddings": True},
            )
        except Exception as e:
            logger.warning(f"HuggingFace embedding initialization fallback: {e}")
            return None
    elif settings.EMBEDDING_PROVIDER == "openai" and settings.OPENAI_API_KEY:
        from langchain_openai import OpenAIEmbeddings
        return OpenAIEmbeddings(
            api_key=settings.OPENAI_API_KEY,
            model=settings.OPENAI_EMBEDDING_MODEL,
        )
    return None


def compute_text_embedding(text: str) -> Optional[List[float]]:
    """Generate vector embedding for text using OpenAI embeddings (or None if unconfigured)."""
    try:
        embeddings = get_embeddings()
        if embeddings:
            return embeddings.embed_query(text)
    except Exception as e:
        logger.warning(f"Vector embedding generation skipped: {e}")
    return None
