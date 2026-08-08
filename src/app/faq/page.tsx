import type { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.3dprintingbg.com'

const FAQ_ITEMS = [
  {
    q: 'Какво е 3DPrintingBG?',
    a: 'Маркетплейс, който събира продавачи и купувачи на всичко свързано с 3D принтиране в България — филамент, принтери, готови 3D принтирани продукти, резервни части и услуги по поръчка.',
  },
  {
    q: 'Как да поръчам продукт?',
    a: 'Разгледай обявите, избери продукт и натисни "Поръчай" на страницата на обявата. Можеш да платиш директно с карта през сайта или да се разбереш с продавача за друг метод на плащане. Ако имаш въпроси преди поръчка, пиши директно на продавача през вградените съобщения.',
  },
  {
    q: 'Как да отворя онлайн магазин?',
    a: 'Регистрирай се безплатно, натисни "Отвори магазин" от менюто и попълни кратка информация — име, описание, град. Отварянето отнема няколко минути и не изисква фирма или ДДС регистрация за начало.',
  },
  {
    q: 'Колко струва да продавам в 3DPrintingBG?',
    a: 'Има безплатен план за старт с ограничен брой активни обяви. Платените планове предлагат повече активни обяви и разширени функции — виж пълните детайли в страницата "Планове".',
  },
  {
    q: 'Как се плаща на продавачите?',
    a: 'Плащанията с карта се обработват сигурно през Stripe и отиват директно към банковата сметка на продавача. Някои продавачи предлагат и алтернативни методи като наложен платеж — виж конкретната обява за наличните опции.',
  },
  {
    q: 'Мога ли да поръчам персонализиран продукт?',
    a: 'Да — много продавачи предлагат 3D печат по поръчка според твой модел или идея. Пиши директно на продавача през вградените съобщения, за да съгласувате детайли, материал и цена преди поръчка.',
  },
  {
    q: 'Какви материали се предлагат?',
    a: 'Най-често срещаните са PLA, PETG, ABS, TPU, ASA, Nylon и различни видове resin (смола). Всяка обява посочва използвания материал — виж и наръчника ни "PLA или PETG" за повече информация как да избереш.',
  },
  {
    q: 'Как да се свържа с продавач?',
    a: 'На всяка страница на обява или магазин има бутон за директно съобщение до продавача — не се налага да споделяш личен телефон или имейл, ако не искаш.',
  },
]

export const metadata: Metadata = {
  title: 'Често задавани въпроси',
  description: 'Отговори на най-честите въпроси за пазаруване и продажба в 3DPrintingBG — плащания, поръчки, отваряне на магазин и персонализация.',
  alternates: { canonical: `${SITE_URL}/faq` },
}

export default function FaqPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-3">Често задавани въпроси</h1>
        <p className="text-sm md:text-base" style={{ color: 'var(--muted)' }}>
          Всичко, което трябва да знаеш за пазаруване и продажба в 3DPrintingBG
        </p>
      </div>

      <div className="space-y-3">
        {FAQ_ITEMS.map((item, i) => (
          <details
            key={i}
            className="rounded-2xl border p-5 group"
            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
          >
            <summary className="text-sm font-bold cursor-pointer list-none flex items-center justify-between gap-3">
              {item.q}
              <span className="text-lg flex-shrink-0" style={{ color: 'var(--accent)' }}>+</span>
            </summary>
            <p className="text-sm leading-relaxed mt-3" style={{ color: 'var(--muted)' }}>{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  )
}
