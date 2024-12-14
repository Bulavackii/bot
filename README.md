# Основные команды для работы с Node.js и PM2

## NPM команды

- **`npm run start`**  
  Запускает команду, определенную в разделе `"scripts"` файла `package.json`. Обычно используется для старта сервера или приложения в продакшн-режиме.

- **`npm install typescript ts-node @types/node @types/telegram-bot-api`**  
  Устанавливает зависимости для работы с TypeScript и Telegram Bot API:
  - **`typescript`** — компилятор TypeScript.
  - **`ts-node`** — позволяет запускать TypeScript код без предварительной компиляции.
  - **`@types/node`** — типы для работы с Node.js в TypeScript.
  - **`@types/telegram-bot-api`** — типы для Telegram Bot API в TypeScript.

---

## Команды PM2

- **`pm2 start <script>`**  
  Запускает приложение, где `<script>` — это файл (например, `app.js` или `server.js`).

- **`pm2 stop <app_name|id>`**  
  Останавливает приложение по имени или ID.

- **`pm2 restart <app_name|id>`**  
  Перезапускает приложение.

- **`pm2 list`**  
  Выводит список всех запущенных приложений.

- **`pm2 logs`**  
  Выводит логи всех процессов, управляемых PM2.

- **`pm2 save`**  
  Сохраняет текущие процессы, чтобы они автоматически запускались после перезагрузки системы.

- **`pm2 delete <app_name|id>`**  
  Удаляет приложение из PM2.

- **`pm2 monit`**  
  Открывает мониторинг процессов с показателями в реальном времени.

---
