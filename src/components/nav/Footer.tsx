import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { BULGARIAN_CITIES } from '@/lib/cities'

export const revalidate = 300

async function getFooterData() {
  const admin = createAdminClient()

  const [{ data: categories }, cityChecks] = await Promise.all([
    admin.from('categories').select('name, slug').is('parent_id', null).order('sort_order').limit(8),
    Promise.all(
      BULGARIAN_CITIES.slice(0, 8).map(async city => {
        const { count } = await admin
          .from('shops')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true)
          .ilike('city', `%${city.name}%`)
        return { city, has: (count ?? 0) > 0 }
      })
    ),
  ])

  const cities = cityChecks.filter(c => c.has).map(c => c.city)
  return { categories: categories ?? [], cities }
}

export async function Footer() {
  const { categories, cities } = await getFooterData()

  return (
    <footer className="border-t mt-16" style={{ borderColor: 'var(--border)', background: 'var(--bg2)' }}>
      <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div>
          <h3 className="text-sm font-bold mb-3">3DPrintingBG</h3>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
            Маркетплейс за 3D принтиране в България — филамент, принтери и 3D принтирани продукти от независими продавачи.
          </p>
        </div>

        {categories.length > 0 && (
          <div>
            <h3 className="text-sm font-bold mb-3">Категории</h3>
            <ul className="space-y-2">
              {categories.map(c => (
                <li key={c.slug}>
                  <Link href={`/category/${c.slug}`} className="text-xs hover:underline" style={{ color: 'var(--muted)' }}>
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {cities.length > 0 && (
          <div>
            <h3 className="text-sm font-bold mb-3">Градове</h3>
            <ul className="space-y-2">
              {cities.map(c => (
                <li key={c.slug}>
                  <Link href={`/grad/${c.slug}`} className="text-xs hover:underline" style={{ color: 'var(--muted)' }}>
                    3D печат в {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <h3 className="text-sm font-bold mb-3">Информация</h3>
          <ul className="space-y-2">
            <li><Link href="/stores" className="text-xs hover:underline" style={{ color: 'var(--muted)' }}>Магазини</Link></li>
            <li><Link href="/blog" className="text-xs hover:underline" style={{ color: 'var(--muted)' }}>Блог</Link></li>
            <li><Link href="/faq" className="text-xs hover:underline" style={{ color: 'var(--muted)' }}>Въпроси</Link></li>
            <li><Link href="/plans" className="text-xs hover:underline" style={{ color: 'var(--muted)' }}>Планове за продавачи</Link></li>
            <li><Link href="/terms" className="text-xs hover:underline" style={{ color: 'var(--muted)' }}>Общи условия</Link></li>
            <li><Link href="/privacy" className="text-xs hover:underline" style={{ color: 'var(--muted)' }}>Поверителност</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t py-4 px-4 text-center text-xs" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
        © {new Date().getFullYear()} 3DPrintingBG. Всички права запазени.
      </div>
    </footer>
  )
}
