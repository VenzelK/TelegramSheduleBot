# Используем официальный образ Node.js
FROM node:14

# Устанавливаем рабочую директорию в /app
WORKDIR /app

# Копируем файлы package.json и package-lock.json для установки зависимостей
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем все файлы проекта в рабочую директорию
COPY . .

# Команда для запуска бота
CMD ["nodemon", "index.mjs"]
