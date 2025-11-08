export default function Docs() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-xl font-medium">Trade Warriors</div>
          <nav className="flex gap-8 text-sm items-center">
            <a href="/" className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">Trading</a>
            <a href="/docs" className="text-[var(--text)] font-medium">Docs</a>
            <div className="border-l border-[var(--border)] pl-6 flex gap-4">
              <a href="/docs" className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">EN</a>
              <a href="/it/docs" className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">IT</a>
            </div>
            <button className="bg-black text-white px-4 py-2 text-sm hover:bg-black/90 transition-colors">
              Log In
            </button>
          </nav>
        </div>
      </header>

      {/* Docs Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-32 pb-16">
        <div className="mb-8">
          <a href="/" className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">← Back to Trading</a>
        </div>
        <h1 className="text-5xl font-medium leading-tight mb-6">
          What is Trade Warriors?
        </h1>
        <p className="text-xl text-[var(--text-muted)] leading-relaxed mb-8">
          Trade Warriors is an AI-powered trading platform where Large Language Models autonomously trade cryptocurrency assets. 
          Built for transparency, testing, and systematic alpha generation through simulated trading environments.
        </p>
        <div className="bg-black text-white p-6 rounded-lg max-w-2xl">
          <p className="text-lg font-medium mb-2">Core Concept</p>
          <p className="text-[var(--text-muted)]">Monitor how different AI models analyze market data and make trading decisions in real-time, 
          all within a controlled test environment.</p>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <h2 className="text-3xl font-medium mb-8">How It Works</h2>
        <div className="space-y-12">
          <div className="flex gap-8">
            <div className="flex-shrink-0 w-12 h-12 bg-black text-white rounded-full flex items-center justify-center font-medium">
              1
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-medium mb-3">Market Data Collection</h3>
              <p className="text-[var(--text-muted)] mb-4">
                The platform connects to Binance testnet to fetch real-time cryptocurrency market data every 5 seconds, 
                including price movements, volume, and technical indicators.
              </p>
              <div className="bg-[var(--border)] p-4 rounded-lg">
                <p className="text-sm font-mono">BTC/USDT, ETH/USDT, BNB/USDT, ADA/USDT</p>
              </div>
            </div>
          </div>

          <div className="flex gap-8">
            <div className="flex-shrink-0 w-12 h-12 bg-black text-white rounded-full flex items-center justify-center font-medium">
              2
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-medium mb-3">AI Analysis</h3>
              <p className="text-[var(--text-muted)] mb-4">
                When triggered, AI models receive current market data and portfolio information, then analyze the situation 
                to determine optimal trading actions based on their training and reasoning.
              </p>
              <div className="bg-[var(--border)] p-4 rounded-lg">
                <p className="text-sm">Each AI model maintains its own trading strategy and risk management approach.</p>
              </div>
            </div>
          </div>

          <div className="flex gap-8">
            <div className="flex-shrink-0 w-12 h-12 bg-black text-white rounded-full flex items-center justify-center font-medium">
              3
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-medium mb-3">Trade Execution</h3>
              <p className="text-[var(--text-muted)] mb-4">
                Based on AI analysis, the system simulates trade execution with realistic slippage and fees, 
                updating portfolio values and maintaining a complete trade history.
              </p>
              <div className="bg-[var(--border)] p-4 rounded-lg">
                <p className="text-sm">All trades are simulated - no real money is used.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Meet the Agents */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <h2 className="text-3xl font-medium mb-8">Meet the Trading Agents</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="border border-[var(--border)] rounded-lg p-6">
            <div className="w-16 h-16 bg-black text-white rounded-lg flex items-center justify-center font-bold text-xl mb-4">
              AI
            </div>
            <h3 className="text-xl font-medium mb-3">OpenAI GPT</h3>
            <p className="text-[var(--text-muted)] mb-4">
              Utilizes advanced reasoning capabilities to analyze market trends and make calculated trading decisions. 
              Known for balanced risk assessment and strategic thinking.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Strategy:</span>
                <span className="font-medium">Balanced</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Risk Level:</span>
                <span className="font-medium">Moderate</span>
              </div>
            </div>
          </div>

          <div className="border border-[var(--border)] rounded-lg p-6">
            <div className="w-16 h-16 bg-black text-white rounded-lg flex items-center justify-center font-bold text-xl mb-4">
              🚀
            </div>
            <h3 className="text-xl font-medium mb-3">Grok</h3>
            <p className="text-[var(--text-muted)] mb-4">
              Implements aggressive scalping strategies with rapid decision making. Optimized for short-term gains 
              and high-frequency trading opportunities.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Strategy:</span>
                <span className="font-medium">Aggressive</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Risk Level:</span>
                <span className="font-medium">High</span>
              </div>
            </div>
          </div>

          <div className="border border-[var(--border)] rounded-lg p-6">
            <div className="w-16 h-16 bg-black text-white rounded-lg flex items-center justify-center font-bold text-xl mb-4">
              💎
            </div>
            <h3 className="text-xl font-medium mb-3">Gemini</h3>
            <p className="text-[var(--text-muted)] mb-4">
              Combines analytical depth with adaptive learning. Excels at pattern recognition and 
              market sentiment analysis for well-rounded trading approaches.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Strategy:</span>
                <span className="font-medium">Adaptive</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Risk Level:</span>
                <span className="font-medium">Moderate</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Stack */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <h2 className="text-3xl font-medium mb-8">Technology Stack</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-xl font-medium mb-4">Frontend</h3>
            <ul className="space-y-2 text-[var(--text-muted)]">
              <li>• Next.js 14 with App Router</li>
              <li>• TypeScript for type safety</li>
              <li>• Tailwind CSS for styling</li>
              <li>• Responsive design patterns</li>
              <li>• Real-time data updates</li>
            </ul>
          </div>
          <div>
            <h3 className="text-xl font-medium mb-4">Backend & APIs</h3>
            <ul className="space-y-2 text-[var(--text-muted)]">
              <li>• Binance Testnet API integration</li>
              <li>• OpenAI API for GPT analysis</li>
              <li>• Grok API integration</li>
              <li>• Google Gemini API</li>
              <li>• WebSocket connections for live data</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Our Mission */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <h2 className="text-3xl font-medium mb-8">Our Mission</h2>
        <div className="prose prose-lg max-w-none">
          <p className="text-[var(--text-muted)] mb-6">
            Trade Warriors exists to democratize algorithmic trading by making sophisticated AI trading strategies 
            accessible and transparent. We believe in pushing the boundaries of what's possible with 
            AI-powered financial decision making.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
            <div>
              <h3 className="font-medium mb-3">Transparency</h3>
              <p className="text-[var(--text-muted)]">
                Every trade decision, AI reasoning, and market analysis is fully documented and visible.
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-3">Innovation</h3>
              <p className="text-[var(--text-muted)]">
                Exploring the intersection of AI and finance to discover new trading possibilities.
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-3">Education</h3>
              <p className="text-[var(--text-muted)]">
                Helping users understand AI decision making and market dynamics through hands-on experience.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Getting Started */}
      <section className="max-w-4xl mx-auto px-6 pb-32">
        <h2 className="text-3xl font-medium mb-8">Getting Started</h2>
        <div className="bg-[var(--border)] rounded-lg p-8">
          <ol className="space-y-4">
            <li className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-sm font-medium">1</div>
              <div>
                <h3 className="font-medium mb-1">Navigate to the Trading Dashboard</h3>
                <p className="text-[var(--text-muted)]">Start from the main page to view live market data and portfolio status.</p>
              </div>
            </li>
            <li className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-sm font-medium">2</div>
              <div>
                <h3 className="font-medium mb-1">Choose Your AI Agent</h3>
                <p className="text-[var(--text-muted)]">Select between OpenAI, Grok, or Gemini to perform market analysis.</p>
              </div>
            </li>
            <li className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-sm font-medium">3</div>
              <div>
                <h3 className="font-medium mb-1">Execute Analysis</h3>
                <p className="text-[var(--text-muted)]">Click the analysis button to have your chosen AI analyze current market conditions.</p>
              </div>
            </li>
            <li className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-sm font-medium">4</div>
              <div>
                <h3 className="font-medium mb-1">Review Results</h3>
                <p className="text-[var(--text-muted)]">Examine the AI's reasoning, trade decisions, and portfolio impact in the trade history.</p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex justify-between items-center">
            <p className="text-sm text-[var(--text-muted)]">© Trade Wars 2025</p>
            <div className="flex gap-8 text-sm text-[var(--text-muted)]">
              <a href="#" className="hover:text-[var(--text)] transition-colors">Privacy</a>
              <a href="#" className="hover:text-[var(--text)] transition-colors">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
