# 💪 GymApp

> App pessoal de treino e reabilitação — inspirado no Fitbod, feito do zero para uso próprio.

**Live:** [https://gym.joekyy.com.br](https://gym.joekyy.com.br)  
**Stack:** Next.js 16 · Tailwind CSS v4 · TypeScript · localStorage (zero backend)  
**PWA:** Funciona instalado no iPhone via "Adicionar à Tela de Início"

---

## ✨ Funcionalidades

### 🏋️ Exercícios
- **1773 exercícios** scrapeados do MuscleWiki (dados locais, offline-first)
- Busca por nome, músculo, equipamento e categoria
- Vídeos de execução com autoplay via IntersectionObserver
- Fallback automático para imagem JPEG quando vídeo não disponível
- Detalhe completo: músculos primários/secundários, instruções, variantes

### 🗓️ Treinos
- Criador de treino com busca e filtro por equipamento disponível
- Reordenação de exercícios, notas por set, séries/repetições/peso
- Filtro por ambiente (academia, casa, pilates, etc.)
- Sugestão automática de treino baseada no seu perfil

### 🤖 Sugestão Inteligente
- Motor de sugestão leva em conta: lesões, equipamentos, músculos frescos vs. fatigados
- Sistema de freshness muscular baseado em pesquisa EMG (Fitbod-style)
- Remove/substitui exercícios individualmente na sugestão

### 🩹 Lesões & Reabilitação
- Gerenciamento de lesões com protocolos clínicos:
  - **McGill Big 3** (hérnia de disco lombar)
  - **Protocolo McKenzie** (centralização da dor)
  - Fase de reabilitação progressiva (aguda → sub-aguda → funcional)
- Filtragem automática de exercícios contraindicados por lesão
- Limites de carga espinhal configuráveis

### 🏅 Sessão de Treino
- **Supersets**: vincule dois exercícios como superset no modo de edição (expanda o card → "Superset com próximo"); durante a sessão, exibe banner "SUPERSET" entre os pares e usa descanso curto (15s) entre A→B, descanso normal após B
- **Auto-progressão**: badge "+2.5kg" aparece quando RiR ≤ 1 nas últimas 2 sessões com aquele exercício
- **PR em tempo real**: badge 🏆 quando um set supera o 1RM estimado histórico
- **Timer de descanso** com vibração ao acabar (mobile)

### 📊 Progresso
- Histórico de sessões com data, duração, exercícios realizados
- Avaliação da sessão (⭐ 1–5), RiR, notas livres
- Exibição de frequência cardíaca e calorias (via Strava ou Apple Health)
- **Meta semanal de volume** por grupo muscular com barras de progresso
- **mScore pessoal**: badges "Favorito" ⭐ e "Frequente" na biblioteca de exercícios

### 🔄 Sincronização & Backup
- **Strava**: OAuth2 completo, exportar sessão como WeightTraining activity, importar dados de FC e calorias
- **Apple Health**: Exportar sessão como `.tcx` para importar no iPhone, importar `export.xml` para enriquecer sessões
- **Backup JSON**: exportar/restaurar todos os dados (sessões, treinos, perfil, lesões) como arquivo `.json`
- **Download .tcx** por sessão diretamente no histórico de progresso

### ⚙️ Perfil de Equipamentos
- Seleção de equipamentos disponíveis (casa, academia, ou personalizado)
- Bodyweight sempre incluído (removível)
- Filtra exercícios e sugestões automaticamente

### 🌙 Tema
- Tema claro/escuro com toggle
- Design system baseado nas cores pessoais (#ffc700 amarelo + preto)
- WCAG AA para contraste

---

## 🧭 Navegação & Telas

A navegação principal é uma **barra inferior de 3 tabs** (`src/components/BottomNav.tsx`):

| Tab | Rota | Função |
|-----|------|--------|
| **Workout** | `/` | Tela inicial / treino do dia |
| **Body** | `/body` | Estado de recuperação muscular (freshness) |
| **Log** | `/log` | Histórico de sessões e progresso |

As demais áreas são acessadas a partir dessas tabs e da tela de Configurações.

- **Workout / Home** (`app/page.tsx`) — saudação contextual + data em PT-BR, banner de
  streak, condições (lesões) ativas com atalho para sugestão, "Treino de Hoje" (puxado
  do plano semanal ativo) e cards de acesso rápido.
- **Body / Recovery** (`app/body/page.tsx`) — diagrama corporal colorido por freshness
  (verde = pronto, âmbar = recuperando, vermelho = descansando), recomendação de foco do
  dia e barras de recuperação por grupo muscular.
- **Log** (`app/log/page.tsx`) — stats (sessões, streak, mês), histórico de sessões com
  rating/RiR/FC/calorias e link para o progresso detalhado.
- **Sessão ativa** (`app/workout/WorkoutDetail.tsx`) — opera em **modo edição**
  (adicionar/reordenar exercícios, ajustar sets/reps/rest, vincular supersets) e **modo
  sessão** (registro de séries, barra de progresso, timer de descanso e finalização com
  rating/RiR/notas). Componentes em `app/workout/components/` e hooks em
  `app/workout/hooks/` (`useRestTimer`, `useSessionLogs`).
- **Sugestão** (`app/suggest`) — formulário + templates; gera um treino e permite
  substituir/remover exercícios antes de salvar.
- **Exercícios** (`app/exercises`) — biblioteca com busca, filtros e mapa corporal;
  detalhe em `/exercises/[slug]`.
- **Configurações** (`app/settings`) — porta de entrada para Perfil (`/profile`),
  Equipamentos (`/equipment`), Planos semanais (`/plans`), Lesões (`/injuries`),
  Progresso detalhado (`/progress`) e Sincronização (`/sync`).

---

## 🗂️ Estrutura do Projeto

```
gym-app/
├── src/
│   ├── app/                    # Rotas Next.js App Router
│   │   ├── page.tsx            # Tab "Workout" — home / treino do dia
│   │   ├── body/               # Tab "Body" — recuperação muscular (freshness)
│   │   ├── log/                # Tab "Log" — histórico de sessões
│   │   ├── settings/           # Configurações (perfil, dados, saúde)
│   │   ├── profile/            # Perfil do usuário
│   │   ├── exercises/          # Browser de exercícios + detalhe
│   │   ├── workouts/           # Criador de treinos
│   │   ├── workout/            # Sessão ativa de treino
│   │   ├── suggest/            # Sugestão automática de treino
│   │   ├── injuries/           # Gerenciamento de lesões
│   │   ├── progress/           # Força (1RM) + volume semanal
│   │   ├── plans/              # Planos semanais
│   │   ├── equipment/          # Perfil de equipamentos
│   │   ├── sync/               # Strava + Apple Health
│   │   └── strava-callback/    # OAuth2 callback
│   ├── components/
│   │   ├── BottomNav.tsx       # Navegação inferior mobile (Workout/Body/Log)
│   │   ├── ExerciseCard.tsx    # Card de exercício (lista + detalhe)
│   │   ├── ExerciseMedia.tsx   # Vídeo/imagem com autoplay
│   │   ├── ExerciseFilters.tsx # Filtros de busca
│   │   ├── InjuryPanel.tsx     # Painel de lesões
│   │   ├── Navbar.tsx          # Header
│   │   └── ThemeToggle.tsx     # Dark/light toggle
│   └── lib/
│       ├── types.ts            # Tipos TypeScript (Exercise, WorkoutSession, etc.)
│       ├── data.ts             # Loader de exercises.json
│       ├── storage.ts          # CRUD localStorage
│       ├── strava.ts           # OAuth2 + API Strava
│       ├── appleHealth.ts      # .tcx export + XML parser
│       ├── rehab.ts            # Protocolos McGill, McKenzie, etc.
│       ├── recovery.ts         # Sistema de freshness muscular
│       ├── suggestions.ts      # Motor de sugestão de treino
│       ├── equipment.ts        # Catálogo de equipamentos
│       ├── translations.ts     # PT-BR traduções de termos
│       └── exercise-corrections.ts  # Correções de classificação MuscleWiki
├── public/
│   ├── manifest.json           # PWA manifest
│   ├── icons/                  # Ícones 192×192, 512×512, 180×180
│   └── data/                   # ⚠️ NÃO versionado (ver abaixo)
│       ├── exercises.json      # 1773 exercícios (gerado pelo scraper)
│       └── media/
│           ├── images/         # ~35MB JPEGs
│           └── videos/         # ~4.6GB MP4s
├── scripts/
│   └── scraper/                # Scrapers Python + Playwright
├── next.config.ts              # Static export + PWA + Turbopack
├── deploy.sh                   # Build + rsync para HostGator
└── .gitignore                  # public/data/ excluído (muito grande)
```

---

## 🏛️ Arquitetura & Modelo de Dados

O app é dividido em quatro camadas, da UI até os dados:

```
UI (src/app/**/page.tsx, src/components)
  → Hooks (src/hooks, src/app/workout/hooks)
    → Lógica/domínio (src/lib)
      → Dados (public/data/exercises.json + localStorage)
```

- **UI** — rotas do App Router e componentes reutilizáveis. O layout raiz
  (`src/app/layout.tsx`) injeta tema, manifesto PWA, meta tags iOS e a navegação.
- **Hooks** — encapsulam estado e ciclo de vida (`useWorkouts`, `usePlans`,
  `useInjuries`, `useTheme`; e os de sessão `useRestTimer`, `useSessionLogs`).
- **Lógica/domínio** — `src/lib` (motores e utilitários, abaixo).
- **Dados** — catálogo estático em `public/data/exercises.json` + dados do usuário em
  `localStorage`.

### Tipos centrais (`src/lib/types.ts`)

| Tipo | Descrição |
|------|-----------|
| `Exercise` | Exercício do catálogo: músculos, equipamentos, mídia, instruções e camada científica (evidência A/B/C, carga espinhal, EMG, contraindicações, `isRehabSafe`). |
| `Workout` | Treino salvo: lista de `WorkoutExercise` (sets/reps/rest + `supersetGroupId` opcional). |
| `WorkoutSession` | Sessão executada: logs por exercício/série, duração, rating, RiR, FC/calorias. |
| `Injury` | Lesão clínica: condição, músculos, severidade, **fase** (aguda/subaguda/crônica/recuperada) e check-ins de dor. |
| `WeeklyPlan` | Plano semanal: dia da semana → IDs de treino. |
| `UserProfile` | Objetivo, nível, split, duração, unidades (kg/lb) e dados corporais. |
| `MuscleRecoveryStatus` | Estado de um grupo muscular: freshness 0–100%, horas restantes, status ready/partial/resting. |
| `SuggestionRequest` / `WorkoutSuggestion` | Entrada e saída do motor de sugestão. |

### Persistência (`src/lib/storage.ts`)

Todo o acesso ao `localStorage` passa por aqui, sob chaves prefixadas com `gymapp:`
(`gymapp:workouts`, `gymapp:sessions`, `gymapp:injuries_v2`, `gymapp:profile`,
`gymapp:equipment`, `gymapp:exercise_preferences`, ...). Os helpers `load`/`save` são
tolerantes a falha (try/catch com fallback), e há migração das lesões do modelo legado
(v1, `InjuredMuscle`) para o clínico (v2, `Injury`).

---

## ⚙️ Motores / Lógica de Domínio (`src/lib`)

### Motor de sugestão — `suggestions.ts`

`suggestWorkout(request, allExercises)` é o coração do app:

1. **Reabilitação** — se o foco é `rehab` e há lesões, monta um protocolo clínico.
2. **Restrições** — calcula freshness (via `recovery.ts`), reúne músculos lesionados e
   determina o limite de carga espinhal conforme as lesões.
3. **Filtro de candidatos** — descarta o que não bate com equipamento/ambiente, foco,
   o que é **contraindicado na fase atual**, excede a carga espinhal (classificada por
   padrões no slug) ou envolve músculos lesionados.
4. **Pontuação** — favorece compostos, utilidade básica, músculos frescos, dificuldade
   adequada e segurança para reabilitação; aplica preferências do usuário
   (Mais ×2 / Menos ×0.5 / Excluir) e um pequeno fator aleatório.
5. **Seleção diversificada** — compostos primeiro (evitando sobreposição muscular),
   depois isolamentos; reduz 1 série para músculos em recuperação parcial.
6. **Avisos** — alerta sobre músculos em recuperação e exercícios removidos por lesão.

Também expõe `WORKOUT_TEMPLATES` (ex.: "Protocolo Hérnia de Disco", "Força na Academia").

### Freshness muscular — `recovery.ts`

Modelo estilo Fitbod: após uma sessão, a freshness de um grupo começa em 0% e sobe
linearmente até 100% ao longo de uma **janela de recuperação** (horas).

- `MUSCLE_RECOVERY_WINDOWS` — janela base por grupo (ex.: bíceps 24–36h, lombar 60–80h);
  o volume (séries) estica a janela proporcionalmente.
- `calculateFreshness(...)` — acumula fadiga das sessões dos últimos 7 dias (primários
  ×1.0, secundários ×0.5 por série concluída) e classifica em ready/partial/resting.
- Lesões adjacentes **estendem a janela** por fase (aguda ×2.0, subaguda ×1.5, crônica ×1.25).
- `recommendFocusFromFreshness(...)` — recomenda o foco do dia (superior/inferior/core/
  corpo todo) pela média de freshness de cada região.

### Reabilitação clínica — `rehab.ts`

- **Biblioteca de condições** (`INJURY_CONDITIONS`) — músculos afetados, limite de carga
  espinhal por fase, padrões contraindicados (absolutos vs. apenas aguda/subaguda),
  padrões de cautela e categorias recomendadas por fase.
- **Protocolos baseados em evidência** — McGill Big 3 e McKenzie, com séries/reps/descanso.
- Funções de apoio (`isExerciseContraindicated`, `getRehabProtocolsForConditions`,
  `getAffectedMusclesForConditions`) consumidas pelo motor de sugestão.

### Gerador de treino — `generator.ts`

Rota alternativa orientada a **objetivo** (força/hipertrofia/resistência/mobilidade):
`generateWorkout(exercises, opts)` monta um treino por foco com prescrição
sets×reps×rest por objetivo/dificuldade, seleção gulosa evitando repetir o mesmo músculo
primário e boost por relevância pessoal (`scoreMap`).

### Apoio

- `data.ts` — loader e filtros do `exercises.json`.
- `equipment.ts` — catálogo de equipamentos.
- `translations.ts` — termos PT-BR (músculos, dificuldade, mecânica).
- `exercise-corrections.ts` — correções de classificação do MuscleWiki em runtime e
  detecção de equipamentos primários vs. secundários.
- `strava.ts` / `appleHealth.ts` — integrações de sync (detalhadas abaixo).

---

## 🚀 Como Rodar Localmente

### Pré-requisitos
- Node.js 18+
- Os dados de mídia locais (`public/data/`) — ver seção abaixo

```bash
# 1. Instalar dependências
npm install

# 2. Rodar em desenvolvimento
npm run dev
# → http://localhost:3000

# 3. Build estático (para deploy)
npm run build
```

### ⚠️ Dados de Mídia (não estão no repositório)

Os vídeos (4.6GB) e imagens (35MB) do MuscleWiki **não estão versionados** por tamanho.
Para ter a mídia localmente, rode o scraper:

```bash
cd scripts/scraper
pip install playwright requests
playwright install chromium
python scraper.py
```

Isso gera `public/data/exercises.json` e baixa toda a mídia para `public/data/media/`.

---

## 🌐 Deploy (HostGator)

O app está hospedado em [https://gym.joekyy.com.br](https://gym.joekyy.com.br) como export estático.

```bash
# Build + preparar para upload (remove vídeos do out/)
./deploy.sh

# Sincronizar com servidor (SSH)
rsync -avz -e "ssh -i ~/Downloads/id_rsa -p 2222" \
  --exclude='data/media/videos/' \
  out/ joeky497@br18.hostgator.com.br:~/gym.joekyy.com.br/
```

**Vídeos no servidor** — upload incremental via loop (timeout de 5min do HostGator):
```bash
# /tmp/rsync-loop.sh — roda rsync em loop até enviar todos os ~5418 vídeos
while true; do
  rsync -avz -e "ssh -i ~/Downloads/id_rsa -p 2222" \
    public/data/media/videos/ \
    joeky497@br18.hostgator.com.br:~/gym.joekyy.com.br/data/media/videos/
  [ $? -eq 0 ] && break
  sleep 5
done
```

### iPhone — Instalar como PWA
1. Abrir [https://gym.joekyy.com.br](https://gym.joekyy.com.br) no Safari
2. Compartilhar → **Adicionar à Tela de Início**
3. O app abre em fullscreen, sem barra do Safari

---

## 🔄 Integração Strava

1. Criar app em [developers.strava.com](https://developers.strava.com)
2. Definir Callback Domain: `gym.joekyy.com.br`
3. No app: **Mais → Sincronizar → Strava** → colar Client ID + Secret
4. Conectar via OAuth2
5. **Importar**: busca atividades dos últimos 60 dias e enriquece sessões com FC e calorias
6. **Exportar**: (futuro — via botão na sessão individual)

## 🍎 Integração Apple Health

**Exportar para Health:**
- Mais → Sincronizar → Apple Health → baixar `.tcx`
- iPhone: Arquivos → compartilhar com app **Saúde**

**Importar do Health:**
- iPhone: app Saúde → perfil → Exportar dados de saúde → ZIP
- Extrair `export.xml` e fazer upload no app
- Sessões são enriquecidas com FC e calorias do Apple Watch

---

## 📦 Dados & Fontes

| Fonte | Uso |
|-------|-----|
| [MuscleWiki](https://musclewiki.com) | 1773 exercícios, vídeos, imagens, músculos |
| [ExRx.net](https://exrx.net) | Referência para classificações e execução |
| McGill (2010) | Protocolo Big 3 para hérnia lombar |
| McKenzie (1981) | Protocolo de centralização da dor |
| Kaggle EMG datasets | Referência para freshness muscular |

---

## 🗓️ Histórico de Desenvolvimento

### Fase 1 — Scaffold & Dados (sessões 1–4)
- Definição do stack: Next.js 15 + Tailwind CSS v4 + localStorage (zero backend)
- Tentativa de uso da API paga do MuscleWiki (BASIC tier bloqueado)
- Descoberta da API interna do MuscleWiki via Playwright (intercept de RSC payloads)
- Scraper Python + Playwright: scrapeou 1773 exercícios com vídeos e imagens
- Scaffold completo: browser de exercícios, criador de treinos, planos semanais

### Fase 2 — Funcionalidades Clínicas (sessões 5–6)
- **Motor de sugestão de treino** (perfil, equipamentos, lesões)
- **Sistema de lesões clínicas**: protocolos McGill Big 3 e McKenzie
- **Progress tracking**: histórico de sessões com sets/reps/peso
- Script de backup de mídia local
- Camada científica nos exercícios (datasets Kaggle)

### Fase 3 — UX Redesign (sessões 6–9)
- **Design system personalizado**: #ffc700 amarelo + preto (joekyy.com.br)
- Tema claro/escuro com design tokens CSS
- Layout mobile-first: BottomNav, cards horizontais, imagem lado a lado
- Página de equipamentos (Fitbod-style, plano/sem headers)
- Correções de classificação MuscleWiki (runtime correction layer)
- Bodyweight removível do perfil de equipamentos

### Fase 4 — Freshness & Home Redesign (sessões 10–12)
- **Sistema de freshness muscular**: baseado em EMG research, simula recuperação por grupo muscular
- **Home screen redesign**: greeting, data, chips de músculos frescos, cards de treino
- **Workout builder redesign**: compact rows + bottom-sheet picker modal
- **Autoplay de vídeos** via IntersectionObserver em todas as telas
- Fix crítico: rehab.ts parse error (código órfão quebrando o dev server)
- Fix filtro de equipamento: 274 exercícios yoga/cardio sempre aparecendo

### Fase 5 — PWA + Deploy (sessões 13–14)
- Configuração PWA: `manifest.json`, ícones 192/512/180px, meta tags iOS
- `@ducanh2912/next-pwa` para service worker offline
- Static export (`output: 'export'`) com `generateStaticParams` para 1773 páginas
- `.htaccess` para SPA fallback no Apache (HostGator)
- Deploy em [https://gym.joekyy.com.br](https://gym.joekyy.com.br) via rsync SSH
- Let's Encrypt (AutoSSL via cPanel) para HTTPS
- Loop rsync para upload incremental dos 5418 vídeos (timeout SSH de 5min)

### Fase 7 — Fitbod-inspired UX + Rehab Avançado (sessões 16–25)
- Perfil de usuário (objetivo, nível, split, duração, unidades)
- 1RM estimado (Epley) + PR automático em sessão
- RiR (Reps in Reserve) pós-sessão
- Meta semanal de volume por músculo (progress page)
- Preferências de exercício (Mais / Menos / Excluir)
- Gerador ciente do perfil (objetivo, split, duração)
- Body map como filtro de exercícios (/exercises)
- Check-ins de lesão + relatório para fisio
- Tradução para PT-BR (nomes de músculos, dificuldade, mecânica, instruções)
- Diagrama corporal adaptado ao tema (claro/escuro)
- Back navigation padronizado com ícone ‹
- mScore pessoal (Favorito/Frequente) na biblioteca e no gerador
- Auto-progressão (+2.5kg badge)
- Supersets no modo de edição e sessão
- Backup JSON completo (exportar/restaurar)
- Export .tcx por sessão no histórico

---

## 📱 Usando no iPhone (Tailscale — desenvolvimento local)

Para testar a PWA no iPhone com HTTPS local sem precisar fazer deploy:

### 1. Instalar Tailscale

- **Mac**: baixe em [tailscale.com/download](https://tailscale.com/download) ou `brew install tailscale`
- **iPhone**: App Store → [Tailscale](https://apps.apple.com/app/tailscale/id1470499037)
- Faça login com a mesma conta nos dois dispositivos

### 2. Ativar HTTPS local com Tailscale Serve

```bash
# No terminal do Mac, com o dev server rodando:
npm run dev                         # inicia em http://localhost:3000

# Em outro terminal, exponha via HTTPS pela rede Tailscale:
tailscale serve --bg https+insecure://localhost:3000
```

Anote o URL exibido (ex: `https://seu-mac.tail1234.ts.net`).

### 3. Acessar no iPhone

1. Abra o **Safari** no iPhone
2. Acesse `https://seu-mac.tail1234.ts.net`
3. Clique em **Compartilhar → Adicionar à Tela de Início**
4. O app abre em fullscreen como PWA nativa

### 4. Parar o serviço

```bash
tailscale serve --bg off
```

> **Nota**: Tailscale Serve cria um túnel HTTPS dentro da sua rede privada (sem expor à internet). Ideal para desenvolvimento mobile com service workers.

## 🛠️ Decisões Técnicas

| Decisão | Motivo |
|---------|--------|
| Zero backend | App pessoal, tudo em localStorage, sem custos de servidor |
| Static export | Compatível com HostGator shared hosting |
| MuscleWiki scraper | API paga restrita; scraper via Playwright intercept é mais confiável |
| Vídeos excluídos do git | 4.6GB seria inviável — ficam apenas no Mac e no servidor |
| Strava com client_secret local | App pessoal → OK guardar credenciais em localStorage |
| Apple Health via XML | HealthKit só disponível em apps nativos; XML export é o único caminho web |
| `@ducanh2912/next-pwa` | Gera service worker automaticamente, compatível com static export |
| Turbopack + webpack coexistindo | next-pwa usa webpack config; `turbopack: {}` silencia o warning |

---

## 📝 Variáveis de Ambiente

Nenhuma variável de ambiente necessária. Todas as configurações externas
(Strava credentials) são salvas em localStorage pelo próprio usuário.

---

*Projeto pessoal de Joe Kyy — para uso próprio, não produção.*
