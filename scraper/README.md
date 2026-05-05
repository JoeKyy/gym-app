# Scraper — Coleta de Dados

Scripts Python para coletar exercícios do MuscleWiki e ExRx.net.

## Setup (já feito)

```bash
cd scraper
python3 -m venv .venv
.venv/bin/pip install playwright aiohttp
.venv/bin/playwright install chromium
```

## Ordem de execução

### 1. Coletar dados do MuscleWiki
```bash
.venv/bin/python scraper/musclewiki.py
# Salva: scraper/data/musclewiki_raw.json
```

### 2. Coletar instruções do ExRx
```bash
.venv/bin/python scraper/exrx.py
# Salva: scraper/data/exrx_raw.json
```

### 3. Mesclar tudo
```bash
.venv/bin/python scraper/merge.py
# Salva: public/data/exercises.json + public/data/gifs/
```

### 4. Testar se as URLs de vídeo funcionam no browser
```bash
.venv/bin/python scraper/download_media.py --test
```

### 5. (Se URLs bloqueadas) Baixar mídia localmente
```bash
.venv/bin/python scraper/download_media.py
```

## Notas
- Os scrapers salvam progresso a cada 10 exercícios — podem ser interrompidos e retomados
- MuscleWiki tem ~700+ exercícios, ExRx tem ~1000+
- Para uso pessoal apenas
