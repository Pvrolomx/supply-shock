'use client'

import { useState, useEffect } from 'react'

interface CommodityData {
  symbol: string
  name: string
  price: number
  change1M: number
  zscore: number
  volatility: number
  googleSpike: number
  balticDry: number
  score: number
  signals: Record<string, number>
}

interface ScanResult {
  commodities: CommodityData[]
  maxScore: number
  timestamp: string
  alertLevel: 'NORMAL' | 'ATTENTION' | 'ALERT' | 'CRITICAL'
}

const COMMODITIES = [
  { symbol: 'CL=F', name: 'Crude Oil', keywords: 'oil shortage' },
  { symbol: 'NG=F', name: 'Natural Gas', keywords: 'gas shortage' },
  { symbol: 'GC=F', name: 'Gold', keywords: 'gold price' },
  { symbol: 'HG=F', name: 'Copper', keywords: 'copper shortage' },
  { symbol: 'ZW=F', name: 'Wheat', keywords: 'wheat shortage' },
  { symbol: 'ZC=F', name: 'Corn', keywords: 'corn shortage' },
]

export default function SupplyShock() {
  const [data, setData] = useState<ScanResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [installPrompt, setInstallPrompt] = useState<any>(null)

  useEffect(() => {
    // PWA install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      setInstallPrompt(e)
    })

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
    }

    // Load data
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/scan')
      const result = await res.json()
      setData(result)
    } catch (error) {
      console.error('Error fetching data:', error)
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
      if (result.success) {
        setMessage('✅ Email de prueba enviado!')
      } else {
        setMessage('❌ Error: ' + result.error)
      }
    } catch (error) {
      setMessage('❌ Error enviando email')
    }
    setSending(false)
  }

  const installApp = async () => {
    if (installPrompt) {
      installPrompt.prompt()
      const result = await installPrompt.userChoice
      if (result.outcome === 'accepted') {
        setInstallPrompt(null)
      }
    }
  }

  const getScoreClass = (score: number) => {
    if (score >= 76) return 'score-critical'
    if (score >= 51) return 'score-alert'
    if (score >= 26) return 'score-attention'
    return 'score-normal'
  }

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return '#e74c3c'
      case 'ALERT': return '#e67e22'
      case 'ATTENTION': return '#f39c12'
      default: return '#27ae60'
    }
  }

  return (
    <div className="container">
      <header className="header">
        <h1>⚡ SUPPLY SHOCK</h1>
        <p>Weak Signals #2 - Supply Chain Disruption Detector</p>
        <p style={{ color: '#666', marginTop: '5px' }}>Anticipación: 2-4 semanas</p>
      </header>

      <div className="status-bar">
        <div className="last-update">
          {data ? `Última actualización: ${new Date(data.timestamp).toLocaleString()}` : 'Cargando...'}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="install-btn" onClick={fetchData} disabled={loading}>
            🔄 Actualizar
          </button>
          {installPrompt && (
            <button className="install-btn" onClick={installApp}>
              📲 Instalar App
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
        </div>
      ) : data ? (
        <>
          {/* Alert Level Banner */}
          <div className="alert-box" style={{ 
            borderColor: getAlertColor(data.alertLevel),
            background: `${getAlertColor(data.alertLevel)}20`
          }}>
            <h4 style={{ color: getAlertColor(data.alertLevel) }}>
              {data.alertLevel === 'CRITICAL' && '🚨 NIVEL CRÍTICO - ACTUAR INMEDIATAMENTE'}
              {data.alertLevel === 'ALERT' && '⚠️ NIVEL ALERTA - PREPARAR POSICIONES'}
              {data.alertLevel === 'ATTENTION' && '👀 NIVEL ATENCIÓN - MONITOREAR'}
              {data.alertLevel === 'NORMAL' && '✅ NIVEL NORMAL - SIN ACCIÓN'}
            </h4>
            <p>Score máximo: {data.maxScore}/100</p>
          </div>

          {/* Commodities Grid */}
          <div className="grid">
            {data.commodities.map((commodity) => (
              <div className="card" key={commodity.symbol}>
                <h3>
                  <span className={`score-badge ${getScoreClass(commodity.score)}`}>
                    {commodity.score}
                  </span>
                  {commodity.name}
                </h3>
                
                <div className="commodity-row">
                  <div className="commodity-info">
                    <div className="commodity-name">{commodity.symbol}</div>
                    <div className="commodity-ticker">Precio: ${commodity.price?.toFixed(2) || 'N/A'}</div>
                  </div>
                  <div className={`commodity-change ${commodity.change1M >= 0 ? 'positive' : 'negative'}`}>
                    {commodity.change1M >= 0 ? '+' : ''}{commodity.change1M?.toFixed(1) || 0}%
                  </div>
                </div>

                <div className="signals-breakdown">
                  <div className="signal-row">
                    <span>S1: Precio 1M</span>
                    <span>{commodity.signals?.S1 || 0}/20</span>
                  </div>
                  <div className="signal-row">
                    <span>S2: Z-Score</span>
                    <span>{commodity.signals?.S2 || 0}/20</span>
                  </div>
                  <div className="signal-row">
                    <span>S3: Volatilidad</span>
                    <span>{commodity.signals?.S3 || 0}/10</span>
                  </div>
                  <div className="signal-row">
                    <span>S4: Google "{commodity.name.toLowerCase()} shortage"</span>
                    <span>{commodity.signals?.S4 || 0}/25</span>
                  </div>
                  <div className="signal-row">
                    <span>S5: ETF Confirm</span>
                    <span>{commodity.signals?.S5 || 0}/10</span>
                  </div>
                  <div className="signal-row">
                    <span>S6: Baltic Dry</span>
                    <span>{commodity.signals?.S6 || 0}/15</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Test Alert Button */}
          <div className="card">
            <h3>📧 Sistema de Alertas</h3>
            <p style={{ marginBottom: '15px', color: '#888' }}>
              Enviar email de prueba para verificar configuración
            </p>
            <button className="btn" onClick={sendTestAlert} disabled={sending}>
              {sending ? '⏳ Enviando...' : '📤 Enviar Alerta de Prueba'}
            </button>
            {message && (
              <p style={{ marginTop: '15px', textAlign: 'center' }}>{message}</p>
            )}
          </div>
        </>
      ) : (
        <div className="card">
          <p>Error cargando datos. Intenta actualizar.</p>
        </div>
      )}

      <footer className="footer">
        <p>Hecho por duendes.app 2026</p>
        <p style={{ marginTop: '5px', fontSize: '0.8rem' }}>
          Frecuencia de escaneo: cada 6 horas | Datos: Yahoo Finance + Google Trends
        </p>
      </footer>
    </div>
  )
}
