<div align="center">

# 🎯 CSTatics Brasil

### O hub brasileiro de táticas e lineups de Counter-Strike 2.

![Eleventy](https://img.shields.io/badge/Eleventy-3.x-000?style=for-the-badge&logo=eleventy)
![Nunjucks](https://img.shields.io/badge/Nunjucks-templates-1abc9c?style=for-the-badge)
![Static Site](https://img.shields.io/badge/Static%20Site-SEO%20first-4F46E5?style=for-the-badge)

</div>

---

## 📖 Sobre

**CSTatics Brasil** é uma plataforma de conteúdo de Counter-Strike 2 em português, com duas frentes:

1. **Biblioteca de lineups** — smokes, flashes, molotovs e HE por mapa, cada um com posição de arremesso, passo a passo, dicas e vídeo.
2. **Táticas por mapa** — defaults, execuções, anti-eco e retakes explicados com timings e counters.

### Por que site estático?

Todo o conteúdo é **HTML real, renderizado no build** — rápido e 100% indexável pelo Google. Essa é a vantagem estratégica sobre concorrentes construídos como apps em canvas (ex.: Flutter/SPA), que o Google não consegue ler. Cada lineup e cada tática é uma página que ranqueia sozinha (ex.: *"smoke CT mirage"*, *"molotov banana inferno"*), com dados estruturados `schema.org/HowTo`.

> ⚠️ Projeto em desenvolvimento ativo — Fase 1 (máquina de conteúdo/SEO).

---

## 🛠️ Stack real

| Tecnologia | Uso |
|------------|-----|
| **[Eleventy (11ty)](https://www.11ty.dev/) 3.x** | Gerador de site estático |
| **Nunjucks (`.njk`)** | Templates e componentes |
| **CSS/JS vanilla** | Estilos (design tokens em `main.css`) e interações |
| **@11ty/eleventy-img** | Imagens responsivas (webp/jpeg) |

> Migração planejada para **Astro** na Fase 2, quando entrar a prancheta interativa (ilhas React) — mantendo o conteúdo estático e indexável.

---

## 🚀 Como rodar

```bash
npm install
npm run dev     # servidor local em http://localhost:8080
npm run build   # gera o site em ./dist
```

---

## 🗂️ Estrutura

```text
src/
├── _data/                # Dados (fonte da verdade — content é data-driven)
│   ├── site.json         # Config global (nome, url, redes, SEO)
│   ├── maps.json         # Mapas do CS2 (pool competitivo)
│   ├── lineups.json      # Biblioteca de lineups
│   ├── tactics.json      # Táticas
│   └── navigation.json   # Taxonomias (utilitárias, dificuldades, sides)
├── _includes/
│   ├── layouts/base.njk  # Layout base (SEO, OG, JSON-LD)
│   └── components/       # navbar, footer, hero, lineup-card, tactic-card...
├── pages/
│   ├── index.njk         # Home
│   ├── lineups.njk       # /lineups/ (listagem + filtros)
│   ├── lineup-detail.njk # /lineups/<slug>/ (paginação sobre lineups.json)
│   ├── map-hub.njk       # /mapas/<slug>/ (hub por mapa)
│   ├── tactics.njk       # /tactics/ (escolha de mapa)
│   ├── tactic-detail.njk # /tactics/<slug>/
│   └── contato.njk
└── assets/               # css/, js/, images/
```

---

## ➕ Como adicionar conteúdo

O site é **data-driven**: para publicar uma nova lineup, adicione um objeto em [`src/_data/lineups.json`](src/_data/lineups.json). Uma página nova (`/lineups/<slug>/`) é gerada automaticamente no build, já com SEO e dados estruturados.

```jsonc
{
  "slug": "smoke-ct-mirage-rampa-t",  // vira a URL
  "title": "Smoke de CT no Mirage (jogada da Rampa T)",
  "map": "mirage",                    // slug de maps.json
  "utility": "smoke",                 // smoke | flash | molotov | he
  "side": "t",                        // t | ct
  "site": "a",                        // a | b | mid
  "position": "Rampa T (em cima do Tetris)",
  "difficulty": "facil",              // facil | media | dificil
  "movement": "jumpthrow",            // parado | jumpthrow | run-throw | walk
  "shortDescription": "...",
  "description": "...",
  "steps": ["Passo 1...", "Passo 2..."],
  "tips": ["Dica..."],
  "videoUrl": "",                     // embed do YouTube (quando gravado)
  "verified": false                   // true após a equipe validar em treino
}
```

> **Precisão é o produto.** Enquanto `verified: false`, a página exibe um aviso de "em validação". Marque `true` (e adicione o `videoUrl`) só depois de conferir o alinhamento no jogo.

---

## 🗺️ Roadmap

- **Fase 1 — Conteúdo/SEO (atual):** biblioteca de lineups e táticas em PT, indexável.
- **Fase 2 — Prancheta interativa:** editor de estratégias no mapa, com animação e compartilhamento por link.
- **Fase 3 — Contas e comunidade:** login, playbook pessoal/de time, favoritos, submissões.
- **Fase 4 — Monetização:** PRO via Pix (BRL), parcerias com criadores/times.

---

## 👨‍💻 Autors

- **Renato Aquino** — Software Engineer • Java Backend Developer
GitHub: [@Renato4qu1n0](https://github.com/Renato4qu1n0)
- **Rafael Aquino** — Software Engineer • FullStack Developer
Github: [@rafaaquino10](https://github.com/rafaaquino10)

## 🌐 Redes

- 📸 Instagram: [@cstaticsbr](https://instagram.com/cstaticsbr)
- ▶️ YouTube: [@cstaticsbr](https://youtube.com/@cstaticsbr)
- 🎵 TikTok: [@cstaticsbr](https://tiktok.com/@cstaticsbr)

<div align="center">

Feito com ❤️ para a comunidade brasileira de Counter-Strike.

</div>
