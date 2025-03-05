import type { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Open Agents Builder',
    short_name: 'Open Agents Builder',
    description: 'Open Agents Builder - build business oriented AI agents at no-time',
    start_url: '/',
    display: 'standalone',
    background_color: '#000',
    theme_color: '#000',
    icons: [
      {
        src: '/img/OAB-Logo-Small.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/img/72.png',
        sizes: '72x72',
        type: 'image/png',
      },
      {
        src: '/img/128.png',
        sizes: '128x128',
        type: 'image/png',
      },
      {
        src: '/img/144.png',
        sizes: '144x144',
        type: 'image/png',
      },
      {
        src: '/img/180.png',
        sizes: '180x180',
        type: 'image/png',
      },
      {
        src: '/img/512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/img/1024.png',
        sizes: '1024x1024',
        type: 'image/png',
      }
    ],
  }
}