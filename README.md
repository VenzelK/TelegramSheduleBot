# Telegram Schedule Bot

Этот телеграм-бот предоставляет доступ к платформе NetCity через Telegram.

## Установка

1. Клонируйте репозиторий:

   ```bash
   git clone https://github.com/VenzelK/TelegramSheduleBot.git
   ```

2. Перейдите в директорию проекта:

   ```bash
   cd TelegramSheduleBot
   ```

3. Установите зависимости:

   ```bash
   npm install
   ```

4. Создайте файл `.env` и добавьте необходимые переменные среды:

   ```plaintext
   TELEGRAM_BOT_TOKEN=<YOUR_TELEGRAM_BOT_TOKEN>
   DataBase_Url=<YOUR_MONGODB_URL(check MongoDBWrapper for information)>
   DataBase_DBName=<YOUR_DATABASE_NAME>
   DataBase_Login=<YOUR_LOGIN_FOR_DB>
   DataBase_Password=<AND_PASSWORD>
   ```

## Запуск

```bash, zsh, fish, sh. powerShell, CMD
npm start
```
