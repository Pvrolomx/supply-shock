#!/usr/bin/env python3
"""
SUPPLY SHOCK MONITOR - Weak Signals #2
Detecta disrupciones supply chain 2-4 semanas antes
Cron: 0 */6 * * * (cada 6 horas)

Hecho por duendes.app 2026
"""

import os
import json
import requests
from datetime import datetime, timedelta
from pathlib import Path

# === CONFIGURACIÓN ===
EMAIL_SERVICE_URL = "https://email.duendes.app/api/send"
ALERT_EMAIL = "pvrolomx@yahoo.com.mx"
ALERT_THRESHOLD = 50
LOG_FILE = Path.home() / "colmena" / "supply_shock.log"
DATA_FILE = Path.home() / "colmena" / "supply_shock_history.json"

COMMODITIES = [
    {"symbol": "CL=F", "name": "Crude Oil", "keywords": "oil shortage"},
    {"symbol": "NG=F", "name": "Natural Gas", "keywords": "gas shortage"},
    {"symbol": "GC=F", "name": "Gold", "keywords": "gold price"},
    {"symbol": "HG=F", "name": "Copper", "keywords": "copper shortage"},
    {"symbol": "ZW=F", "name": "Wheat", "keywords": "wheat shortage"},
    {"symbol": "ZC=F", "name": "Corn", "keywords": "corn shortage"},
]

def log(msg):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] {msg}"
    print(line)
    try:
        with open(LOG_FILE, "a") as f:
            f.write(line + "\n")
    except:
        pass

def get_yahoo_data(symbol):
    try:
        import yfinance as yf
        import numpy as np
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period="3mo")
        if len(hist) < 22:
            return None
        closes = hist['Close'].dropna().values
        current_price = closes[-1]
        price_1mo_ago = closes[-22] if len(closes) >= 22 else closes[0]
        change_1m = ((current_price - price_1mo_ago) / price_1mo_ago) * 100
        mean = np.mean(closes)
        std = np.std(closes)
        zscore = (current_price - mean) / std if std > 0 else 0
        returns = np.diff(closes) / closes[:-1]
        volatility = np.std(returns) * np.sqrt(252) * 100
        return {"price": float(current_price), "change_1m": float(change_1m), "zscore": float(zscore), "volatility": float(volatility)}
    except Exception as e:
        log(f"Error {symbol}: {e}")
        return None

def get_google_spike(keyword):
    try:
        from pytrends.request import TrendReq
        pytrends = TrendReq(hl='en-US', tz=360, timeout=(10, 25))
        pytrends.build_payload([keyword], timeframe='now 7-d')
        df = pytrends.interest_over_time()
        if df.empty:
            return 1.0
        values = df[keyword].values
        current = values[-1]
        avg = values[:-1].mean() if len(values) > 1 else current
        return float(current / max(avg, 1))
    except Exception as e:
        log(f"Error Trends '{keyword}': {e}")
        return 1.0

def get_baltic_dry_change():
    data = get_yahoo_data("ZIM")
    return data["change_1m"] if data else 0

def score_commodity(data, baltic_dry_change, google_spike):
    signals = {}
    signals["S1"] = 20 if data["change_1m"] >= 25 else (12 if data["change_1m"] >= 15 else (6 if data["change_1m"] >= 10 else 0))
    signals["S2"] = 20 if data["zscore"] >= 3 else (12 if data["zscore"] >= 2 else (6 if data["zscore"] >= 1.5 else 0))
    signals["S3"] = 10 if data["volatility"] >= 80 else (5 if data["volatility"] >= 50 else 0)
    signals["S4"] = 25 if google_spike >= 5 else (15 if google_spike >= 3 else (8 if google_spike >= 2 else 0))
    signals["S5"] = 0
    signals["S6"] = 15 if baltic_dry_change >= 30 else (10 if baltic_dry_change >= 20 else (5 if baltic_dry_change >= 10 else 0))
    return signals, sum(signals.values())

def send_alert(results, max_score, alert_level):
    try:
        commodities_text = "\n".join([f"  {r['name']}: {r['score']}/100 ({r['change_1m']:+.1f}%)" for r in results[:3]])
        message = f"""SUPPLY SHOCK - ALERTA {alert_level}
Score Maximo: {max_score}/100
Timestamp: {datetime.now().isoformat()}

TOP COMMODITIES:
{commodities_text}

Supply Shock Monitor - RPi
Hecho por duendes.app 2026"""
        response = requests.post(EMAIL_SERVICE_URL, json={
            "to": ALERT_EMAIL,
            "subject": f"SUPPLY SHOCK - {alert_level} - Score {max_score}/100",
            "message": message,
            "name": "Supply Shock RPi",
            "sendFrom": "duendes.app"
        }, timeout=30)
        result = response.json()
        log(f"Alerta enviada: {result.get('success')}")
    except Exception as e:
        log(f"Error alerta: {e}")

def save_history(results):
    try:
        history = []
        if DATA_FILE.exists():
            with open(DATA_FILE, "r") as f:
                history = json.load(f)
        history.append({"timestamp": datetime.now().isoformat(), "results": results})
        cutoff = datetime.now() - timedelta(days=30)
        history = [h for h in history if datetime.fromisoformat(h["timestamp"]) > cutoff]
        with open(DATA_FILE, "w") as f:
            json.dump(history, f, indent=2)
    except Exception as e:
        log(f"Error history: {e}")

def main():
    log("=" * 40)
    log("SUPPLY SHOCK MONITOR - ESCANEO")
    log("=" * 40)
    baltic_dry = get_baltic_dry_change()
    log(f"Baltic Dry (ZIM): {baltic_dry:+.1f}%")
    results = []
    for c in COMMODITIES:
        log(f"Escaneando {c['name']}...")
        data = get_yahoo_data(c["symbol"])
        if not data:
            results.append({"symbol": c["symbol"], "name": c["name"], "score": 0, "change_1m": 0, "signals": {}})
            continue
        google_spike = get_google_spike(c["keywords"])
        signals, score = score_commodity(data, baltic_dry, google_spike)
        results.append({"symbol": c["symbol"], "name": c["name"], "price": data["price"], "change_1m": data["change_1m"], "zscore": data["zscore"], "volatility": data["volatility"], "google_spike": google_spike, "signals": signals, "score": score})
        log(f"  {c['name']}: {score}/100 ({data['change_1m']:+.1f}%)")
    results.sort(key=lambda x: x["score"], reverse=True)
    max_score = results[0]["score"] if results else 0
    alert_level = "CRITICAL" if max_score >= 76 else ("ALERT" if max_score >= 51 else ("ATTENTION" if max_score >= 26 else "NORMAL"))
    log(f"RESULTADO: {alert_level} ({max_score}/100)")
    save_history(results)
    if max_score >= ALERT_THRESHOLD:
        log(f"Score >= {ALERT_THRESHOLD} -> Enviando alerta")
        send_alert(results, max_score, alert_level)
    else:
        log(f"Score < {ALERT_THRESHOLD} -> Sin alerta")
    log("COMPLETADO")

if __name__ == "__main__":
    main()
