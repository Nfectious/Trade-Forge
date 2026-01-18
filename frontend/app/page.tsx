export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="max-w-4xl text-center">
        <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-crypto-dark-primary to-crypto-dark-accent bg-clip-text text-transparent">
          Crypto Simulation Platform
        </h1>
        <p className="text-xl text-crypto-dark-text/80 mb-12">
          Master crypto trading with zero risk. Learn, compete, and profit through realistic simulation.
        </p>
        
        <div className="flex gap-4 justify-center">
          <a
            href="/register"
            className="px-8 py-4 bg-crypto-dark-primary text-crypto-dark-bg font-semibold rounded-lg hover:bg-crypto-dark-primary/90 transition-colors"
          >
            Get Started Free
          </a>
          <a
            href="/login"
            className="px-8 py-4 border-2 border-crypto-dark-primary text-crypto-dark-primary font-semibold rounded-lg hover:bg-crypto-dark-primary/10 transition-colors"
          >
            Login
          </a>
        </div>
        
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 bg-crypto-dark-surface rounded-lg">
            <h3 className="text-2xl font-bold mb-3 text-crypto-dark-primary">📈 Real-Time Data</h3>
            <p className="text-crypto-dark-text/70">
              Trade with live market data from major exchanges
            </p>
          </div>
          
          <div className="p-6 bg-crypto-dark-surface rounded-lg">
            <h3 className="text-2xl font-bold mb-3 text-crypto-dark-primary">🏆 Competitions</h3>
            <p className="text-crypto-dark-text/70">
              Compete with traders worldwide for prizes
            </p>
          </div>
          
          <div className="p-6 bg-crypto-dark-surface rounded-lg">
            <h3 className="text-2xl font-bold mb-3 text-crypto-dark-primary">📚 Education</h3>
            <p className="text-crypto-dark-text/70">
              Learn strategies and earn rewards
            </p>
          </div>
        </div>
        
        <div className="mt-12 p-6 bg-crypto-dark-surface/50 rounded-lg border border-crypto-dark-border">
          <p className="text-sm text-crypto-dark-text/60">
            🚀 Platform Status: <span className="text-crypto-dark-primary font-semibold">OPERATIONAL</span>
          </p>
          <p className="text-xs text-crypto-dark-text/40 mt-2">
            API Health: Backend + Database + Redis
          </p>
        </div>
      </div>
    </div>
  )
}
