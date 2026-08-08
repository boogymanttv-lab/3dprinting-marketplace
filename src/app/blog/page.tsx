import Link from 'next/link'
import type { Metadata } from 'next'
import { BLOG_POSTS } from '@/lib/blog-posts'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.3dprintingbg.com'

export const metadata: Metadata = {
  title: 'Блог — съвети за 3D печат',
  description: 'Наръчници и съвети за 3D печат: избор на филамент, поддръжка на принтер, цени, идеи за подаръци и как да продаваш в 3DPrintingBG.',
  alternates: { canonical: `${SITE_URL}/blog` },
}

export default function BlogIndexPage() {
  const posts = [...BLOG_POSTS].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-3">Блог</h1>
        <p className="text-sm md:text-base" style={{ color: 'var(--muted)' }}>
          Съвети, наръчници и идеи за света на 3D принтирането
        </p>
      </div>

      <div className="space-y-4">
        {posts.map(post => (
          <Link key={post.slug} href={`/blog/${post.slug}`}>
            <article
              className="rounded-2xl border p-6 transition-all hover:-translate-y-0.5"
              style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
            >
              <h2 className="text-lg font-bold mb-2">{post.title}</h2>
              <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--muted)' }}>{post.excerpt}</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>{post.readMinutes} мин. четене</p>
            </article>
          </Link>
        ))}
      </div>
    </div>
  )
}
