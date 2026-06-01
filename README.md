# Rasul Invoice

Лёгкий, без‑бэкендный генератор счетов (single‑page). Открывается в браузере, печатается/сохраняется в PDF через диалог печати, данные сохраняются в `localStorage`. Поддерживается импорт/экспорт JSON и несколько валют.

## Демо (GitHub Pages)

После включения Pages сайт будет доступен по адресу:

**https://akbart8.github.io/Rasul_Invoice/**

### Как включить GitHub Pages (один раз)

1. Откройте `Settings` репозитория → раздел `Pages`.
2. В блоке **Build and deployment → Source** выберите **GitHub Actions**.
3. После мерджа этой ветки в `main` запустится workflow `Deploy site to GitHub Pages` (`.github/workflows/pages.yml`) и опубликует сайт.

Прогресс сборки виден во вкладке **Actions**. После успешного запуска URL появится в Settings → Pages, а также в выводе job‑а `deploy`.

## Локальный запуск

Сайт — статический, ничего собирать не нужно. Достаточно открыть `index.html` в браузере, либо запустить простой http‑сервер:

```bash
python3 -m http.server 8000
# затем откройте http://localhost:8000
```

## Стек

- HTML + ванильный CSS + ванильный JS — без зависимостей и сборки.
- `localStorage` для автосохранения черновика.
- Печать/PDF — стандартным `window.print()` с подготовленной `@media print` вёрсткой.
