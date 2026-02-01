import { NextResponse } from 'next/server'

// Commodities a monitorear
const COMMODITIES = [
  { symbol: 'CL=F', name: 'Crude Oil', keywords: 'oil shortage' },
  { symbol: 'NG=F', name: 'Natural Gas', keywords: 'gas shortage' },
  { symbol: 'GC=F', name: 'Gold', keywords: 'gold price' },
  { symbol: 'HG=F', name: 'Copper', keywords: 'copper shortage' },
  { symbol: 'ZW=F', name: 'Wheat', keywords: 'wheat shortage' },
  { symbol: 'ZC=F', name: 'Corn', keywords: 'corn shortage' },
]

// Fetch price data from Yahoo Finance
async function getYahooData(symbol: string) {
  try {
    const endDate = Math.floor(Date.now() / 1000)
    const startDate = endDate - (90 * 24 * 60 * 60) // 90 days ago
    
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${startDate}&period2=${endDate}&interval=1d`
    
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    
    if (!res.ok) return null
    
    const data = await res.json()
    const result = data.chart?.result?.[0]
    
    if (!result?.indicators?.quote?.[0]?.close) return null
    
    const closes = result.indicators.quote[0].close.filter((c: number) => c !== null)
    
    if (closes.length < 22) return null
    
    const currentPrice = closes[closes.length - 1]
    const price1MoAgo = closes[closes.length - 22] || closes[0]
    const change1M = ((currentPrice - price1MoAgo) / price1MoAgo) * 100
    
    // Calculate Z-Score (simplified: current vs 90-day mean and std)
    const mean = closes.reduce((a: number, b: number) => a + b, 0) / closes.length
    const std = Math.sqrt(closes.reduce((a: number, b: number) => a + Math.pow(b - mean, 2), 0) / closes.length)
    const zscore = std > 0 ? (currentPrice - mean) / std : 0
    
    // Calculate volatility (annualized)
    const returns = []
    for (let i = 1; i < closes.length; i++) {
      returns.push((closes[i] - closes[i-1]) / closes[i-1])
    }
    const returnStd = Math.sqrt(returns.reduce((a, b) => a + Math.pow(b, 2), 0) / returns.length)
    const volatility = returnStd * Math.sqrt(252) * 100
    
    return {
      price: currentPrice,
      change1M,
      zscore,
      volatility
    }
  } catch (error) {
    console.error(`Error fetching ${symbol}:`, error)
    return null
  }
}

// Get Baltic Dry Index proxy (shipping stock)
async function getBalticDryChange() {
  try {
    const data = await getYahooData('ZIM') // Shipping stock as proxy
    return data?.change1M || 0
  } catch {
    return 0
  }
}

// Score a commodity based on signals
function scoreCommodity(data: any, balticDryChange: number) {
  const signals: Record<string, number> = {}
  
  // S1: Precio 1M (20%)
  if (data.change1M >= 25) signals.S1 = 20
  else if (data.change1M >= 15) signals.S1 = 12
  else if (data.change1M >= 10) signals.S1 = 6
  else signals.S1 = 0
  
  // S2: Z-Score (20%)
  if (data.zscore >= 3) signals.S2 = 20
  else if (data.zscore >= 2) signals.S2 = 12
  else if (data.zscore >= 1.5) signals.S2 = 6
  else signals.S2 = 0
  
  // S3: Volatilidad (10%)
  if (data.volatility >= 80) signals.S3 = 10
  else if (data.volatility >= 50) signals.S3 = 5
  else signals.S3 = 0
  
  // S4: Google Trends spike - simulated for now (25%)
  // In production, would use pytrends or SerpAPI
  signals.S4 = 0 // Placeholder
  
  // S5: ETF confirmation (10%)
  signals.S5 = 0 // Placeholder
  
  // S6: Baltic Dry (15%)
  if (balticDryChange >= 30) signals.S6 = 15
  else if (balticDryChange >= 20) signals.S6 = 10
  else if (balticDryChange >= 10) signals.S6 = 5
  else signals.S6 = 0
  
  return {
    signals,
    score: Object.values(signals).reduce((a, b) => a + b, 0)
  }
}

export async function GET() {
  try {
    const balticDryChange = await getBalticDryChange()
    
    const results = await Promise.all(
      COMMODITIES.map(async (commodity) => {
        const data = await getYahooData(commodity.symbol)
        
        if (!data) {
          return {
            symbol: commodity.symbol,
            name: commodity.name,
            price: 0,
            change1M: 0,
            zscore: 0,
            volatility: 0,
            googleSpike: 0,
            balticDry: balticDryChange,
            score: 0,
            signals: { S1: 0, S2: 0, S3: 0, S4: 0, S5: 0, S6: 0 }
          }
        }
        
        const { signals, score } = scoreCommodity(data, balticDryChange)
        
        return {
          symbol: commodity.symbol,
          name: commodity.name,
          price: data.price,
          change1M: data.change1M,
          zscore: data.zscore,
          volatility: data.volatility,
          googleSpike: 0,
          balticDry: balticDryChange,
          score,
          signals
        }
      })
    )
    
    const maxScore = Math.max(...results.map(r => r.score))
    
    let alertLevel: 'NORMAL' | 'ATTENTION' | 'ALERT' | 'CRITICAL' = 'NORMAL'
    if (maxScore >= 76) alertLevel = 'CRITICAL'
    else if (maxScore >= 51) alertLevel = 'ALERT'
    else if (maxScore >= 26) alertLevel = 'ATTENTION'
    
    return NextResponse.json({
      commodities: results.sort((a, b) => b.score - a.score),
      maxScore,
      alertLevel,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Scan error:', error)
    return NextResponse.json({ error: 'Error scanning commodities' }, { status: 500 })
  }
}
