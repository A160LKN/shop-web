# Безопасность

## Как сообщить об уязвимости

Если вы нашли уязвимость в Дүкен (shop-web), не создавайте публичный Issue. Напишите на **aibolkazbayev@gmail.com** с темой «Дүкен (shop-web) security»: что нашли, как воспроизвести, чем это грозит. Отвечу в течение трёх дней.

## Что сделано

- Строгая CSP на Vercel: скрипты только свои, без inline; запросы — только к своему API; встраивание во фрейм запрещено.
- HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, Cross-Origin-Opener-Policy на каждой странице.
- React экранирует вывод; HTML из данных не вставляется.
- Токен хранится в localStorage — риск XSS снижен CSP; защита API (лимиты входа, роли, заголовки) — в [Shop API](https://github.com/A160LKN/shop-api/blob/main/SECURITY.md).
- Каждый CI: npm audit (уязвимые зависимости), CodeQL (анализ кода), axe (доступность в светлой и тёмной теме).
