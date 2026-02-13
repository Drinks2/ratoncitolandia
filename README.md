# Landing One Page con Next.js

Proyecto base de una landing de una sola página, preparado para:

- Next.js (App Router)
- React
- TypeScript
- npm
- despliegue en Vercel

## Ejecutar en local

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`.

## Build de producción

```bash
npm run build
npm run start
```

## Conectar a tu GitHub (Drinks2)

1. Crea un repositorio nuevo en tu cuenta `https://github.com/Drinks2`.
2. En esta carpeta ejecuta:

```bash
git add .
git commit -m "feat: initial one-page landing"
git branch -M main
git remote add origin https://github.com/Drinks2/NOMBRE_DEL_REPO.git
git push -u origin main
```

## Desplegar en Vercel

1. Entra a `https://vercel.com/new`.
2. Importa el repositorio de GitHub.
3. Framework detectado: Next.js.
4. Pulsa **Deploy**.

Cada push a `main` puede desplegarse automáticamente en Vercel.
