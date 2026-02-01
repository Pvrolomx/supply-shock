import { NextRequest, NextResponse } from 'next/server'

const EMAIL_SERVICE_URL = 'https://email.duendes.app/api/send'
const ALERT_EMAIL = 'pvrolomx@yahoo.com.mx'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const isTest = body.test === true
    
    // Get current data if not test
    let scanData = body.data
    if (!scanData && !isTest) {
      const scanRes = await fetch(new URL('/api/scan', req.url).toString())
      scanData = await scanRes.json()
    }
    
    // Build email content
    let subject = '⚡ SUPPLY SHOCK - '
    let message = ''
    
    if (isTest) {
      subject += 'Alerta de Prueba'
      message = `
🔔 SUPPLY SHOCK - ALERTA DE PRUEBA
════════════════════════════════════

Esta es una alerta de prueba del sistema Supply Shock.

✅ El sistema de alertas está funcionando correctamente.

📊 El sistema monitorea:
• Crude Oil (CL=F)
• Natural Gas (NG=F)
• Gold (GC=F)
• Copper (HG=F)
• Wheat (ZW=F)
• Corn (ZC=F)

⏱️ Frecuencia: Cada 6 horas
🎯 Anticipación: 2-4 semanas

════════════════════════════════════
Supply Shock - Weak Signals #2
Hecho por duendes.app 2026
      `
    } else if (scanData) {
      const level = scanData.alertLevel || 'NORMAL'
      subject += `${level} - Score ${scanData.maxScore}/100`
      
      const commodityList = scanData.commodities
        ?.map((c: any) => `• ${c.name}: ${c.score}/100 (${c.change1M >= 0 ? '+' : ''}${c.change1M?.toFixed(1)}%)`)
        .join('\n') || 'No data'
      
      message = `
🚨 SUPPLY SHOCK - ALERTA ${level}
════════════════════════════════════

Score Máximo: ${scanData.maxScore}/100
Nivel: ${level}
Timestamp: ${new Date().toISOString()}

📊 COMMODITIES:
${commodityList}

${level === 'CRITICAL' ? '⚠️ ACCIÓN REQUERIDA: Evaluar posiciones largas en commodities afectados' : ''}
${level === 'ALERT' ? '👀 MONITOREAR: Preparar posiciones si el score aumenta' : ''}

════════════════════════════════════
Supply Shock - Weak Signals #2
Hecho por duendes.app 2026
      `
    }
    
    // Send email via email.duendes.app
    const emailRes = await fetch(EMAIL_SERVICE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: ALERT_EMAIL,
        subject,
        message,
        name: 'Supply Shock',
        sendFrom: 'duendes.app'
      })
    })
    
    const emailResult = await emailRes.json()
    
    if (emailResult.success) {
      return NextResponse.json({ success: true, message: 'Alert sent successfully' })
    } else {
      return NextResponse.json({ success: false, error: emailResult.error }, { status: 500 })
    }
  } catch (error: any) {
    console.error('Alert error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
