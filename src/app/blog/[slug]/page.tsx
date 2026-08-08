import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { BLOG_POSTS, getBlogPostBySlug } from '@/lib/blog-posts'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.3dprintingbg.com'

export function generateStaticParams() {
  return BLOG_POSTS.map(p => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = getBlogPostBySlug(slug)
  if (!post) return { title: 'Статията не е намерена' }

  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `${SITE_URL}/blog/${slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `${SITE_URL}/blog/${slug}`,
      type: 'article',
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: '3DPrintingBG' }],
    },
    twitter: { card: 'summary_large_image', title: post.title, description: post.excerpt, images: ['/og-image.png'] },
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getBlogPostBySlug(slug)
  if (!post) notFound()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    author: { '@type': 'Organization', name: '3DPrintingBG' },
    publisher: { '@type': 'Organization', name: '3DPrintingBG' },
    mainEntityOfPage: `${SITE_URL}/blog/${slug}`,
  }

  return (
    <article className="max-w-3xl mx-auto px-4 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>
        <Link href="/" className="hover:underline">Начало</Link> / <Link href="/blog" className="hover:underline">Блог</Link>
      </p>

      <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-3">{post.title}</h1>
      <p className="text-xs mb-8" style={{ color: 'var(--muted)' }}>{post.readMinutes} мин. четене</p>

      <div className="space-y-4">
        {post.content.map((block, i) => {
          if (block.type === 'h2') {
            return <h2 key={i} className="text-lg font-bold mt-8 mb-2">{block.text}</h2>
          }
          if (block.type === 'ul') {
            return (
              <ul key={i} className="list-disc pl-5 space-y-1.5 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                {block.items.map((item, j) => <li key={j}>{item}</li>)}
              </ul>
            )
          }
          return (
            <p key={i} className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{block.text}</p>
          )
        })}
      </div>

      <div className="mt-10 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
        <Link href="/blog" className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
          ← Обратно към блога
        </Link>
      </div>
    </article>
  )
}
