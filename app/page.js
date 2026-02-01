'use client'

import { useState, useEffect } from 'react'

export default function SupplyShock() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [installPrompt, setInstallPrompt] = useState(null)

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      setInstallPrompt(e)
    })
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
    }
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/scan')
      const result = await res.json()
      setData(result)
    } catch (error) {
      console.error('Error:', error)
    }
    setLoading(false)
  }

  const sendTestAlert = async () => {
    setSending(true)
    setMessage('')
    try {
      const res = await fetch('/api/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true })
      })
      const result = await res.json()
      setMessage(result.success ? '✅ Email enviado!' : '❌ Error: ' + result.error)
    } catch (error) {
      setMessage('❌ Error enviando email')
    }
    setSending(false)
  }

  const installApp = async () => {
    if (installPrompt) {
      installPrompt.prompt()
      const result = await installPrompt.userChoice
      if (result.outcome === 'accepted') setInstallPrompt(null)
    }
  }

  const getScoreClass = (score) => {
    if (score >= 76) return 'score-critical'
    if (score >= 51) return 'score-alert'
    if (score >= 26) return 'score-attention'
    return 'score-normal'
  }

  const getAlertColor = (level) => {
    const colors = { CRITICAL: '#e74c3c', ALERT: '#e67e22', ATTENTION: '#f39c12', NORMAL: '#27ae60' }
    return colors[level] || '#27ae60'
  }

  return (
    <div className="container">
      <header className="header">
        <h1>⚡ SUPPLY SHOCK</h1>
        <p>Weak Signals #2 - Supply Chain Disruption Detector</p>
      </header>

      <div className="status-bar">
        <div className="last-update">
          {data ? `Última actualización: ${new Date(data.timestamp).toLocaleString()}` : 'Cargando...'}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="install-btn" onClick={fetchData} disabled={loading}>🔄 Actualizar</button>
          {installPrompt && <button className="install-btn" onClick={installApp}>📲 Instalar</button>}
        </div>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner"></div></div>
      ) : data ? (
        <>
          <div className="alert-box" style={{ borderColor: getAlertColor(data.alertLevel), background: `${getAlertColor(data.alertLevel)}20` }}>
            <h4 style={{ color: getAlertColor(data.alertLevel) }}>
              {data.alertLevel === 'CRITICAL' && '🚨 CRÍTICO - ACTUAR'}
              {data.alertLevel === 'ALERT' && '⚠️ ALERTA - PREPARAR'}
              {data.alertLevel === 'ATTENTION' && '👀 ATENCIÓN - MONITOREAR'}
              {data.alertLevel === 'NORMAL' && '✅ NORMAL'}
            </h4>
            <p>Score máximo: {data.maxScore}/100</p>
          </div>

          <div className="grid">
            {data.commodities && data.commodities.map((c) => (
              <div className="card" key={c.symbol}>
                <h3>
                  <span className={`score-badge ${getScoreClass(c.score)}`}>{c.score}</span>
                  {c.name}
                </h3>
                <div className="commodity-row">
                  <div className="commodity-info">
                    <div className="commodity-name">{c.symbol}</div>
                    <div className="commodity-ticker">Precio: ${c.price?.toFixed(2) || 'N/A'}</div>
                  </div>
                  <div className={`commodity-change ${c.change1M >= 0 ? 'positive' : 'negative'}`}>
                    {c.change1M >= 0 ? '+' : ''}{c.change1M?.toFixed(1) || 0}%
                  </div>
                </div>
                <div className="signals-breakdown">
                  <div className="signal-row"><span>S1: Precio 1M</span><span>{c.signals?.S1 || 0}/20</span></div>
                  <div className="signal-row"><span>S2: Z-Score</span><span>{c.signals?.S2 || 0}/20</span></div>
                  <div className="signal-row"><span>S3: Volatilidad</span><span>{c.signals?.S3 || 0}/10</span></div>
                  <div className="signal-row"><span>S4: Google Trends</span><span>{c.signals?.S4 || 0}/25</span></div>
                  <div className="signal-row"><span>S5: ETF Confirm</span><span>{c.signals?.S5 || 0}/10</span></div>
                  <div className="signal-row"><span>S6: Baltic Dry</span><span>{c.signals?.S6 || 0}/15</span></div>
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <h3>📧 Sistema de Alertas</h3>
            <p style={{ marginBottom: '15px', color: '#888' }}>Enviar email de prueba</p>
            <button className="btn" onClick={sendTestAlert} disabled={sending}>
              {sending ? '⏳ Enviando...' : '📤 Enviar Alerta de Prueba'}
            </button>
            {message && <p style={{ marginTop: '15px', textAlign: 'center' }}>{message}</p>}
          </div>
        </>
      ) : <div className="card"><p>Error cargando datos</p></div>}

      <footer className="footer">
        <p>Hecho por duendes.app 2026</p>
      </footer>
    </div>
  )
}
