import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ListingCard } from '@/components/listings/ListingCard'
import type { Listing, Category } from '@/types'
import type { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.3dprintingbg.com'

// ── Уникално SEO съдържание по категория ──────────────────────────
// Търсим по ключова дума в името, за да работи независимо от точния slug.
function getCategoryCopy(name: string): { intro: string; tips: string } {
  const n = name.toLowerCase()

  if (n.includes('принтер')) {
    return {
      intro: `Разгледай обяви за 3D принтери от продавачи и магазини в цяла България — нови и употребявани, за начинаещи и за напреднали хобисти. Тук ще намериш FDM принтери за филамент (PLA, PETG, ABS) и resin принтери за детайлна смола, директно от собственици и малки бизнеси, без посредници.`,
      tips: `Преди да купиш втора употреба принтер, провери часовете на работа, състоянието на дюзата и дали продавачът предлага гаранция или тестов печат. За нов принтер сравнявай обема на печат, скоростта и съвместимостта с материалите, които планираш да ползваш.`,
    }
  }
  if (n.includes('филамент')) {
    return {
      intro: `Купи филамент за 3D принтиране на изгодни цени от продавачи в цяла България — PLA, PETG, ABS, TPU, ASA, Nylon и специализирани материали. Всички обяви са публикувани директно от магазини и хобисти, които сами принтират и познават материалите, които продават.`,
      tips: `PLA е най-лесен за печат и подходящ за начинаещи, PETG предлага по-добра якост и устойчивост на температура, а ABS е избор за детайли, изложени на топлина или механично натоварване. Провери диаметъра (обикновено 1.75мм) преди поръчка, за да съвпада с твоя принтер.`,
    }
  }
  if (n.includes('смола') || n.includes('resin')) {
    return {
      intro: `Обяви за resin (смола) и аксесоари за детайлен 3D печат — от стандартна до водоустойчива и inженерна смола, плюс консумативи като FEP фолио, почистващи разтвори и UV лампи за втвърдяване. Идеално за миниатюри, бижута и високодетайлни модели.`,
      tips: `Работата със смола изисква проветриво помещение и защитни ръкавици/очила — тя е токсична в течно състояние. Провери срока на годност на смолата и условията на съхранение, посочени в обявата, преди да поръчаш.`,
    }
  }
  if (n.includes('изделия') || n.includes('принтиран')) {
    return {
      intro: `Готови 3D принтирани продукти от български майстори — декорации, органайзери, резервни части, играчки, бижута и персонализирани подаръци. Всеки продукт е произведен по поръчка или на склад от независим продавач, с възможност за директна комуникация за индивидуални изисквания.`,
      tips: `Много продавачи предлагат персонализация на цвят, размер или надпис — просто им пиши през вградените съобщения преди поръчка. Провери материала на изделието (PLA, PETG, resin), ако продуктът ще стои на открито или под слънце.`,
    }
  }
  if (n.includes('аксесоар')) {
    return {
      intro: `Аксесоари за 3D принтери — плотове за печат, дюзи, вентилатори, кабели, ремъци и всичко необходимо за поддръжка и ъпгрейд на принтера ти. Продавачите тук са предимно активни потребители на 3D печат, които препоръчват само изпробвани от тях части.`,
      tips: `Провери съвместимостта на аксесоара с модела на твоя принтер (напр. размер на плота за печат или диаметър на дюзата), преди да поръчаш.`,
    }
  }
  if (n.includes('резервни') || n.includes('части')) {
    return {
      intro: `Резервни части за 3D принтери — дюзи, хотенди, платки, стъпкови мотори и други компоненти за ремонт или ъпгрейд. Намери оригинални и съвместими части директно от продавачи, които сами поддържат и ремонтират принтери.`,
      tips: `Уточни модела на принтера си в съобщение до продавача, за да си сигурен, че частта е съвместима, преди да платиш.`,
    }
  }
  if (n.includes('услуг')) {
    return {
      intro: `Услуги за 3D печат по поръчка от независими майстори в цяла България — качи свой 3D модел или опиши идеята си, и получи персонализиран печат без да купуваш собствен принтер. Подходящо за прототипи, резервни части, подаръци и уникални предмети.`,
      tips: `Питай продавача за цена по обем/тегло на материала и очаквано време за изработка — те варират според сложността на модела и избрания материал.`,
    }
  }

  return {
    intro: `Разгледай обявите в категория "${name}" от продавачи и магазини за 3D печат в цяла България — директно от хора, които сами принтират и познават продуктите, които предлагат.`,
    tips: `Пиши директно на продавача през вградените съобщения за въпроси относно материал, размери или срок на изработка, преди да поръчаш.`,
  }
}

async function getCategory(slug: string) {
  const admin = createAdminClient()
  const { data } = await admin.from('categories').select('*').eq('slug', slug).maybeSingle()
  return data as Category | null
}

export async function generateStaticParams() {
  const admin = createAdminClient()
  const { data } = await admin.from('categories').select('slug').is('parent_id', null)
  return (data ?? []).map(c => ({ slug: c.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const category = await getCategory(slug)
  if (!category) return { title: 'Категорията не е намерена' }

  const { intro } = getCategoryCopy(category.name)
  const title = `${category.name} — обяви за 3D принтиране`
  const description = intro.slice(0, 155)

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/category/${slug}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/category/${slug}`,
      type: 'website',
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: '3DPrintingBG' }],
    },
    twitter: { card: 'summary_large_image', title, description, images: ['/og-image.png'] },
  }
}

export const revalidate = 300

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ sub?: string }>
}) {
  const { slug } = await params
  const { sub } = await searchParams
  const supabase = await createClient()

  const { data: allCategories } = await supabase.from('categories').select('*').order('sort_order')
  const category = allCategories?.find(c => c.slug === slug)
  if (!category || category.parent_id) notFound()

  const subCategories = (allCategories ?? []).filter(c => c.parent_id === category.id)
  const { intro, tips } = getCategoryCopy(category.name)

  let listingsQuery = supabase
    .from('listings')
    .select('*, shop:shops!inner(id, name, city, rating, is_active), category:categories(id, name, slug)')
    .eq('is_active', true)
    .eq('shop.is_active', true)
    .order('created_at', { ascending: false })
    .limit(48)

  if (sub) {
    const subCat = subCategories.find(c => c.slug === sub)
    if (subCat) listingsQuery = listingsQuery.eq('category_id', subCat.id)
  } else {
    const childIds = subCategories.map(c => c.id)
    listingsQuery = listingsQuery.in('category_id', [category.id, ...childIds])
  }

  const { data: listings } = await listingsQuery

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${category.name} — 3DPrintingBG`,
    description: intro,
    url: `${SITE_URL}/category/${slug}`,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: (listings ?? []).slice(0, 20).map((l, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${SITE_URL}/listings/${l.id}`,
        name: l.title,
      })),
    },
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Начало', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: category.name, item: `${SITE_URL}/category/${slug}` },
    ],
  }

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      {/* Hero */}
      <section
        className="border-b py-12 px-4"
        style={{ background: 'linear-gradient(180deg, rgba(249,115,22,0.06) 0%, transparent 100%)', borderColor: 'var(--border)' }}
      >
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>
            <Link href="/" className="hover:underline">Начало</Link> / {category.name}
          </p>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-3">
            {category.icon && <span className="mr-2">{category.icon}</span>}
            {category.name}
          </h1>
          <p className="text-sm md:text-base leading-relaxed" style={{ color: 'var(--muted)' }}>
            {intro}
          </p>
        </div>
      </section>

      {/* Subcategory chips */}
      {subCategories.length > 0 && (
        <div className="px-4 max-w-7xl mx-auto pt-5 flex gap-2 flex-wrap">
          <Link href={`/category/${slug}`} className="subchip" data-active={!sub ? 'true' : 'false'}>Всички</Link>
          {subCategories.map(s => (
            <Link key={s.id} href={`/category/${slug}?sub=${s.slug}`} className="subchip" data-active={sub === s.slug ? 'true' : 'false'}>
              {s.name}
            </Link>
          ))}
          <style>{`
            .subchip { display: inline-flex; align-items: center; padding: 6px 14px; border-radius: 8px; font-size: 13px; font-weight: 500; background: var(--bg2); border: 1px solid var(--border); color: var(--muted); text-decoration: none; transition: all 0.15s; }
            .subchip:hover, .subchip[data-active="true"] { background: rgba(249,115,22,0.1); border-color: var(--accent); color: var(--accent); }
          `}</style>
        </div>
      )}

      {/* Listings */}
      <div className="max-w-7xl mx-auto px-4 py-7">
        {listings && listings.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {listings.map(l => (
              <ListingCard key={l.id} listing={l as Listing} />
            ))}
          </div>
        ) : (
          <div className="text-center py-24" style={{ color: 'var(--muted)' }}>
            <div className="text-5xl mb-4">📭</div>
            <p className="font-semibold">Все още няма обяви в тази категория</p>
            <p className="text-sm mt-1">Разгледай всички обяви от началната страница</p>
          </div>
        )}
      </div>

      {/* SEO tips block */}
      <div className="max-w-3xl mx-auto px-4 pb-14">
        <div className="rounded-2xl border p-6" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-bold mb-2" style={{ color: 'var(--accent)' }}>Полезно да знаеш</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{tips}</p>
        </div>
      </div>
    </div>
  )
}
