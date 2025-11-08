"""
Simple agent wrapper using standard OpenAI SDK with structured outputs

This replaces the need for the OpenAI Agents SDK (which isn't publicly available yet)
by using the standard OpenAI API with Pydantic models for structured outputs.
"""
import os
from typing import Optional, Type, TypeVar
from pydantic import BaseModel
from openai import AsyncOpenAI

T = TypeVar('T', bound=BaseModel)


class SimpleAgent:
    """Simple agent that calls OpenAI with structured outputs"""

    def __init__(
        self,
        name: str,
        model: str,
        instructions: str,
        output_type: Type[T],
        temperature: float = 0.0
    ):
        self.name = name
        self.model = model
        self.instructions = instructions
        self.output_type = output_type
        self.temperature = temperature

        # Initialize OpenAI client
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY not found in environment")
        self.client = AsyncOpenAI(api_key=api_key)

    async def run(self, user_prompt: str) -> T:
        """
        Run the agent with a user prompt

        Args:
            user_prompt: The user's input

        Returns:
            Structured output based on output_type
        """
        messages = [
            {"role": "system", "content": self.instructions},
            {"role": "user", "content": user_prompt}
        ]

        # Use OpenAI's beta parse feature for structured outputs
        completion = await self.client.beta.chat.completions.parse(
            model=self.model,
            messages=messages,
            response_format=self.output_type,
            temperature=self.temperature
        )

        return completion.choices[0].message.parsed


# For compatibility with the agent code
Agent = SimpleAgent


async def run_agent(agent: SimpleAgent, prompt: str):
    """Helper to run an agent"""
    return await agent.run(prompt)
