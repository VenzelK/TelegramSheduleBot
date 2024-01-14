const fs = require("fs");
const path = require("path");

const lockFilePath = path.join(__dirname, "bot.lock");

function checkLock() {
  if (fs.existsSync(lockFilePath)) {
    console.error("Another instance of the bot is already running.");
    process.exit(1);
  }

  // Записываем файл-мьютекс, чтобы предотвратить запуск других экземпляров
  fs.writeFileSync(lockFilePath, process.pid.toString());

  // Возвращаем функцию для удаления файла-мьютекса при завершении работы
  return () => {
    fs.unlinkSync(lockFilePath);
  };
}

module.exports = { checkLock };
