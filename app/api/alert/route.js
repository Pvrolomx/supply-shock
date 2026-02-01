import { NextResponse } from 'next/server'

const EMAIL_SERVICE_URL = 'https://email.duendes.app/api/send'
const ALERT_EMAIL = 'pvrolomx@yahoo.com.mx'

export async function POST(req) {
  try {
    const body = await req.json()
    const isTest = body.test === true
    
    let subject = '⚡ SUPPLY SHOCK - '
    let message = ''
    
    if (isTest) {
      subject += 'Alerta de Prueba'
      message = `🔔 SUPPLY SHOCK - ALERTA DE PRUEBA
════════════════════════════════════

✅ El sistema de alertas está funcionando.

📊 Commodities monitoreados:
• Crude Oil, Natural Gas, Gold
• Copper, Wheat, Corn

⏱️ Frecuencia: Cada 6 horas
🎯 Anticipación: 2-4 semanas

════════════════════════════════════
Supply Shock - Weak Signals #2
Hecho por duendes.app 2026`
    } else {
      const scanData = body.data
      const level = scanData?.alertLevel || 'NORMAL'
      subject += `${level} - Score ${scanData?.maxScore || 0}/100`
      message = `🚨 SUPPLY SHOCK - ALERTA ${level}
Score: ${scanData?.maxScore || 0}/100

Hecho por duendes.app 2026`
    }
    
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
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ success: false, error: emailResult.error }, { status: 500 })
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
