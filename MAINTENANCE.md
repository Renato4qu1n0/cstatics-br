# Manutenção do CSTatics Brasil

Guia prático para manter e alimentar o site **sem depender de quem escreveu o código**.
Se você (Renato) só quer adicionar conteúdo, leia as seções **1**, **3** e **4**. O resto é referência.

---

## 1. O que é isto (em 30 segundos)

- Site **estático** gerado com **Eleventy (11ty)**. Não há banco de dados nem back-end.
- Todo o conteúdo mora em **arquivos JSON** dentro de `src/_data/`.
- Você edita um JSON → roda o build → sai uma pasta `dist/` com HTML pronto → sobe para a hospedagem.
- Nada de framework pesado (não é React/Next). É HTML, CSS e um pouco de JS.

### Rodar na sua máquina

```bash
npm install        # só na primeira vez
npm run dev        # abre em http://localhost:8080 e recarrega ao salvar
```

Para gerar o site final:

```bash
npm run build      # valida o conteúdo e escreve tudo em dist/
```

> `npm run build` roda o **validador automático antes** (via `prebuild`). Se algum
> conteúdo estiver quebrado (callout que não existe, campo faltando, lineup
> inexistente referenciado numa execução), o build **falha e explica o erro**.
> Isso é de propósito: é a rede de segurança para não publicar página quebrada.

Para só checar o conteúdo sem gerar o site:

```bash
npm test
```

---

## 2. Mapa dos arquivos

```
src/
  _data/
    site.json         → nome, URL, e-mail, redes, config de analytics
    navigation.json   → itens do menu
    maps.json         → lista de mapas (cards da página de mapas)
    mapgeo.json       → GEOMETRIA dos mapas + CALLOUTS (coordenadas x/y). LER SEÇÃO 5.
    lineups.json      → as jogadas de utilitária (o coração do conteúdo)
    executions.json   → "pacotes" de lineups (uma execução = várias lineups em ordem)
    tactics.json      → estratégias de time (default, rush, etc.)
    feedItems.js      → monta o RSS automaticamente (não precisa mexer)
  pages/              → os templates de cada tipo de página (.njk)
  _includes/          → cabeçalho, rodapé, layout, componentes reutilizáveis
  assets/             → css, js e imagens do site
  images/ img/        → imagens de conteúdo (logos de mapa, capas, etc.)
.eleventy.js          → config do Eleventy + filtros (o "cérebro" do build)
test/validate.js      → o validador que roda antes do build
```

**Regra de ouro:** para adicionar conteúdo você quase sempre só toca em
`lineups.json`, `executions.json` ou `tactics.json`. Os templates já cuidam do resto.

---

## 3. Como adicionar uma LINEUP (o caso mais comum)

> **Prefere um painel a editar JSON na mão?** Existe um admin visual (Decap CMS) em
> `/admin/`. Para usar **localmente agora**, sem login nem deploy:
> ```bash
> npm run dev        # deixe rodando
> npx decap-server   # em outra aba (o proxy que grava nos arquivos)
> ```
> Abra `http://localhost:8080/admin/`, edite pelos formulários e clique em *Publish* —
> ele grava direto nos JSON de `src/_data/`. Em produção o painel precisa de um passo
> de autenticação (ver `src/admin/config.yml`). O resto desta seção descreve o formato
> por baixo, que é o que o painel preenche.

Abra `src/_data/lineups.json` e copie um bloco existente dentro de `"lineups": [ ... ]`.
Campos:

```jsonc
{
  "slug": "smoke-ct-mirage-rampa-t",   // ID único, vira a URL /lineups/<slug>/. sem espaços/acentos
  "title": "Smoke de CT no Mirage",     // título visível
  "map": "mirage",                       // slug do mapa (mirage, inferno, dust2, nuke, ancient, anubis, train)
  "utility": "smoke",                    // smoke | flash | molotov | he | grenade
  "side": "t",                           // t | ct
  "site": "a",                           // a | b | mid
  "position": "Rampa T (em cima do Tetris)",  // de onde se joga (texto livre)
  "target": "Cobre a saída de CT",       // o que a jogada cobre (texto livre)
  "difficulty": "facil",                 // facil | media | dificil
  "movement": "jumpthrow",               // jumpthrow | throw | run-throw | walk (texto livre)
  "shortDescription": "...",             // 1 frase (aparece nos cards e no RSS)
  "description": "...",                   // parágrafo de contexto
  "steps": [ "Passo 1...", "Passo 2..." ],   // passo a passo (lista de frases)
  "tips": [ "Dica 1...", "Dica 2..." ],
  "videoUrl": "",                        // link do vídeo (ver seção 4). vazio = sem vídeo
  "gif": "",
  "image": "",                           // imagem opcional; vazio usa o diagrama automático
  "verified": false,                     // ver seção 4
  "tags": ["execução A", "essencial"],
  "meta": { "created": "2026-07-24", "updated": "2026-07-24", "author": "CSTatics" },
  "from": "rampa-t",                     // callout de ORIGEM  → precisa existir no mapgeo (seção 5)
  "to": "ct"                             // callout de DESTINO → precisa existir no mapgeo (seção 5)
}
```

> ⚠️ **`from` e `to` são o ponto que mais quebra.** Eles precisam existir em
> `mapgeo.json`, no mapa certo. Se você inventar um callout que não existe, o
> `npm run build` falha e diz exatamente qual. Veja a seção 5 para listar/criar callouts.
> São o `from`/`to` que desenham a seta da jogada no diagrama e na prancheta — automaticamente.

Depois de salvar: `npm run build`. Se passar, a página nova já existe em
`/lineups/<slug>/` e aparece nas listagens, no mapa, no sitemap e no RSS. Sem mais nada.

---

## 4. Vídeos e o selo "Verificado" (o seu fluxo, Renato)

O site já está pronto para os seus vídeos. Para cada lineup/execução/tática:

- **`videoUrl`**: cole o link do vídeo (YouTube). Deixe `""` enquanto não tiver.
- **`verified`**: mude para `true` só depois que **você testou a jogada no jogo**.
  `false` mostra um aviso de "em validação"; `true` mostra o selo de verificado.

O fluxo saudável é: conteúdo entra com `verified: false` → você grava/testa →
troca para `true` e preenche `videoUrl`. Nada mais precisa ser mexido no código.

---

## 5. Callouts e geometria dos mapas (`mapgeo.json`)

Cada mapa tem uma lista de **callouts**: pontos nomeados com coordenadas `x`/`y`
dentro do `viewBox` daquele mapa (um sistema de coordenadas próprio do desenho).

```jsonc
"mirage": {
  "viewBox": "0 0 400 400",
  "callouts": {
    "rampa-t": { "x": 276, "y": 256, "label": "Rampa T" },
    "ct":      { "x": 300, "y": 60,  "label": "CT" }
  }
}
```

- Para **listar** os callouts de um mapa (ex.: mirage):
  ```bash
  node -e "console.log(Object.keys(require('./src/_data/mapgeo.json').mirage.callouts).join('\n'))"
  ```
- Para **criar** um callout novo: adicione uma entrada em `callouts` com um `x`/`y`
  aproximado (olhe callouts vizinhos para estimar). Salve e rode `npm run dev` para
  ver onde caiu no diagrama; ajuste os números até encaixar. É tentativa e ajuste visual.

O resto de `mapgeo.json` (`areas`, `links`, `sites`, `objects`, `labels`) é o
**desenho** do mapa. Você não precisa mexer para adicionar conteúdo — só se quiser
melhorar o traçado de um mapa.

---

## 6. Execuções e Táticas (resumo)

- **Execução** (`executions.json`): é um pacote de lineups. O campo `throws` é uma
  lista de `{ "lineup": "<slug>", "label": "..." }`. Cada `lineup` **precisa existir**
  em `lineups.json` e ser **do mesmo mapa**. O validador confere isso. A execução
  gera automaticamente a animação passo a passo e o link da prancheta.
- **Tática** (`tactics.json`): estratégia de time. Campos principais: `slug`, `title`,
  `mapSlug`, `side` (`t-side`/`ct-side`), `steps` (com `players`), `counters`. `image`
  vazio usa o diagrama de fallback.

---

## 7. Publicar (deploy)

O projeto já vem configurado para **Vercel** (`vercel.json`) e **Netlify** (`netlify.toml`):

- Comando de build: `npm run build`
- Pasta publicada: `dist`

Basta ligar o repositório do GitHub em uma das duas plataformas; a cada `git push`
na branch principal ela roda o build e publica sozinha. Não precisa subir a pasta
`dist/` manualmente (ela é ignorada no Git de propósito).

### Analytics (opcional)

Em `src/_data/site.json`, no bloco `analytics`, preencha **um** dos dois:

```json
"analytics": { "plausibleDomain": "cstaticsbr.com.br", "ga4Id": "" }
```

- `plausibleDomain` → usa Plausible (sem cookies, respeita LGPD; recomendado).
- `ga4Id` → usa Google Analytics 4 (ex.: `G-XXXXXXX`).
- Ambos vazios → nenhum script de analytics é carregado.

---

## 8. Quando algo dá errado

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| `npm run build` falha citando um callout | `from`/`to` de uma lineup não existe no `mapgeo.json` | Corrija o nome ou crie o callout (seção 5) |
| Build falha citando um lineup numa execução | `throws[].lineup` aponta para um slug que não existe / outro mapa | Ajuste o slug em `executions.json` |
| Build falha por "campo obrigatório" | Faltou um campo no JSON (ex.: `slug`, `title`, `map`) | O erro diz qual campo e em qual item |
| Página nova não aparece | Esqueceu de rodar o build, ou o slug está duplicado | Rode `npm test` — ele acusa slugs repetidos |
| JSON não carrega | Vírgula sobrando ou aspas erradas no JSON | Cole o arquivo em jsonlint.com para achar o erro |

**Sempre rode `npm test` antes de commitar.** Ele faz ~1150 verificações em segundos
e é a diferença entre "publiquei conteúdo novo" e "derrubei uma página sem perceber".

---

## 9. Onde pedir ajuda ao próprio código

- Filtros e lógica de build: `.eleventy.js` (comentado em português).
- Regras de validação: `test/validate.js` (cada checagem tem uma mensagem clara).
- Estilos: `src/assets/css/` (`tactical.css` é a identidade visual principal).
