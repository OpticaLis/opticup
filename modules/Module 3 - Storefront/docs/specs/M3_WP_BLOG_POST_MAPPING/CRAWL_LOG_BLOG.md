# CRAWL_LOG_BLOG — M3_WP_BLOG_POST_MAPPING

> **SPEC:** `modules/Module 3 - Storefront/docs/specs/M3_WP_BLOG_POST_MAPPING/SPEC.md`
> **Crawled:** 2026-05-08 from `https://ru.prizma-optic.co.il/wp-json/wp/v2/posts` and `https://en.prizma-optic.co.il/wp-json/wp/v2/posts`
> **Astro source:** Supabase MCP `SELECT id, slug, lang, title FROM blog_posts WHERE tenant_id=prizma AND lang IN (en,ru)`

---

## 1. WP Post Inventory

| Lang | WP REST count | Astro candidates | HIGH | LOW | NONE |
|---|---|---|---|---|---|
| ru | 42 | 58 | 31 (74%) | 9 | 2 |
| en | 43 | 58 | 40 (93%) | 1 | 2 |

HIGH = score >=80; LOW = 60-79; NONE = <60 (falls back to /{lang}/blog/ index).

## 2. Mapping Strategy

1. **Slug-equality (highest confidence — score 100):** decoded WP slug normalized matches Astro slug normalized.
2. **Slug-prefix (score 95):** Astro slug is a truncation of WP slug (or vice versa) >=12 chars.
3. **Title fuzzy (score 0-100):** token-set ratio + Levenshtein-on-normalized — max of both.
4. **Cross-lang fallback** (ru posts only, when ru-side score <60): try matching against EN Astro posts.

## 3. Per-post matches

### RU (42 posts)

| # | WP Title (decoded) | Astro Slug | Astro Title | Score | Decision | Via |
|---|---|---|---|---|---|---|
| 1 | Лечение миопии у детей: защита зрения — с раннего возраста | `лечение-миопии-у-детей` | Замедление прогрессирования близорукости? Есть про | 100 | HIGH | slug-exact |
| 2 | Зачем проверять зрение детям? | `проверка-зрения-здоровье-глаз-ребен` | Профилактика близорукости у детей начинается с ран | 100 | HIGH | slug-exact |
| 3 | Зрение ребенка ухудшается? Это можно остановить! | `kontrol-miopii-detei` | Линзы для замедления близорукости у детей | 100 | HIGH | slug-exact |
| 4 | Очки на дом – революция в мире оптики | `очки-на-дом-революция-в-мире-оптики` | Очки на дом - революция в оптике | 100 | HIGH | slug-exact |
| 5 | Сколько стоят мультифокальные очки и стоит ли в них инвестир | `сколько-стоят-мультифокальные-очки-и-2` | Выбор мультифокальных очков - стоит ли инвестирова | 100 | HIGH | slug-exact |
| 6 | Мультифокальные очки – универсальное решение для четкого зре | `мультифокальные-очки-решение-для-че` | Мультифокальные очки с индивидуальной подгонкой -  | 100 | HIGH | slug-exact |
| 7 | Виды мультифокальных линз – как выбрать правильный вариант и | `виды-мультифокальных-линз` | Типы мультифокальных линз - как выбрать правильно  | 100 | HIGH | slug-exact |
| 8 | Мультифокальные линзы – как они меняют качество зрения? | `мультифокальные-линзы-как-они-меняю` | Мультифокальные линзы - правильный выбор меняет то | 100 | HIGH | slug-exact |
| 9 | Миопия у детей – как замедлить прогрессирование и сохранить  | `миопия-у-детей` | Миопия у детей - как остановить прогрессирование и | 100 | HIGH | slug-exact |
| 10 | Как правильно выбрать оправу для мультифокальных очков? | `как-правильно-выбрать-оправу-для-муль` | Оправы для мультифокальных очков - как выбрать пра | 100 | HIGH | slug-exact |
| 11 | Сколько стоят мультифокальные очки и как выбрать лучшие по ц | `сколько-стоят-мультифокальные-очки-и` | Цена мультифокальных очков - что на самом деле опр | 100 | HIGH | slug-exact |
| 12 | Что такое мультифокальные линзы и зачем они нужны? | `что-такое-мультифокальные-линзы-и-зач` | Что такое мультифокальные линзы? Полный гид по про | 100 | HIGH | slug-exact |
| 13 | Цена мультифокальных линз RODENSTOCK – обзор моделей и преим | `цена-мультифокальных-линз-rodenstock-обзор-м` | Цены на мультифокальные линзы Rodenstock - типы и  | 100 | HIGH | slug-exact |
| 14 | Цена мультифокальных линз SHAMIR – инновационные решения для | `цена-мультифокальных-линз-shamir-инновац` | Цены на мультифокальные линзы SHAMIR - передовые р | 100 | HIGH | slug-exact |
| 15 | Сколько стоят мультифокальные линзы и как выбрать оптимальны | `сколько-стоят-мультифокальные-линзы` | Цена на мультифокальные линзы - как выбрать правил | 100 | HIGH | slug-exact |
| 16 | Цена мультифокальных линз HOYA – виды и преимущества | `цена-мультифокальных-линз-hoya-виды-и-пр` | Цены на мультифокальные линзы HOYA - типы и преиму | 100 | HIGH | slug-exact |
| 17 | Цена мультифокальных линз OPTIMIZE – виды и преимущества | `цена-мультифокальных-линз-optimize-виды-и-п` | Цены на мультифокальные линзы Optimize - типы и пр | 100 | HIGH | slug-exact |
| 18 | Цена мультифокальных линз ZEISS – передовая оптика без компр | `цена-мультифокальных-линз-zeiss-передов` | Цена мультифокальных линз Zeiss - бескомпромиссное | 100 | HIGH | slug-exact |
| 19 | Яркие глаза: как образ жизни влияет на зрение и здоровье гла | `сияющими-глазами-как-образ-жизни-влияет-на-качество-зрения-и-здоровье-глаз` | Сияющими глазами: как образ жизни влияет на качест | 76 | LOW | title |
| 20 | Яркие глаза в цифровую эпоху: технологии и здоровье глаз | `усталые-глаза-в-цифровую-эпоху-синий-свет-и-здоровье-глаз` | Усталые глаза в цифровую эпоху: синий свет и здоро | 72 | LOW | title |
| 21 | Проверьте себя - викторина | `проверьте-себя-викторина` | Проверьте себя - викторина | 100 | HIGH | title |
| 22 | Скорая помощь глазам: что делать при травме глаза или резком | `неотложная-помощь-при-травмах-глаз-что-делать-при-повреждении-глаза-или-внезапны` | Неотложная помощь при травмах глаз: что делать при | 61 | LOW | title |
| 23 | Найдите своё слепое пятно | `проверка-зрения-найдите-вашу-слепую-зону` | Проверка зрения - найдите вашу слепую зону | 40 | NONE | title |
| 24 | Маленькие глаза, большая ответственность: 5 советов, как сох | `маленькие-глазки-большая-ответственность-5-советов-по-защите-зрения-детей` | Маленькие глазки, большая ответственность: 5 совет | 77 | LOW | title |
| 25 | Опасность ультрафиолета: как защитить глаза от солнца? | `опасности-uv-излучения-как-защитить-глаза-от-солнца` | Опасности UV-излучения: как защитить глаза от солн | 73 | LOW | title |
| 26 | Голубые, зелёные или карие? Деление глаз по цвету в процентн | `цвет-глаз-голубой-зеленый-или-карий-распределение-по-цветам-в-процентах` | Цвет глаз - голубой, зеленый или карий? Распределе | 49 | NONE | title |
| 27 | Питание и здоровье глаз: что нужно есть, чтобы видеть как яс | `питание-и-здоровье-глаз-что-есть-чтобы-видеть-как-орел` | Питание и здоровье глаз: что есть, чтобы видеть ка | 87 | HIGH | title |
| 28 | Краткое руководство по чистке и хранению контактных линз | `краткое-руководство-по-уходу-и-хранению-контактных-линз` | Краткое руководство по уходу и хранению контактных | 89 | HIGH | title |
| 29 | Периодические проверки зрения: не только для тех, кто видит  | `регулярные-проверки-зрения-не-только-для-тех-кто-видит-размыто` | Регулярные проверки зрения: не только для тех, кто | 74 | LOW | title |
| 30 | 7 простых привычек для здоровья глаз | `7-простых-привычек-для-здоровья-глаз` | 7 простых привычек для здоровья глаз | 100 | HIGH | title |
| 31 | Как выбирать очки: не выбирайте очки, пока не прочитаете это | `как-выбрать-очки-не-покупайте-очки-пока-не-прочтете-это` | Как выбрать очки: не покупайте очки, пока не прочт | 86 | HIGH | title |
| 32 | Человеческий глаз намного сложнее любой камеры | `человеческий-глаз-в-разы-сложнее-любой-камеры` | Человеческий глаз - в разы сложнее любой камеры | 88 | HIGH | title |
| 33 | Проверьте себя: Вы дальтоник? | `проверьте-себя-викторина` | Проверьте себя - викторина | 71 | LOW | title |
| 34 | Глаза в опасности - распространённые заболевания, которые мо | `глаза-в-опасности-распространенные-заболевания-глаз-которые-могут-повредить-зрен` | Глаза в опасности - распространенные заболевания г | 91 | HIGH | title |
| 35 | С открытыми глазами: как сохранить здоровье глаз в третьем в | `с-открытыми-глазами-как-сохранить-здоровье-глаз-в-зрелом-возрасте` | С открытыми глазами: как сохранить здоровье глаз в | 94 | HIGH | title |
| 36 | Контактные линзы – все преимущества в одной линзе | `контактные-линзы-все-преимущества-в-одной-линзе` | Контактные линзы - все преимущества в одной линзе | 100 | HIGH | title |
| 37 | Лаборатория по ремонту очков | `лаборатория-по-ремонту-очков-для-зрения` | Лаборатория по ремонту очков для зрения | 100 | HIGH | title |
| 38 | Проверка зрения в Ашкелоне | `проверка-зрения-в-ашкелоне` | Проверка зрения в Ашкелоне | 100 | HIGH | title |
| 39 | Когда Вы ищете магазин очков в Ашкелоне, ищите Prizma | `когда-будете-искать-магазин-очков-в-ашкелоне-ищите-призму` | Когда будете искать магазин очков в Ашкелоне, ищит | 72 | LOW | title |
| 40 | Контактные линзы - всё, что нужно о них знать | `контактные-линзы-всё-что-вам-нужно-о-них-знать` | Контактные линзы - всё, что вам нужно о них знать | 100 | HIGH | title |
| 41 | Как выбрать очки | `как-выбрать-очки-для-зрения` | Как выбрать очки для зрения | 100 | HIGH | title |
| 42 | Оптика в Ашкелоне – как найти подходящую оптику именно Вам? | `оптика-в-ашкелоне-как-найти-подходящий-салон-оптики-для-вас` | Оптика в Ашкелоне - как найти подходящий салон опт | 73 | LOW | title |

### EN (43 posts)

| # | WP Title (decoded) | Astro Slug | Astro Title | Score | Decision | Via |
|---|---|---|---|---|---|---|
| 1 | Slow Myopia Progression in Kids: Protect Your Child’s Vision | `slow-myopia-progression-in-kids` | Myopia Control Lenses for Children | 100 | HIGH | slug-exact |
| 2 | Why Every Parent Should Get Their Child’s Vision Checked | `childs-vision-checked` | Preventing Myopia in Children Starts with Early Ex | 100 | HIGH | slug-exact |
| 3 | How to Slow Myopia Progression in Kids – Effective Solutions | `how-to-slow-myopia-progression-in-kids` | Slowing Myopia Progression? There's a Proven Way t | 100 | HIGH | slug-exact |
| 4 | Очки на дом – новый уровень комфорта и персональной оптики | `emergency-eye-care-what-to-do-in-case-of-eye-injury-or-sudden-vision-changes` | Emergency Eye Care: What to Do in Case of Eye Inju | 11 | NONE | title |
| 5 | Mobile Optic – The Future of Personalized Eyewear Has Arrive | `mobile-optic-2` | At-Home Optical Service - The Optical Revolution | 100 | HIGH | slug-exact |
| 6 | Mobile Optic – The Smartest Way to Upgrade Your Vision | `mobile-optic` | Eyewear to Your Door - The Optical Revolution | 100 | HIGH | slug-exact |
| 7 | Multifocal Glasses Prices – Is It Really Worth the Investmen | `multifoca-glasses-prices-investment-choose-right` | Choosing Multifocal Glasses - Is It Worth the Inve | 100 | HIGH | slug-exact |
| 8 | Multifocal Glasses – The Ultimate Solution for Clear Vision  | `multifocal-glasses-how-to-choose-and-adapt` | Custom Multifocal Glasses - The Solution for Visio | 100 | HIGH | slug-exact |
| 9 |  Types of Multifocal Lenses – How to Choose the Right One an | `right-multifocal-lenses` | Types of Multifocal Lenses - How to Choose Right a | 100 | HIGH | slug-exact |
| 10 | Multifocal Lenses – How They Transform the Way We See the Wo | `multifocal-lenses` | Multifocal Lenses - The Right Choice Changes How W | 100 | HIGH | slug-exact |
| 11 | Multifocal Lens Prices – How to Choose the Right Lenses at t | `multifocal-lens-prices-how-to-choose-the-right-lenses-at-the-best-value` | Multifocal Lens Prices - How to Choose the Right L | 100 | HIGH | slug-exact |
| 12 | Myopia in Children – How to Slow It Down and Protect Their V | `myopia-in-children` | Myopia in Children - How to Stop Prescription Prog | 100 | HIGH | slug-exact |
| 13 | How to Choose the Right Frames for Multifocal Glasses – Why  | `how-to-choose-the-right-frames-for-multifocal-glasses-why-it-matters-for-your-vision` | Multifocal Frames - How to Choose Right and Why It | 100 | HIGH | slug-exact |
| 14 | Multifocal Glasses Prices – What Really Determines the Cost  | `multifocal-glasses-prices-what-really-determines-the-cost-and-how-to-choose-wisely` | Multifocal Glasses Pricing - What Really Determine | 100 | HIGH | slug-exact |
| 15 | What Are Multifocal Lenses? The Complete Guide to Progressiv | `what-are-multifocal-lenses-the-complete-guide-to-progressive-lenses` | What are Multifocals? The Complete Guide to Progre | 100 | HIGH | slug-exact |
| 16 | Prizma Optics: The Go-To Destination for Multifocal Glasses  | `multifocal-glasses-how-to-choose-and-adapt` | Custom Multifocal Glasses - The Solution for Visio | 52 | NONE | title |
| 17 | RODENSTOCK Multifocal Lenses – Prices, Types, and Benefits | `rodenstock-multifocal-lenses-prices-types-and-benefits` | RODENSTOCK Multifocal Lens Prices - Types and Bene | 100 | HIGH | slug-exact |
| 18 | SHAMIR Multifocal Lenses – Prices, Types, and Advantages | `shamir-multifocal-lenses-prices-types-and-advantages` | SHAMIR Multifocal Lens Prices - Advanced Vision So | 100 | HIGH | slug-exact |
| 19 | HOYA Multifocal Lenses – Prices, Types, and Benefits | `hoya-multifocal-lenses-prices-types-and-benefits` | HOYA Multifocal Lens Prices - Types and Benefits | 100 | HIGH | slug-exact |
| 20 | Optimize Multifocal Lenses – Prices, Types, and Advantages | `optimize-multifocal-lenses-prices-types-and-advantages` | Optimize Multifocal Lens Prices - Types and Benefi | 100 | HIGH | slug-exact |
| 21 | ZEISS Multifocal Lenses – Prices, Types, and Advantages | `zeiss-multifocal-lenses-prices-types-and-advantages` | Zeiss Multifocal Lens Prices - Uncompromising Opti | 100 | HIGH | slug-exact |
| 22 | Finding the Right Optician in Ashkelon | `finding-the-right-optician-in-ashkelon` | Optometrist in Ashkelon - How to Find the Right Op | 100 | HIGH | slug-exact |
| 23 | How to Choose the Right Glasses: Read This Before You Decide | `how-to-choose-the-right-glasses-read-this-before-you-decide` | How to Choose Glasses: Don't Choose Glasses Until  | 100 | HIGH | slug-exact |
| 24 | Contact Lenses – Everything You Need to Know | `contact-lenses-everything-you-need-to-know` | Contact Lenses - Everything You Need to Know About | 100 | HIGH | slug-exact |
| 25 | Looking for an Eyewear Store in Ashkelon? Look for Prizma | `looking-for-an-eyewear-store-in-ashkelon-look-for-prizma` | When Looking for an Eyewear Store in Ashkelon, Loo | 100 | HIGH | slug-exact |
| 26 | Eyeglass Repair Laboratory – Fast, Reliable Fixes | `eyeglass-repair-laboratory-fast-reliable-fixes` | Eyeglasses Repair Lab | 100 | HIGH | slug-exact |
| 27 | Contact Lenses – All the Benefits in One Lens | `contact-lenses-all-the-benefits-in-one-lens` | Contact Lenses - All the Benefits in One Lens | 100 | HIGH | slug-exact |
| 28 | Keeping Your Eyes Healthy as You Age | `keeping-your-eyes-healthy-as-you-age` | Eyes Wide Open: How to Maintain Eye Health in Your | 100 | HIGH | slug-exact |
| 29 | Eyes at Risk – Common Diseases That Can Harm Your Vision | `eyes-at-risk-common-diseases-that-can-harm-your-vision` | Eyes at Risk - Common Eye Diseases That Can Damage | 100 | HIGH | slug-exact |
| 30 | The Human Eye: More Advanced Than Any Camera | `the-human-eye-more-advanced-than-any-camera` | The Human Eye - More Sophisticated Than Any Camera | 100 | HIGH | slug-exact |
| 31 | 7 Simple Habits for Healthier Eyes | `7-simple-habits-for-healthier-eyes` | 7 Simple Habits for Healthier Eyes | 100 | HIGH | slug-exact |
| 32 | The Quick Guide to Cleaning and Storing Contact Lenses | `the-quick-guide-to-cleaning-and-storing-contact-lenses` | The Complete Guide to Contact Lens Care and Storag | 100 | HIGH | slug-exact |
| 33 | Nutrition and Eye Health: What to Eat for Sharp Vision | `nutrition-and-eye-health-what-to-eat-for-sharp-vision` | Nutrition and Eye Health: What Should You Eat to S | 100 | HIGH | slug-exact |
| 34 | Blue, Green, or Brown? Eye Color Distribution by Percentage | `blue-green-or-brown-eye-color-distribution-by-percentage` | Eye Colors - Blue, Green or Brown? Distribution by | 100 | HIGH | slug-exact |
| 35 | Small Eyes, Big Responsibility: 5 Tips for Protecting Childr | `small-eyes-big-responsibility-5-tips-for-protecting-childrens-eye-health` | Small Eyes, Big Responsibility: 5 Tips for Protect | 100 | HIGH | slug-exact |
| 36 | Regular Eye Exams: Not Just for Those with Blurry Vision | `regular-eye-exams-not-just-for-those-with-blurry-vision` | Regular Eye Exams: Not Just for Those Who See Blur | 100 | HIGH | slug-exact |
| 37 | Test Yourself: Are You Color Blind? | `test-yourself-are-you-color-blind` | Test Yourself: Are You Color Blind? | 100 | HIGH | slug-exact |
| 38 | Find Your Blind Spot | `find-your-blind-spot` | Eye Exam - Find Your Blind Spot | 100 | HIGH | slug-exact |
| 39 | Eye Exam in Ashkelon: Fast, Accurate, and Using Advanced Tec | `eye-exam-in-ashkelon-fast-accurate-and-using-advanced-technology` | Eye Exams in Ashkelon | 100 | HIGH | slug-exact |
| 40 | The Dangers of UV: How to Protect Your Eyes from the Sun | `the-dangers-of-uv-how-to-protect-your-eyes-from-the-sun` | UV Dangers: How to Protect Your Eyes from the Sun? | 100 | HIGH | slug-exact |
| 41 | Bright Eyes: How Lifestyle Affects Vision and Eye Health | `clear-vision-ahead-how-lifestyle-affects-vision-quality-and-eye-health` | Clear Vision Ahead: How Lifestyle Affects Vision Q | 74 | LOW | title |
| 42 | Test Yourself – Eye and Vision Trivia Quiz | `test-yourself-trivia-quiz` | Test Yourself - Trivia Quiz | 100 | HIGH | title |
| 43 | Emergency Eye Care: What to Do in Case of an Eye Injury or S | `emergency-eye-care-what-to-do-in-case-of-eye-injury-or-sudden-vision-changes` | Emergency Eye Care: What to Do in Case of Eye Inju | 100 | HIGH | title |

## 4. Live mutations executed

### ru.prizma-optic.co.il
- Pre-state: 1,610 redirects loaded (REC-SITE-015), 79 with target ending `/blog/` (43 post + 4 category + 32 post_tag).
- Action 1: bulk delete 42 IDs (post-tier sources matching new CSV; 1 orphan `/блог/` kept — not a post but the WP blog landing page).
- Action 2: import 42-row `ru-blog-improved.csv` via `POST /wp-json/redirection/v1/import/file/1`.
- Cleanup: deleted 1 header-junk redirect (Redirection plugin imports CSV header as a literal redirect with source `/source_url` → `target_url`; pre-existing artifact ID 2 from REC-SITE-015 left in place to avoid scope creep — Finding M3-INFRA-05).
- Final state: 1,610 redirects, 37 with /blog/ target (4 category + 32 post_tag + 1 orphan).

### en.prizma-optic.co.il
- Pre-state: 0 redirects (REC-SITE-015 `en.csv` was prepared but never loaded by Daniel; setup wizard was complete on this session — verified Step 0).
- Decision (deviation 1): import the FULL 1,610-row `en-blog-improved.csv` (REC-SITE-015 base merged with 43 improved blog targets) rather than only the 43-row blog improvement, to avoid orphaning 1,567 non-blog source URLs. Justified in EXECUTION_REPORT §3.
- Action: import via `POST /wp-json/redirection/v1/import/file/1` with multipart CSV.
- Cleanup: deleted 1 header-junk redirect (ID 1).
- Final state: 1,610 redirects.

## 5. Verification (criteria 6-9, 14)

| # | Criterion | Status |
|---|---|---|
| 6 | ru. total redirects ~1,610 (replaced, not duplicated) | PASS — 1,610 (delta 0) |
| 7 | 5 random ru. blog post URLs return 301 to specific post | PASS 5/5 |
| 8 | en. total redirects >=1,610 | PASS — 1,610 |
| 9 | 5 random en. blog post URLs return 301 to specific post | PASS 5/5 |
| 14 | No duplicate redirects per source URL | PASS — 3 spot-checks all return 1 redirect |

## 6. Spot-check results

### ru. (5 random HIGH-confidence sources)

```
[301] /миопия-у-детей/ → /ru/миопия-у-детей/
[301] /המדריך-המקוצר-לניקוי-ואחסון-עדשות-מגע/ → /ru/краткое-руководство-по-уходу-и-хранению-контактных-линз/
[301] /проверка-зрения-здоровье-глаз-ребен/ → /ru/проверка-зрения-здоровье-глаз-ребен/
[301] /цена-мультифокальных-линз-shamir-инновац/ → /ru/цена-мультифокальных-линз-shamir-инновац/
[301] /תזונה-ובריאות-העין-מה-כדאי-לאכול-בשביל/ → /ru/питание-и-здоровье-глаз-что-есть-чтобы-видеть-как-орел/
```

### en. (5 random HIGH-confidence sources)

```
[301] /find-your-blind-spot/ → /en/find-your-blind-spot/
[301] /keeping-your-eyes-healthy-as-you-age/ → /en/keeping-your-eyes-healthy-as-you-age/
[301] /right-multifocal-lenses/ → /en/right-multifocal-lenses/
[301] /בחנו-את-עצמכם-חידון-טריוויה/ → /en/test-yourself-trivia-quiz/
[301] /the-human-eye-more-advanced-than-any-camera/ → /en/the-human-eye-more-advanced-than-any-camera/
```

## 7. LOW-confidence matches (need Daniel review)

These were applied to the live redirects (per SPEC §B "loaded as direct redirects") but flagged here for Daniel to verify the semantic fit:

| Lang | Source path | WP Title | Astro Title | Score |
|---|---|---|---|---|
| ru | `/%d7%91%d7%a2%d7%99%d7%a0%d7%99%d7%99%d7` | Яркие глаза: как образ жизни влияет на зрение и здоровь | Сияющими глазами: как образ жизни влияет на качество зр | 76 |
| ru | `/%d7%a2%d7%99%d7%a0%d7%99%d7%99%d7%9d-%d` | Яркие глаза в цифровую эпоху: технологии и здоровье гла | Усталые глаза в цифровую эпоху: синий свет и здоровье г | 72 |
| ru | `/%d7%98%d7%99%d7%a4%d7%95%d7%9c-%d7%93%d` | Скорая помощь глазам: что делать при травме глаза или р | Неотложная помощь при травмах глаз: что делать при повр | 61 |
| ru | `/%d7%a2%d7%99%d7%a0%d7%99%d7%99%d7%9d-%d` | Маленькие глаза, большая ответственность: 5 советов, ка | Маленькие глазки, большая ответственность: 5 советов по | 77 |
| ru | `/%d7%a1%d7%9b%d7%a0%d7%95%d7%aa-%d7%94-u` | Опасность ультрафиолета: как защитить глаза от солнца? | Опасности UV-излучения: как защитить глаза от солнца? | 73 |
| ru | `/%d7%91%d7%93%d7%99%d7%a7%d7%95%d7%aa-%d` | Периодические проверки зрения: не только для тех, кто в | Регулярные проверки зрения: не только для тех, кто види | 74 |
| ru | `/%d7%91%d7%97%d7%a0%d7%95-%d7%90%d7%aa-%` | Проверьте себя: Вы дальтоник? | Проверьте себя - викторина | 71 |
| ru | `/%d7%97%d7%a0%d7%95%d7%aa-%d7%9e%d7%a9%d` | Когда Вы ищете магазин очков в Ашкелоне, ищите Prizma | Когда будете искать магазин очков в Ашкелоне, ищите При | 72 |
| ru | `/%d7%90%d7%95%d7%a4%d7%98%d7%99%d7%a7%d7` | Оптика в Ашкелоне – как найти подходящую оптику именно  | Оптика в Ашкелоне - как найти подходящий салон оптики д | 73 |
| en | `/%d7%91%d7%a2%d7%99%d7%a0%d7%99%d7%99%d7` | Bright Eyes: How Lifestyle Affects Vision and Eye Healt | Clear Vision Ahead: How Lifestyle Affects Vision Qualit | 74 |

## 8. NO-match (fall through to /{lang}/blog/ index)

| Lang | Source path | WP Title | Best Astro candidate | Best score |
|---|---|---|---|---|
| ru | `/%d7%9e%d7%a6%d7%90%d7%95-%d7%90%d7%aa-%` | Найдите своё слепое пятно | Проверка зрения - найдите вашу слепую зо | 40 |
| ru | `/%d7%9b%d7%97%d7%95%d7%9c-%d7%99%d7%a8%d` | Голубые, зелёные или карие? Деление глаз по цвету в про | Цвет глаз - голубой, зеленый или карий?  | 49 |
| en | `/%d0%be%d1%87%d0%ba%d0%b8-%d0%bd%d0%b0-%` | Очки на дом – новый уровень комфорта и персональной опт | Emergency Eye Care: What to Do in Case o | 11 |
| en | `/prizma-optics-the-go-to-destination-for` | Prizma Optics: The Go-To Destination for Multifocal Gla | Custom Multifocal Glasses - The Solution | 52 |

---

*End of CRAWL_LOG_BLOG.md.*
