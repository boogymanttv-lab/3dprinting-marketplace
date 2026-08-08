// Каталог на по-големите градове в България за локалните SEO страници (/grad/[slug]).
// name = както обикновено се въвежда от потребителите (кирилица, за ilike търсене)
// slug = латиница, за чист URL

export interface CityEntry {
  name: string
  slug: string
}

export const BULGARIAN_CITIES: CityEntry[] = [
  { name: 'София', slug: 'sofia' },
  { name: 'Пловдив', slug: 'plovdiv' },
  { name: 'Варна', slug: 'varna' },
  { name: 'Бургас', slug: 'burgas' },
  { name: 'Русе', slug: 'ruse' },
  { name: 'Стара Загора', slug: 'stara-zagora' },
  { name: 'Плевен', slug: 'pleven' },
  { name: 'Сливен', slug: 'sliven' },
  { name: 'Добрич', slug: 'dobrich' },
  { name: 'Шумен', slug: 'shumen' },
  { name: 'Перник', slug: 'pernik' },
  { name: 'Хасково', slug: 'haskovo' },
  { name: 'Ямбол', slug: 'yambol' },
  { name: 'Пазарджик', slug: 'pazardzhik' },
  { name: 'Благоевград', slug: 'blagoevgrad' },
  { name: 'Велико Търново', slug: 'veliko-tarnovo' },
  { name: 'Враца', slug: 'vratsa' },
  { name: 'Габрово', slug: 'gabrovo' },
  { name: 'Асеновград', slug: 'asenovgrad' },
  { name: 'Видин', slug: 'vidin' },
  { name: 'Казанлък', slug: 'kazanlak' },
  { name: 'Кюстендил', slug: 'kyustendil' },
  { name: 'Кърджали', slug: 'kardzhali' },
  { name: 'Монтана', slug: 'montana' },
  { name: 'Търговище', slug: 'targovishte' },
  { name: 'Силистра', slug: 'silistra' },
  { name: 'Ловеч', slug: 'lovech' },
  { name: 'Разград', slug: 'razgrad' },
  { name: 'Димитровград', slug: 'dimitrovgrad' },
  { name: 'Севлиево', slug: 'sevlievo' },
]

export function findCityBySlug(slug: string): CityEntry | undefined {
  return BULGARIAN_CITIES.find(c => c.slug === slug)
}
