// Custom Next.js Image loader — препраща през wsrv.nl (images.weserv.nl),
// безплатен image resizing proxy без лимит по брой заявки/месец.
//
// Защо: Vercel Image Optimization на Hobby план има месечен лимит от 5 000
// уникални трансформации, който изчерпахме бързо. С custom loader Next.js
// продължава да генерира правилния responsive srcset (различни ширини за
// различни екрани), но действителното преоразмеряване се случва през
// wsrv.nl вместо през платения Vercel ендпойнт — браузърът тегли снимка с
// точния размер, в който се показва, вместо пълния оригинал.
interface LoaderParams {
  src: string
  width: number
  quality?: number
}

export default function imageLoader({ src, width, quality }: LoaderParams): string {
  // Локални файлове (напр. от /public) нямат нужда от проксиране.
  if (!src.startsWith('http')) return src

  const params = new URLSearchParams({
    url: src,
    w: String(width),
    q: String(quality ?? 75),
    output: 'webp',
  })

  return `https://wsrv.nl/?${params.toString()}`
}
