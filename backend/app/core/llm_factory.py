"""LLM and Embedding model factory supporting multi-key Groq with round-robin load balancing."""

import os
import logging
import threading
from typing import Optional, List, Any, Dict, Type, Union, Sequence
from pydantic import BaseModel, Field
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import BaseMessage
from langchain_core.outputs import ChatResult
from langchain_core.runnables import Runnable, RunnableConfig
from langchain_groq import ChatGroq
from backend.app.config import settings

logger = logging.getLogger(__name__)

# Configure LangSmith environment variables if enabled
if settings.LANGCHAIN_TRACING_V2 and settings.LANGCHAIN_API_KEY:
    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    os.environ["LANGCHAIN_ENDPOINT"] = settings.LANGCHAIN_ENDPOINT
    os.environ["LANGCHAIN_API_KEY"] = settings.LANGCHAIN_API_KEY
    os.environ["LANGCHAIN_PROJECT"] = settings.LANGCHAIN_PROJECT


class GlobalGroqRotator:
    """Thread-safe round-robin counter across Groq API keys."""
    _lock = threading.Lock()
    _index = 0

    @classmethod
    def get_and_increment(cls, num_keys: int) -> int:
        if num_keys <= 0:
            return 0
        with cls._lock:
            idx = cls._index % num_keys
            cls._index = (cls._index + 1) % 1000000
            return idx


class RotatingRunnable(Runnable):
    """Wraps multiple runnables and rotates starting instance per invocation with automatic failover."""
    def __init__(self, runners: List[Runnable]):
        self.runners = runners

    def invoke(self, input: Any, config: Optional[RunnableConfig] = None, **kwargs: Any) -> Any:
        if not self.runners:
            raise ValueError("No runners configured in RotatingRunnable.")
        idx = GlobalGroqRotator.get_and_increment(len(self.runners))
        primary = self.runners[idx]
        fallbacks = [self.runners[(idx + i) % len(self.runners)] for i in range(1, len(self.runners))]
        if fallbacks:
            return primary.with_fallbacks(fallbacks).invoke(input, config=config, **kwargs)
        return primary.invoke(input, config=config, **kwargs)

    async def ainvoke(self, input: Any, config: Optional[RunnableConfig] = None, **kwargs: Any) -> Any:
        if not self.runners:
            raise ValueError("No runners configured in RotatingRunnable.")
        idx = GlobalGroqRotator.get_and_increment(len(self.runners))
        primary = self.runners[idx]
        fallbacks = [self.runners[(idx + i) % len(self.runners)] for i in range(1, len(self.runners))]
        if fallbacks:
            return await primary.with_fallbacks(fallbacks).ainvoke(input, config=config, **kwargs)
        return await primary.ainvoke(input, config=config, **kwargs)


class RotatingBoundChat(BaseChatModel):
    """Rotates bound chat models per invocation with automatic failover."""
    models: List[Any] = Field(default_factory=list)

    @property
    def _llm_type(self) -> str:
        return "rotating_bound_chat_groq"

    def _generate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[Any] = None,
        **kwargs: Any,
    ) -> ChatResult:
        if not self.models:
            raise ValueError("No models configured.")
        idx = GlobalGroqRotator.get_and_increment(len(self.models))
        primary = self.models[idx]
        fallbacks = [self.models[(idx + i) % len(self.models)] for i in range(1, len(self.models))]
        if fallbacks:
            return primary.with_fallbacks(fallbacks)._generate(messages, stop=stop, run_manager=run_manager, **kwargs)
        return primary._generate(messages, stop=stop, run_manager=run_manager, **kwargs)

    async def _agenerate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[Any] = None,
        **kwargs: Any,
    ) -> ChatResult:
        if not self.models:
            raise ValueError("No models configured.")
        idx = GlobalGroqRotator.get_and_increment(len(self.models))
        primary = self.models[idx]
        fallbacks = [self.models[(idx + i) % len(self.models)] for i in range(1, len(self.models))]
        if fallbacks:
            return await primary.with_fallbacks(fallbacks)._agenerate(messages, stop=stop, run_manager=run_manager, **kwargs)
        return await primary._agenerate(messages, stop=stop, run_manager=run_manager, **kwargs)


class RotatingChatGroq(BaseChatModel):
    """
    ChatGroq proxy that rotates through configured GROQ_API_KEY_1..4 on every LLM call,
    with automatic failover if any single key encounters transient rate limits or outages.
    """
    models: List[ChatGroq] = Field(default_factory=list)
    model_name: str = "openai/gpt-oss-120b"
    temperature: float = 0.2

    @property
    def _llm_type(self) -> str:
        return "rotating_chat_groq"

    def _get_active_model_with_fallbacks(self):
        if not self.models:
            return ChatGroq(
                api_key="gsk_stub_for_init",
                model_name=self.model_name,
                temperature=self.temperature,
            )
        idx = GlobalGroqRotator.get_and_increment(len(self.models))
        primary = self.models[idx]
        fallbacks = [self.models[(idx + i) % len(self.models)] for i in range(1, len(self.models))]
        if fallbacks:
            return primary.with_fallbacks(fallbacks)
        return primary

    def _generate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[Any] = None,
        **kwargs: Any,
    ) -> ChatResult:
        model = self._get_active_model_with_fallbacks()
        if hasattr(model, "_generate"):
            return model._generate(messages, stop=stop, run_manager=run_manager, **kwargs)
        return model.invoke(messages, **kwargs)

    async def _agenerate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[Any] = None,
        **kwargs: Any,
    ) -> ChatResult:
        model = self._get_active_model_with_fallbacks()
        if hasattr(model, "_agenerate"):
            return await model._agenerate(messages, stop=stop, run_manager=run_manager, **kwargs)
        return await model.ainvoke(messages, **kwargs)

    def bind_tools(self, tools: Sequence[Union[Dict[str, Any], Type[BaseModel], Any]], **kwargs: Any) -> BaseChatModel:
        bound_models = [m.bind_tools(tools, **kwargs) for m in self.models]
        return RotatingBoundChat(models=bound_models)

    def with_structured_output(self, schema: Union[Dict[str, Any], Type[BaseModel]], **kwargs: Any) -> Runnable:
        structured_runners = [m.with_structured_output(schema, **kwargs) for m in self.models]
        return RotatingRunnable(runners=structured_runners)


def get_llm(
    temperature: float = 0.2,
    groq_model: Optional[str] = None,
    **kwargs: Any,
) -> BaseChatModel:
    """
    Returns a RotatingChatGroq instance that rotates across all configured GROQ_API_KEY_1..4 keys
    on every single LLM call in round-robin fashion with automatic failover.
    """
    keys = settings.get_groq_api_keys()
    target_model = groq_model or settings.GROQ_MODEL

    if keys:
        logger.info(f"Initialized Groq LLM pool with {len(keys)} rotated API keys (model: {target_model}).")
        models = [
            ChatGroq(
                api_key=k,
                model_name=target_model,
                temperature=temperature,
                max_retries=2,
            )
            for k in keys
        ]
        return RotatingChatGroq(
            models=models,
            model_name=target_model,
            temperature=temperature,
        )
    else:
        logger.warning("No GROQ_API_KEY configured. Using ChatGroq stub.")
        return ChatGroq(
            api_key="gsk_stub_for_init",
            model_name=target_model,
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
