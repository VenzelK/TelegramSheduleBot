import { createRequire } from "module";

const require = createRequire(import.meta.url);

import dotenv from "dotenv";

const { Telegraf } = require("telegraf");

dotenv.config();

// Создание бота
const bot = new Telegraf(process.env.Telegram_Bot_Key);

// Приём роутов
import defineRoutes from "./controller/router.mjs";
defineRoutes(bot);

// Запуск бота
try {
  bot.launch();
} catch (err) {
  console.error("Критичекая ошибка бота: \n", err);
}

process.on("SIGINT", () => {
  // Ваш код для корректного завершения работы бота
  process.exit();
});

process.on("SIGTERM", () => {
  // Ваш код для корректного завершения работы бота
  process.exit();
});
