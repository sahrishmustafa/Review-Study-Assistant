"""
LLM client — unified wrapper for OpenAI and Anthropic API calls.
Handles retries, logging, and provider switching.
"""
import json
from app.config import settings


async def call_llm(
    prompt: str,
    system_prompt: str = "You are a research assistant specialized in academic paper analysis.",
    model: str | None = None,
    temperature: float = 0.1,
    max_tokens: int = 2000,
) -> str:
    """
    Call the configured LLM provider.

    Args:
        prompt: User prompt
        system_prompt: System instruction
        model: Override model name
        temperature: Sampling temperature
        max_tokens: Max response tokens

    Returns:
        LLM response text
    """
    provider = settings.LLM_PROVIDER
    model = model or settings.LLM_MODEL

    if provider == "openai":
        return await _call_openai(prompt, system_prompt, model, temperature, max_tokens)
    elif provider == "anthropic":
        return await _call_anthropic(prompt, system_prompt, model, temperature, max_tokens)
    elif provider == "groq":
        return await _call_groq(prompt, system_prompt, model, temperature, max_tokens)
    else:
        raise ValueError(f"Unsupported LLM provider: {provider}")


async def _call_openai(
    prompt: str, system_prompt: str, model: str,
    temperature: float, max_tokens: int,
) -> str:
    """Call OpenAI API."""
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    response = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return response.choices[0].message.content


async def _call_anthropic(
    prompt: str, system_prompt: str, model: str,
    temperature: float, max_tokens: int,
) -> str:
    """Call Anthropic API."""
    from anthropic import AsyncAnthropic

    client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    response = await client.messages.create(
        model=model or "claude-3-5-sonnet-20241022",
        max_tokens=max_tokens,
        system=system_prompt,
        messages=[{"role": "user", "content": prompt}],
        temperature=temperature,
    )
    return response.content[0].text


async def _call_groq(
    prompt: str, system_prompt: str, model: str,
    temperature: float, max_tokens: int,
) -> str:
    """Call Groq API."""
    from groq import AsyncGroq

    client = AsyncGroq(api_key=settings.GROQ_API_KEY)

    response = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return response.choices[0].message.content


async def generate_embeddings(texts: list[str]) -> list[list[float]]:
    """
    Generate embeddings locally using sentence-transformers (no API key required).
    """
    import asyncio
    from sentence_transformers import SentenceTransformer

    loop = asyncio.get_event_loop()
    model = await loop.run_in_executor(
        None, SentenceTransformer, settings.EMBEDDING_MODEL
    )
    embeddings = await loop.run_in_executor(None, model.encode, texts)
    return embeddings.tolist()


def call_llm_sync(
    prompt: str,
    system_prompt: str = "You are a research assistant specialized in academic paper analysis.",
    model: str | None = None,
    temperature: float = 0.1,
    max_tokens: int = 2000,
) -> str:
    """
    Synchronous wrapper for LLM calls (for use in non-async contexts).
    """
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(
                    asyncio.run,
                    call_llm(prompt, system_prompt, model, temperature, max_tokens),
                )
                return future.result()
        return loop.run_until_complete(
            call_llm(prompt, system_prompt, model, temperature, max_tokens)
        )
    except RuntimeError:
        return asyncio.run(
            call_llm(prompt, system_prompt, model, temperature, max_tokens)
        )


def extract_json_from_response(response: str) -> dict | list:
    """Extract JSON from LLM response, handling code blocks."""
    # Try direct parse
    try:
        return json.loads(response)
    except json.JSONDecodeError:
        pass

    # Try extracting from code block
    if "```" in response:
        parts = response.split("```")
        for part in parts[1::2]:
            # Remove language identifier
            lines = part.strip().split("\n")
            if lines[0].strip().lower() in ("json", "python", ""):
                content = "\n".join(lines[1:])
            else:
                content = part
            try:
                return json.loads(content.strip())
            except json.JSONDecodeError:
                continue

    raise ValueError(f"Could not extract JSON from response: {response[:200]}")
