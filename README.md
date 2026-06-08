# Pac-Toshi

> Pacman web temático Bitcoin. Construido para el **hackathon de [La Crypta](https://lacrypta.ar/)**.

Pacman es la moneda ₿ que recorre el laberinto devorando monedas fiat (€, $, £, ¥, ₽). Los rayos Lightning Network actúan como power-ups que te permiten comerte a los fantasmas (los bancos centrales que persiguen a Bitcoin).

🎮 **Juega ya:** https://pac-toshi.vercel.app/

## 🏆 Premio sorpresa en sats

Tras la premiación del **30 de junio**, quien quede **#1 en el leaderboard global** se lleva un **premio sorpresa en sats** ⚡

El ranking se construye sobre Nostr: cada score publicado es una nota firmada con `#pactoshi` (ver sección [Leaderboard sobre Nostr](#leaderboard-sobre-nostr)). El conteo final se hace tomando el mejor score por `pubkey`.

## Cómo se juega

### Teclado
- **Flechas** — mover Pacman
- **SPACE** — empezar un nivel nuevo o reiniciar tras game over

### Pantalla táctil
- **Swipe** — cambiar de dirección
- **Tap** — empezar nivel nuevo o reiniciar tras game over

## Mecánicas

- 3 niveles con dificultad progresiva (velocidad y duración de las ondas scatter/chase)
- 4 fantasmas con IA propia: scatter (esquinas), chase (persiguen a Pacman), frightened (azules y comestibles tras power-up), dead (vuelven a casa)
- Pellets fiat (€/$/£/¥/₽) — 10 puntos cada uno × multiplicador del nivel
- Lightning power-ups en las esquinas — fantasmas vulnerables durante unos segundos
- Frutas bonus aparecen al comer 60/120/150 pellets — multiplican el score
- Túnel warp en el corredor central — entras por un lado, sales por el otro
- Service Worker — instalable como PWA y jugable offline

## Stack técnico

- [Phaser 3](https://phaser.io/) (game engine)
- [TypeScript 5](https://www.typescriptlang.org/)
- [Vite 5](https://vitejs.dev/) (bundler + dev server)
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) (manifest + service worker)
- Sin assets de imagen: los sprites de Pacman, pellets y power-ups se generan en runtime con Canvas2D

## Desarrollo local

```bash
npm install
npm run dev          # localhost:3000
npm run build        # genera dist/
npm run preview      # sirve la build de producción
```

Requiere Node 18 o superior.

## Despliegue

Desplegado en Vercel: https://pac-toshi.vercel.app/

El proyecto es Vite estándar — Vercel autodetecta el framework (build `npm run build`, output `dist/`). Sin configuración adicional necesaria.

### Leaderboard sobre Nostr

La tabla de scores corre **enteramente en Nostr** — no hay servidor.

- Al registrar tu puntuación, el cliente construye un evento `kind:1` con tags `["t","pactoshi"]`, `["score","1234"]`, `["level","3"]` y `["alias","TU_NOMBRE"]`, lo firma vía **NIP-07** (`window.nostr`) y lo publica a varios relays públicos (`relay.damus.io`, `nos.lol`, `relay.primal.net`, `nostr.wine`, `relay.snort.social`).
- Para mostrar el top, el cliente consulta esos mismos relays por todos los eventos con `#t=pactoshi`, agrupa por `pubkey` y se queda con el mejor score de cada uno.

Requisito: una extensión NIP-07 ([Alby](https://getalby.com/), [nos2x](https://github.com/fiatjaf/nos2x), Flamingo, etc.). Sin ella, el overlay deshabilita el botón de publicar pero la lista global se sigue cargando para verla.

## Créditos

Este proyecto es un **fork** de [vitaliy-bobrov/pacman-pwa](https://github.com/vitaliy-bobrov/pacman-pwa) (MIT). El código original usaba Phaser 2 + Webpack 4; esta versión migra el stack a Phaser 3 + Vite + TypeScript moderno y reinterpreta el juego con tema Bitcoin para el hackathon de La Crypta.

Conservamos el tilemap del laberinto, los efectos de sonido y la estructura de la IA de fantasmas del proyecto original. Reemplazamos sprites, capa de motor, bundler y añadimos los elementos temáticos (Bitcoin, fiat, Lightning).

## Licencia

[MIT](LICENSE) — código abierto. Misma licencia que el proyecto del que es fork.
