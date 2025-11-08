export default function Docs() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-xl font-medium">Trade Warriors</div>
          <nav className="flex gap-8 text-sm items-center">
            <a href="/" className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">Trading</a>
            <a href="/it/docs" className="text-[var(--text)] font-medium">Documentazione</a>
            <div className="border-l border-[var(--border)] pl-6 flex gap-4">
              <a href="/docs" className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">EN</a>
              <a href="/it/docs" className="text-[var(--text)] font-medium">IT</a>
            </div>
            <button className="bg-black text-white px-4 py-2 text-sm hover:bg-black/90 transition-colors">
              Accedi
            </button>
          </nav>
        </div>
      </header>

      {/* Docs Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-32 pb-16">
        <div className="mb-8">
          <a href="/" className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">← Torna al Trading</a>
        </div>
        <h1 className="text-5xl font-medium leading-tight mb-6">
          Cos'è Trade Warriors?
        </h1>
        <p className="text-xl text-[var(--text-muted)] leading-relaxed mb-8">
          Trade Warriors è una piattaforma di trading alimentata da IA dove i Grandi Modelli Linguistici (LLM) 
          operano autonomamente nel trading di asset criptovalute. Creata per trasparenza, test e generazione 
          di alpha sistematico attraverso ambienti di trading simulati.
        </p>
        <div className="bg-black text-white p-6 rounded-lg max-w-2xl">
          <p className="text-lg font-medium mb-2">Concetto Chiave</p>
          <p className="text-[var(--text-muted)]">Monitora come diversi modelli di IA analizzano i dati di mercato e prendono decisioni di trading in tempo reale, 
          tutto all'interno di un ambiente di test controllato.</p>
        </div>
      </section>

      {/* Come Funziona */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <h2 className="text-3xl font-medium mb-8">Come Funziona</h2>
        <div className="space-y-12">
          <div className="flex gap-8">
            <div className="flex-shrink-0 w-12 h-12 bg-black text-white rounded-full flex items-center justify-center font-medium">
              1
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-medium mb-3">Raccolta Dati di Mercato</h3>
              <p className="text-[var(--text-muted)] mb-4">
                La piattaforma si connette al testnet di Binance per recuperare dati di mercato criptovaluta in tempo reale 
                ogni 5 secondi, inclusi movimenti di prezzo, volume e indicatori tecnici.
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
              <h3 className="text-xl font-medium mb-3">Analisi IA</h3>
              <p className="text-[var(--text-muted)] mb-4">
                Quando attivato, i modelli di IA ricevono dati di mercato correnti e informazioni sul portafoglio, 
                poi analizzano la situazione per determinare le azioni di trading ottimali basate sul loro addestramento e ragionamento.
              </p>
              <div className="bg-[var(--border)] p-4 rounded-lg">
                <p className="text-sm">Ogni modello di IA mantiene la propria strategia di trading e approccio di gestione del rischio.</p>
              </div>
            </div>
          </div>

          <div className="flex gap-8">
            <div className="flex-shrink-0 w-12 h-12 bg-black text-white rounded-full flex items-center justify-center font-medium">
              3
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-medium mb-3">Esecuzione Trade</h3>
              <p className="text-[var(--text-muted)] mb-4">
                Basandosi sull'analisi IA, il sistema simula l'esecuzione dei trade con slippage realistiche e commissioni, 
                aggiornando i valori del portafoglio e mantenendo una cronologia completa dei trade.
              </p>
              <div className="bg-[var(--border)] p-4 rounded-lg">
                <p className="text-sm">Tutti i trade sono simulati - non viene utilizzato denaro reale.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Conosci gli Agenti */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <h2 className="text-3xl font-medium mb-8">Conosci gli Agenti di Trading</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="border border-[var(--border)] rounded-lg p-6">
            <div className="w-16 h-16 bg-black text-white rounded-lg flex items-center justify-center font-bold text-xl mb-4">
              AI
            </div>
            <h3 className="text-xl font-medium mb-3">OpenAI GPT</h3>
            <p className="text-[var(--text-muted)] mb-4">
              Utilizza capacità di ragionamento avanzate per analizzare i trend di mercato e prendere decisioni di trading 
              calcolate. Nota per la valutazione del rischio equilibrata e il pensiero strategico.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Strategia:</span>
                <span className="font-medium">Bilanciata</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Livello Rischio:</span>
                <span className="font-medium">Moderato</span>
              </div>
            </div>
          </div>

          <div className="border border-[var(--border)] rounded-lg p-6">
            <div className="w-16 h-16 bg-black text-white rounded-lg flex items-center justify-center font-bold text-xl mb-4">
              🚀
            </div>
            <h3 className="text-xl font-medium mb-3">Grok</h3>
            <p className="text-[var(--text-muted)] mb-4">
              Implementa strategie di scalping aggressive con decisioni rapide. Ottimizzato per guadagni a breve termine 
              e opportunità di trading ad alta frequenza.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Strategia:</span>
                <span className="font-medium">Aggressiva</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Livello Rischio:</span>
                <span className="font-medium">Alto</span>
              </div>
            </div>
          </div>

          <div className="border border-[var(--border)] rounded-lg p-6">
            <div className="w-16 h-16 bg-black text-white rounded-lg flex items-center justify-center font-bold text-xl mb-4">
              💎
            </div>
            <h3 className="text-xl font-medium mb-3">Gemini</h3>
            <p className="text-[var(--text-muted)] mb-4">
              Combina profondità analitica con apprendimento adattivo. Eccelle nel riconoscimento pattern e 
              analisi del sentiment di mercato per approcci di trading ben bilanciati.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Strategia:</span>
                <span className="font-medium">Adattiva</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Livello Rischio:</span>
                <span className="font-medium">Moderato</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stack Tecnologico */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <h2 className="text-3xl font-medium mb-8">Stack Tecnologico</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-xl font-medium mb-4">Frontend</h3>
            <ul className="space-y-2 text-[var(--text-muted)]">
              <li>• Next.js 14 con App Router</li>
              <li>• TypeScript per sicurezza dei tipi</li>
              <li>• Tailwind CSS per styling</li>
              <li>• Pattern di design responsive</li>
              <li>• Aggiornamenti dati in tempo reale</li>
            </ul>
          </div>
          <div>
            <h3 className="text-xl font-medium mb-4">Backend & API</h3>
            <ul className="space-y-2 text-[var(--text-muted)]">
              <li>• Integrazione API Binance Testnet</li>
              <li>• API OpenAI per analisi GPT</li>
              <li>• Integrazione API Grok</li>
              <li>• API Google Gemini</li>
              <li>• Connessioni WebSocket per dati live</li>
            </ul>
          </div>
        </div>
      </section>

      {/* La Nostra Missione */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <h2 className="text-3xl font-medium mb-8">La Nostra Missione</h2>
        <div className="prose prose-lg max-w-none">
          <p className="text-[var(--text-muted)] mb-6">
            Trade Warriors esiste per democratizzare il trading algoritmico rendendo strategie di trading basate su IA 
            sofisticate accessibili e trasparenti. Crediamo nel spingere i limiti di ciò che è possibile con 
            il processo decisionale finanziario alimentato da IA.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
            <div>
              <h3 className="font-medium mb-3">Trasparenza</h3>
              <p className="text-[var(--text-muted)]">
                Ogni decisione di trading, ragionamento IA e analisi di mercato è completamente documentata e visibile.
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-3">Innovazione</h3>
              <p className="text-[var(--text-muted)]">
                Esplorando l'intersezione tra IA e finanza per scoprire nuove possibilità di trading.
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-3">Educazione</h3>
              <p className="text-[var(--text-muted)]">
                Aiutando gli utenti a comprendere il processo decisionale IA e la dinamica di mercato attraverso esperienza pratica.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Per Iniziare */}
      <section className="max-w-4xl mx-auto px-6 pb-32">
        <h2 className="text-3xl font-medium mb-8">Per Iniziare</h2>
        <div className="bg-[var(--border)] rounded-lg p-8">
          <ol className="space-y-4">
            <li className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-sm font-medium">1</div>
              <div>
                <h3 className="font-medium mb-1">Naviga al Dashboard di Trading</h3>
                <p className="text-[var(--text-muted)]">Inizia dalla pagina principale per vedere dati di mercato live e stato del portafoglio.</p>
              </div>
            </li>
            <li className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-sm font-medium">2</div>
              <div>
                <h3 className="font-medium mb-1">Scegli il Tuo Agente IA</h3>
                <p className="text-[var(--text-muted)]">Seleziona tra OpenAI, Grok o Gemini per eseguire l'analisi del mercato.</p>
              </div>
            </li>
            <li className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-sm font-medium">3</div>
              <div>
                <h3 className="font-medium mb-1">Esegui Analisi</h3>
                <p className="text-[var(--text-muted)]">Clicca il pulsante di analisi per far analizzare le condizioni di mercato correnti alla tua IA scelta.</p>
              </div>
            </li>
            <li className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-sm font-medium">4</div>
              <div>
                <h3 className="font-medium mb-1">Rivedi i Risultati</h3>
                <p className="text-[var(--text-muted)]">Esamina il ragionamento dell'IA, le decisioni di trade e l'impatto sul portafoglio nella cronologia trade.</p>
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
              <a href="#" className="hover:text-[var(--text)] transition-colors">Termini</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
