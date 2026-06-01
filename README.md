# Rasul Proforma

Закрытая корпоративная платформа для управления клиентами, проформа‑счетами и заказами. Безопасный вход, роли (Admin / User), полностью динамические таблицы счетов в духе Airtable / Notion, цветные ячейки, экспорт в Excel с шаблонами, прикрепление файлов, тёмная тема, глобальный поиск.

> Это не интернет‑магазин и не публичный сайт. Доступ только по приглашению администратора.

---

## Возможности

- Аутентификация (JWT в httpOnly cookie, bcrypt, rate limiting, защищённые роуты, «Запомнить меня»).
- Роли: **Admin** (всё) и **User** (видит только назначенных ему клиентов).
- Дашборд: клиенты / счета / позиции / pending / completed + недавние счета.
- Клиенты: создание, поиск, сортировка, фильтр по стране, заметки, файлы.
- Счета (проформы): номер, дата, статус (Draft/Pending/Processing/Completed/Cancelled), валюта (USD/EUR/RUB/UZS/KZT/GBP/CNY/TRY).
- **Динамические колонки**: добавлять / переименовывать / переставлять / скрывать / удалять. Типы: text, number, date, select.
- **Spreadsheet‑таблица**: inline‑редактирование (double‑click), автосейв, мульти‑выбор строк/ячеек, дублирование строки, удаление, **copy / paste из буфера**, ⌘C/⌘V/Delete/Backspace.
- **Цветные ячейки** (7 цветов), хранятся в БД, сохраняются при экспорте в Excel.
- Bulk‑операции по счетам: смена статуса / удаление.
- Глобальный поиск: клиенты, счета, ячейки, заметки. Хоткей **⌘K / Ctrl+K**.
- Прикрепление файлов: PDF, XLSX/XLS, DOCX/DOC, JPG, PNG. Ограничение размера настраивается.
- **Экспорт Excel (ExcelJS)**: 3 шаблона, выбор всех/выбранных строк и колонок, auto‑filter, автоширина, перенос цветов.
- Тёмная / светлая тема с запоминанием выбора.
- Security headers, защита от XSS (React по умолчанию), валидация всех входов (zod), параметризованные запросы Prisma (защита от SQL‑injection), rate limit на логине.

## Стек

- **Frontend + Backend**: Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS.
- **DB**: PostgreSQL (prod) или SQLite (dev) через Prisma 5.
- **Auth**: JWT (`jose`) + bcryptjs, httpOnly cookies.
- **Excel**: ExcelJS.
- **Иконки**: lucide-react · Уведомления: react-hot-toast · Валидация: zod.

> Промпт изначально предлагал отдельный Express‑бэкенд. Мы используем Next.js API Routes — это та же серверная часть на Node.js, с теми же возможностями (JWT, Prisma, ExcelJS), но без второй кодовой базы и второго деплоя. Функционально эквивалентно, проще поддерживать и дешевле хостить.

---

## Локальный запуск

```bash
cp .env.example .env
# по умолчанию используется SQLite — менять ничего не нужно
npm install
npm run db:push       # создать таблицы
npm run db:seed       # создать админа (admin@example.com / admin12345)
npm run dev           # http://localhost:3000
```

Логин по умолчанию:

- email: `admin@example.com`
- пароль: `admin12345`

> Поменяйте `ADMIN_EMAIL` и `ADMIN_PASSWORD` в `.env` **до** запуска `db:seed` — это первый администратор системы.

---

## Деплой на Vercel + Neon Postgres (рекомендованный)

GitHub Pages не подходит — это серверное приложение. Используем бесплатные Vercel + Neon (или Supabase / Railway Postgres).

### 1. База: Neon (бесплатно)

1. Зарегистрируйтесь на https://neon.tech (через GitHub — быстрее всего).
2. Создайте Project → выберите регион.
3. Скопируйте connection string из вкладки **Connection Details** (формат: `postgresql://user:password@host/dbname?sslmode=require`).

### 2. Хостинг: Vercel

1. Зайдите на https://vercel.com → **Import Project** → подключите GitHub → выберите репозиторий `Rasul_Invoice`.
2. Framework Preset: **Next.js** определится автоматически. Build command и Output можно не менять.
3. В разделе **Environment Variables** добавьте:

   | Имя | Значение |
   |---|---|
   | `DATABASE_URL` | строка из Neon |
   | `JWT_SECRET` | длинная случайная строка (мин. 32 символа). Сгенерировать: `openssl rand -base64 48` |
   | `ADMIN_EMAIL` | ваш email администратора |
   | `ADMIN_PASSWORD` | начальный пароль администратора (сменить после входа в Настройках) |
   | `COOKIE_SECURE` | `true` |

4. Нажмите **Deploy**. После первого деплоя Vercel даст URL вида `https://rasul-proforma.vercel.app` — это и есть ваша ссылка на сайт.

### 3. Инициализация БД (один раз)

После первого деплоя нужно создать таблицы в Neon и админа. Самый простой способ — локально, указав production `DATABASE_URL`:

```bash
# в локальном .env временно вставьте production DATABASE_URL и ADMIN_*
DATABASE_URL="postgresql://...neon..." \
JWT_SECRET="..." \
ADMIN_EMAIL="you@company.com" \
ADMIN_PASSWORD="strong-password-here" \
npx prisma db push
npm run db:seed
```

После этого можно открыть сайт на Vercel и войти под `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

### Альтернативы

- **Railway**: тоже Next.js + встроенный Postgres, ставится в один клик.
- **Render**: то же самое.
- **Supabase**: альтернатива Neon, тоже бесплатно.

---

## Учётные записи и роли

- **Admin** — может всё: создавать/менять/удалять клиентов, проформы и колонки, управлять пользователями.
- **User** — видит только тех клиентов, которых ему назначил Admin в разделе **Настройки → Доступ к клиентам**. Может создавать и редактировать проформы и экспортировать Excel.

## Безопасность

- Пароли хэшируются bcryptjs (`cost = 10`).
- Сессии — JWT (HS256) в httpOnly cookie, SameSite=Lax, Secure в production.
- Middleware на Edge проверяет подпись сессии до доступа к страницам и API.
- Все входящие данные проходят через схемы zod.
- Все запросы к БД через Prisma (параметризованные, защита от SQL‑injection).
- React по умолчанию защищает от XSS; для отображения пользовательских строк используется текстовый вывод.
- Rate limit на `/api/auth/login` (10 попыток в минуту с IP).
- Security headers: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`.

## Структура проекта

```
prisma/
  schema.prisma       — модели User/Client/Proforma/Column/Row/Cell/Attachment
  seed.ts             — создание первого админа и демо-данных
src/
  app/
    layout.tsx        — root layout (тема, toaster)
    login/            — экран входа
    (app)/            — защищённая часть (требует session)
      layout.tsx      — sidebar + topbar
      dashboard/      — обзор и метрики
      clients/        — список клиентов и карточка клиента
        [id]/proformas/[proformaId]/ — редактор проформы (spreadsheet)
      search/         — глобальный поиск
      settings/       — управление пользователями (admin)
    api/              — REST API (Node runtime)
  components/         — Sidebar, TopBar, Modal
  lib/                — prisma, auth (JWT), rbac, excel (ExcelJS), validators (zod), utils
  middleware.ts       — авторизация на Edge
```

## Лицензия

Внутренний проект. Закрытое использование.
