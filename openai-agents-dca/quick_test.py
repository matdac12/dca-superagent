"""
Quick test to verify OpenAI agents SDK is working
"""
import asyncio
from agents import Agent, Runner
from pydantic import BaseModel


class SimpleResponse(BaseModel):
    message: str
    confidence: int


async def main():
    print("Testing OpenAI agents SDK...")

    # Create a simple test agent
    test_agent = Agent(
        name="TestAgent",
        model="gpt-4o-mini",
        instructions="You are a helpful assistant. Respond with a friendly message.",
        output_type=SimpleResponse
    )

    # Run the agent
    result = await Runner.run(test_agent, "Say hello!")

    print(f"\n✓ Agent response: {result.final_output.message}")
    print(f"✓ Confidence: {result.final_output.confidence}")
    print("\n✅ OpenAI agents SDK is working correctly!\n")


if __name__ == "__main__":
    asyncio.run(main())
