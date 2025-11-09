# Инструкция по запуску проекта локально

## Требования

- Node.js 18+ 
- npm или yarn
- Аккаунт Bitrix24

## Настройка

### 1. Клонирование и установка зависимостей

```bash
# Клонируйте репозиторий
git clone <repo-url>
cd GantDiagram

# Установка зависимостей backend
cd backend
npm install

# Установка зависимостей frontend
cd ../frontend
npm install --legacy-peer-deps
```

### 2. Регистрация приложения в Bitrix24

1. Войдите в ваш Bitrix24 портал
2. Перейдите: **Приложения** → **Разработчикам** → **Другое** → **Локальное приложение**
3. Создайте новое приложение
4. Получите:
   - **CLIENT_ID**
   - **CLIENT_SECRET**
5. Установите **Redirect URI**: `http://localhost:5173/auth/callback`
6. Убедитесь, что есть права на:
   - tasks (задачи)
   - user (пользователи)  
   - department (подразделения)

### 3. Конфигурация Backend

Создайте файл `/backend/.env`:

```env
PORT=3001
BITRIX24_CLIENT_ID=ваш_client_id_из_bitrix24
BITRIX24_CLIENT_SECRET=ваш_client_secret_из_bitrix24
BITRIX24_REDIRECT_URI=http://localhost:5173/auth/callback
FRONTEND_URL=http://localhost:5173
```

### 4. Конфигурация Frontend

Создайте файл `/frontend/.env`:

```env
VITE_API_URL=http://localhost:3001
VITE_BITRIX24_CLIENT_ID=ваш_client_id_из_bitrix24
```

## Запуск

### Terminal 1 - Backend

```bash
cd backend
npm run dev
```

Backend запустится на `http://localhost:3001`

### Terminal 2 - Frontend

```bash
cd frontend
npm run dev
```

Frontend запустится на `http://localhost:5173`

## Использование

1. Откройте браузер: `http://localhost:5173`
2. Введите домен вашего Bitrix24 (например: `example.bitrix24.ru`)
3. Нажмите "Войти через Bitrix24"
4. Авторизуйтесь в открывшемся окне
5. После успешной авторизации откроется главная страница с Gantt диаграммой

## Возможности

- **Фильтрация задач**: по датам, подразделениям, сотрудникам, статусам
- **Поиск**: по названию задачи
- **Масштабирование**: день, неделя, месяц
- **Дерево организации**: сворачивание/разворачивание подразделений
- **Быстрые фильтры**: неделя, месяц, квартал

## Структура данных

Приложение загружает из Bitrix24:
- Задачи с датами начала и окончания
- Структуру подразделений
- Список пользователей с привязкой к подразделениям

## Troubleshooting

### Backend не запускается
- Проверьте, что порт 3001 свободен
- Убедитесь, что .env файл создан и заполнен

### Frontend не подключается к Backend
- Проверьте, что backend запущен
- Убедитесь, что VITE_API_URL правильный

### OAuth ошибка
- Проверьте CLIENT_ID и CLIENT_SECRET
- Убедитесь, что redirect URI совпадает в Bitrix24 и в .env

### Задачи не отображаются
- Проверьте права приложения в Bitrix24
- Убедитесь, что у задач есть даты начала и окончания
- Проверьте консоль браузера на ошибки

### CORS ошибки
- Убедитесь, что FRONTEND_URL в backend .env = `http://localhost:5173`
- Перезапустите backend после изменения .env

