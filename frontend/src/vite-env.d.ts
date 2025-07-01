/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_PORT: string
  readonly VITE_MAPBOX_TOKEN?: string
  readonly VITE_CLOUDINARY_CLOUD?: string
  readonly VITE_CLOUDINARY_KEY?: string
  readonly VITE_CDN_DOMAIN?: string
  // More env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}