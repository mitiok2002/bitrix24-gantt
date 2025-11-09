# Инструкция по деплою на Vercel

## Подготовка

### 1. Регистрация приложения в Bitrix24

1. Войдите в ваш Bitrix24 портал
2. Перейдите в раздел **Приложения** → **Разработчикам** → **Другое** → **Локальное приложение**
3. Создайте новое приложение
4. Получите **CLIENT_ID** и **CLIENT_SECRET**
5. Укажите **Путь для обработчика событий** (redirect URI):
   - Для разработки: `http://localhost:5173/auth/callback`
   - Для продакшена: `https://ваш-домен.vercel.app/auth/callback`

### 2. Установка Vercel CLI (опционально)

```bash
npm install -g vercel
```

## Деплой

### Вариант 1: Через Web Interface (рекомендуется)

1. Создайте репозиторий на GitHub и загрузите код
2. Зайдите на [vercel.com](https://vercel.com)
3. Нажмите **Add New** → **Project**
4. Импортируйте ваш GitHub репозиторий
5. Настройте переменные окружения (Environment Variables):

#### Frontend (.env переменные)
```
VITE_API_URL=https://ваш-домен.vercel.app
VITE_BITRIX24_CLIENT_ID=ваш_client_id
```

#### Backend (.env переменные)
```
BITRIX24_CLIENT_ID=ваш_client_id
BITRIX24_CLIENT_SECRET=ваш_client_secret
BITRIX24_REDIRECT_URI=https://ваш-домен.vercel.app/auth/callback
FRONTEND_URL=https://ваш-домен.vercel.app
```

6. Нажмите **Deploy**

### Вариант 2: Через CLI

1. Войдите в Vercel:
```bash
vercel login
```

2. Деплой из корневой директории проекта:
```bash
vercel
```

3. Следуйте инструкциям в терминале

4. Настройте переменные окружения:
```bash
vercel env add BITRIX24_CLIENT_ID
vercel env add BITRIX24_CLIENT_SECRET
vercel env add BITRIX24_REDIRECT_URI
vercel env add FRONTEND_URL
vercel env add VITE_API_URL
vercel env add VITE_BITRIX24_CLIENT_ID
```

5. Повторный деплой с переменными:
```bash
vercel --prod
```

## После деплоя

1. Обновите **redirect URI** в настройках приложения Bitrix24 на продакшен URL
2. Проверьте работу приложения по URL от Vercel
3. Протестируйте OAuth авторизацию

## Структура проекта для Vercel

```
/
├── backend/           # Node.js API
│   ├── api/          # Serverless functions
│   │   └── index.ts  # Entry point
│   └── src/          # Исходный код
├── frontend/         # React приложение
│   └── dist/        # Build output (после npm run build)
└── vercel.json      # Конфигурация Vercel
```

## Возможные проблемы

### CORS ошибки
Убедитесь, что `FRONTEND_URL` в backend .env правильно указывает на ваш frontend домен

### OAuth не работает
1. Проверьте, что redirect URI совпадает в Bitrix24 и в `.env`
2. Убедитесь, что CLIENT_ID и CLIENT_SECRET корректны

### Задачи не загружаются
Проверьте права приложения в Bitrix24 - нужен доступ к:
- tasks (задачи)
- user (пользователи)
- department (подразделения)

## Полезные команды

```bash
# Просмотр логов
vercel logs

# Удаление проекта
vercel remove

# Просмотр переменных окружения
vercel env ls

# Откат к предыдущей версии
vercel rollback
```

