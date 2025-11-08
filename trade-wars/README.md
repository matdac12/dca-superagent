# Trade Wars - AI Trading Council

A collaborative AI trading system where three AI models (OpenAI GPT-5-nano, Grok, and Gemini) debate and reach consensus on cryptocurrency trading decisions.

## Overview

The AI Trading Council uses a structured debate process where three leading AI models:
- **Analyze** market data, technical indicators, and news
- **Propose** individual trading recommendations
- **Debate** their proposals through critique and revision
- **Vote** to reach consensus (unanimous or majority)
- **Execute** the winning recommendation

This collaborative approach combines the strengths of multiple AI models to make more informed trading decisions.

## Features

### Core Functionality
- **Council Debate System**: Structured multi-model deliberation
- **Real-time Market Data**: Binance Testnet API integration
- **Comprehensive Analytics**: Performance metrics, model contributions, consensus patterns
- **Trade History**: Full audit trail with debate metadata
- **Portfolio Tracking**: Real-time portfolio value and P&L
- **Open Orders Management**: Track and manage limit orders

### Dashboard Components
- **Performance Metrics**: Win rate, ROI, total P&L
- **Model Contribution Analysis**: Track which models' recommendations are selected
- **Consensus Patterns**: View unanimous vs majority decisions
- **Risk Metrics**: Sharpe ratio, max drawdown, volatility
- **Asset Allocation**: Visual breakdown of BTC/USDT holdings
- **Debate Viewer**: Expandable view of each model's reasoning

## Tech Stack

### Frontend
- **Framework**: Next.js 15.5 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Charts**: Recharts
- **Fonts**: Orbitron (headers), Inter (body), Roboto Mono (numbers)

### Backend
- **API Routes**: Next.js API routes
- **AI Models**:
  - OpenAI GPT-5-nano (via OpenAI API)
  - Grok-4-Fast (via xAI API)
  - Gemini 2.5 Flash (via OpenRouter)
- **Exchange**: Binance Testnet API
- **Data Storage**: JSON file-based (trade history, agent plans)

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Binance Testnet account
- API keys for OpenAI, xAI, and OpenRouter/Google AI

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd trade-wars
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
Create a `.env.local` file with:
```env
# Binance Testnet
BINANCE_BASE_URL=https://testnet.binance.vision
BINANCE_API_KEY_COUNCIL=<your-testnet-api-key>
BINANCE_SECRET_KEY_COUNCIL=<your-testnet-secret-key>

# AI Model APIs
OPENAI_API_KEY=<your-openai-key>
XAI_API_KEY=<your-xai-key>
OPENROUTER_API_KEY=<your-openrouter-key>

# Application
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Usage

### Executing a Council Decision

1. Click **"Execute Council Decision"** on the homepage
2. Wait 20-30 seconds for the debate to complete
3. View the consensus decision and selected model
4. Explore the debate details by expanding the latest decision

### Viewing Statistics

The dashboard displays real-time statistics including:
- **Decision Quality**: Win rate, average P&L, ROI
- **Model Contributions**: Which models are selected most often
- **Consensus Patterns**: Unanimous vs majority breakdown
- **Risk Metrics**: Sharpe ratio, max drawdown, volatility
- **Execution Metrics**: Order types, average execution time

### Trade History

- View all past council decisions with full debate metadata
- Expand any row to see individual model proposals and reasoning
- Filter and sort trades by various criteria

## Architecture

### Council Debate Flow

```
1. Proposal Phase
   ├─ OpenAI generates trading recommendation
   ├─ Grok generates trading recommendation
   └─ Gemini generates trading recommendation

2. Critique Phase
   ├─ Each model reviews others' proposals
   └─ Identifies strengths and weaknesses

3. Revision Phase
   ├─ Models refine their proposals
   └─ Address critiques from peers

4. Voting Phase
   ├─ Models vote on best proposal
   ├─ Tally votes (check for unanimous/majority)
   └─ Select winning recommendation

5. Execution Phase
   ├─ Execute winning model's recommendation
   ├─ Log trade with full debate metadata
   └─ Update portfolio and statistics
```

### Data Flow

```
Market Data → Council Debate → Decision → Order Execution → Trade Logging → Statistics Update → UI Refresh
```

### API Endpoints

#### Core Trading
- `POST /api/trading-agent-council` - Execute council debate and trade
- `GET /api/trade-history?agent=council` - Get council trade history
- `GET /api/portfolio-history?agent=council` - Get council portfolio values

#### Analytics
- `GET /api/council/stats` - Comprehensive council statistics
- `GET /api/market` - Current market data and balances
- `GET /api/open-orders` - Active limit orders

## Project Structure

```
trade-wars/
├── src/
│   ├── app/
│   │   ├── api/                 # API routes
│   │   │   ├── trading-agent-council/  # Council endpoint
│   │   │   ├── council/stats/   # Statistics endpoint
│   │   │   └── ...
│   │   ├── components/          # React components
│   │   │   ├── CouncilPerformanceDashboard.tsx
│   │   │   ├── ComprehensiveStatsPanel.tsx
│   │   │   ├── DebateViewer.tsx
│   │   │   ├── ModelContributionChart.tsx
│   │   │   └── ...
│   │   └── page.tsx             # Main dashboard
│   ├── lib/
│   │   ├── council/             # Council logic
│   │   │   ├── councilDebate.ts
│   │   │   ├── statistics.ts
│   │   │   └── types.ts
│   │   ├── storage/             # Data persistence
│   │   └── utils/               # Helper functions
│   └── types/                   # TypeScript types
├── data/                        # JSON data files
│   ├── trade-history.json
│   └── agent-plans.json
└── tasks/                       # Project tasks and PRDs
```

## Configuration

### Agent Config (`src/config/agents.ts`)
Each AI model is configured with:
- Display name and color
- API credentials
- Model ID

### Risk Parameters
- Max trade size: 50% of portfolio
- Max concurrent orders: 3
- Supported assets: BTC/USDT

## Development

### Running Tests
```bash
npm test
```

### Building for Production
```bash
npm run build
npm start
```

### Linting
```bash
npm run lint
```

## Deployment

### Environment Variables
Ensure all production API keys are set in your deployment environment.

### Vercel Deployment
1. Push to GitHub
2. Connect repository to Vercel
3. Configure environment variables
4. Deploy

## Troubleshooting

### Common Issues

**Council endpoint timeout:**
- Check AI API rate limits
- Verify API keys are valid
- Increase timeout in config

**Trade not appearing:**
- Verify trade was logged (check console)
- Refresh the page
- Check trade-history.json file

**Statistics showing 0:**
- Execute at least one council decision
- Verify council metadata is being stored
- Check `/api/council/stats` endpoint

## Contributing

This project follows the PRD-based development workflow documented in `tasks/tasks-0005-prd-collaborative-trading-council-system.md`.

## License

[Add your license here]

## Acknowledgments

- Built with Next.js, TypeScript, and Tailwind CSS
- AI models: OpenAI, xAI (Grok), Google (Gemini)
- Trading API: Binance Testnet
- Charts: Recharts

---

**Note**: This is a testnet trading system for research and development. Do not use with real funds without proper risk management and testing.
