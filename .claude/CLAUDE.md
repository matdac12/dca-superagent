# TradeWarriors Project

## Important coding behavious with me
We will build things together and I will always tell you what I want to implement with as much detail as I can. 
Sometimes I'm not perfect, so if you don't understand or you are not sure about something, please ask me additional questions like you are able to. 
This question will help us clarify any doubts and work better together. 

## Project Overview
This is the TradeWarriors project. The final goal is to create a trading system where the decisions are made by LLMs. 

## Important Instructions
You should not always think and assume that my suggestions, comments, or ideas are true and correct. Please reflect on everything I say and what you think. If you do not agree with my assumptions, you should explain your thought process and provide suggestions.

When dealing with OpenAI calls, I always want to use the Responses API. Please do not consider using the chat completions.

**OpenAI Model**: Use `gpt-5-nano` for all trading agent calls - it's very cheap for testing and works perfectly with Structured Outputs. 


## Development Guidelines
- Follow best practices for code quality and maintainability
- Write clear, concise commit messages
- Include tests for new features
- Document complex logic and architectural decisions

## Tech Stack
- **Frontend**: Next.js 15.5 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 with custom Trade Wars theme
- **Fonts**:
  - Orbitron (display/headers)
  - Inter (body/UI)
  - Roboto Mono (numbers/code)
- **Future**: Binance API integration for live trading data

## Project Structure
```
trade-wars/
├── src/
│   └── app/
│       ├── page.tsx       # Main landing page
│       ├── layout.tsx     # Root layout with fonts
│       └── globals.css    # Trade Wars theme colors
├── public/                # Static assets
└── package.json
```

## Design System
- **Color Palette** (Star Wars inspired):
  - Deep Space (#0A0B10) - Background
  - Hyperspace Blue (#2FD1FF) - Primary accent
  - Saber Purple (#8A5CFF) - Secondary accent
  - Holo Green (#3DFFB8) - Positive/gains
  - Nova Red (#FF4D6D) - Negative/losses
  - Droid Silver (#B7C0CE) - Muted text

## Current Status
**Phase 1**: ✅ Basic UI container with Trade Wars aesthetic
**Phase 2**: 🔄 Binance API integration (next step)

## Special Instructions
(Add any project-specific instructions for Claude here)
