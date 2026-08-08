import type { Metadata } from 'next'
import Link from 'next/link'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.3dprintingbg.com'

export const metadata: Metadata = {
  title: 'Безопасност — как да пазаруваш сигурно',
  description: 'Как да разпознаеш фишинг измами и да пазаруваш безопасно в 3DPrintingBG — съвети за сигурни плащания и защита на личните данни.',
  alternates: { canonical: `${SITE_URL}/safety` },
}

const SCAM_STEPS = [
  {
    n: '1',
    title: 'Ще се свържат с теб извън сайта',
    text: 'Измамниците ще се опитат да прехвърлят разговора във Viber, WhatsApp или Telegram, защото там няма следа и защита. Ще те попитат дали артикулът е наличен, често с граматически грешки, звучащи като автоматичен превод. Ще настояват за конкретен начин на доставка или плащане извън платформата.',
    warn: 'Дръж комуникацията във вградените съобщения на 3DPrintingBG — там разговорът е записан и можем да реагираме при проблем.',
  },
  {
    n: '2',
    title: 'Ще ти изпратят линк за "плащане"',
    text: 'Линкът води към фалшив сайт, който имитира куриерска фирма или платежна страница. Там ще поискат да въведеш номера на картата си, датата на изтичане и CVV кода — уж "за да получиш парите". Ако въведеш тези данни, парите ти ще бъдат откраднати.',
    warn: 'Никога не въвеждай данни на картата си в сайт, отворен от линк в чат съобщение. Плащанията в 3DPrintingBG стават само през самия сайт, никога през външни линкове.',
  },
  {
    n: '3',
    title: 'Ще те притискат да бързаш',
    text: 'Класически похват — "спешно е", "плащам веднага, само потвърди", "куриерът чака". Целта е да не ти оставят време да помислиш. На този етап прекрати разговора и докладвай потребителя.',
    warn: 'Истинските купувачи не бързат и не изискват данни на картата ти. Легитимна сделка никога не изисква спешност.',
  },
]

const RULES = [
  'С картата си можеш само да ПРАВИШ плащания — не и да получаваш пари. За получаване на пари се посочва единствено IBAN.',
  'Никога не споделяй номер на карта, дата на изтичане или CVV код — с никого, по никакъв повод.',
  'Плащай с карта само през самия сайт на 3DPrintingBG — никога през линкове, изпратени в съобщения.',
  'Дръж комуникацията във вградените съобщения на платформата.',
  'Ако обява или съобщение ти изглежда подозрително, не отговаряй и ни пиши веднага.',
]

export default function SafetyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="text-5xl mb-4">🛡️</div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-3">Пазарувай безопасно</h1>
        <p className="text-sm md:text-base" style={{ color: 'var(--muted)' }}>
          Как да разпознаеш измамите и да защитиш парите и данните си
        </p>
      </div>

      {/* What is phishing */}
      <section className="rounded-2xl border p-6 mb-8" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <h2 className="text-lg font-bold mb-3">Какво е фишинг?</h2>
        <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--muted)' }}>
          Фишингът е често срещана измама, целяща да те подмами да споделиш личните си данни — парола,
          данни от лична карта или банкова информация (номер на карта и кодове за сигурност).
        </p>
        <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--muted)' }}>
          Обикновено измамата се осъществява във Viber, WhatsApp или Telegram чрез съобщения, съдържащи линк.
          Измамникът ще настоява да кликнеш върху линка и да въведеш личните си данни, включително номер на банкова карта.
        </p>
        <p className="text-sm leading-relaxed font-semibold" style={{ color: 'var(--text)' }}>
          Ако въведеш данните си, те ще бъдат използвани, за да ти откраднат пари.
        </p>
      </section>

      {/* Scam anatomy */}
      <h2 className="text-xl font-black mb-5 text-center">Как действа схемата — стъпка по стъпка</h2>
      <div className="space-y-4 mb-10">
        {SCAM_STEPS.map(step => (
          <div key={step.n} className="rounded-2xl border p-6" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <div className="flex items-start gap-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black flex-shrink-0"
                style={{ background: 'rgba(249,115,22,0.12)', color: 'var(--accent)' }}
              >
                {step.n}
              </div>
              <div>
                <h3 className="text-base font-bold mb-2">{step.title}</h3>
                <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--muted)' }}>{step.text}</p>
                <p
                  className="text-sm leading-relaxed font-semibold rounded-lg px-4 py-3"
                  style={{ background: 'rgba(249,115,22,0.08)', color: 'var(--accent)', border: '1px solid rgba(249,115,22,0.2)' }}
                >
                  ✅ {step.warn}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Golden rules */}
      <section
        className="rounded-2xl p-6 mb-10"
        style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)' }}
      >
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <span>⚠️</span> Запомни — златните правила
        </h2>
        <ul className="space-y-3">
          {RULES.map((rule, i) => (
            <li key={i} className="text-sm leading-relaxed flex items-start gap-2.5" style={{ color: 'var(--text)' }}>
              <span className="flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }}>●</span>
              {rule}
            </li>
          ))}
        </ul>
      </section>

      {/* How payments work here */}
      <section className="rounded-2xl border p-6 mb-10" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <h2 className="text-lg font-bold mb-3">Как работят плащанията в 3DPrintingBG</h2>
        <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--muted)' }}>
          Когато плащаш с карта през сайта, данните на картата ти се обработват директно от Stripe —
          един от най-големите и сигурни платежни оператори в света. Ние никога не виждаме и не съхраняваме
          номера на картата ти.
        </p>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
          Продавачът получава парите по своята сметка, а ти получаваш потвърждение на поръчката по имейл.
          Всичко се случва в сайта — без външни линкове, без съобщения с "линкове за плащане".
        </p>
      </section>

      {/* Report CTA */}
      <div className="text-center">
        <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
          Видя ли нещо подозрително? Пиши ни веднага:
        </p>
        <a
          href="mailto:wellecfx@gmail.com?subject=Сигнал за подозрителна активност"
          className="inline-block px-6 py-3 rounded-xl font-bold text-sm"
          style={{ background: 'linear-gradient(135deg, var(--accent), #f59e0b)', color: '#fff' }}
        >
          📩 Докладвай проблем
        </a>
        <p className="text-xs mt-6" style={{ color: 'var(--muted)' }}>
          <Link href="/faq" className="hover:underline">Виж и често задаваните въпроси →</Link>
        </p>
      </div>
    </div>
  )
}
