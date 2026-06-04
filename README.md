# Bitcoin Pacman

> Pacman web temático Bitcoin. Construido para el **hackathon de [La Crypta](https://lacrypta.ar/)**.

Pacman es la moneda ₿ que recorre el laberinto devorando monedas fiat (€, $, £, ¥, ₽). Los rayos Lightning Network actúan como power-ups que te permiten comerte a los fantasmas (los bancos centrales que persiguen a Bitcoin).

🎮 **Juega ya:** https://pac-toshi.vercel.app/

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

## Créditos

Este proyecto es un **fork** de [vitaliy-bobrov/pacman-pwa](https://github.com/vitaliy-bobrov/pacman-pwa) (MIT). El código original usaba Phaser 2 + Webpack 4; esta versión migra el stack a Phaser 3 + Vite + TypeScript moderno y reinterpreta el juego con tema Bitcoin para el hackathon de La Crypta.

Conservamos el tilemap del laberinto, los efectos de sonido y la estructura de la IA de fantasmas del proyecto original. Reemplazamos sprites, capa de motor, bundler y añadimos los elementos temáticos (Bitcoin, fiat, Lightning).

## Licencia

[MIT](LICENSE) — código abierto. Misma licencia que el proyecto del que es fork.
