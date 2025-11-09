# Структура проекта

Полная документация по файловой структуре проекта Bitrix24 Gantt Diagram.

## Корневая директория

```
/
├── backend/                 # Backend Node.js приложение
├── frontend/                # Frontend React приложение
├── docs/                    # Документация проекта
│   ├── README.md           # Индекс документации
│   ├── QUICKSTART.md       # Быстрый старт
│   ├── SETUP.md            # Детальная настройка
│   ├── DEPLOYMENT.md       # Инструкция по деплою
│   ├── API_EXAMPLES.md     # Примеры использования API
│   ├── PROJECT_STRUCTURE.md # Структура проекта (этот файл)
│   ├── PROJECT_SUMMARY.md  # Резюме проекта
│   ├── CONTRIBUTING.md     # Руководство для контрибьюторов
│   ├── CHANGELOG.md        # История изменений
│   └── STATUS.md           # Текущий статус
├── .vscode/                 # VS Code настройки
├── node_modules/            # Корневые зависимости
├── package.json             # Корневой package.json (для запуска обоих серверов)
├── vercel.json              # Конфигурация деплоя Vercel
├── .gitignore               # Git ignore файл
├── README.md                # Основная документация
└── LICENSE                  # Лицензия (ISC)
```

## Backend структура

```
backend/
├── src/                     # Исходный код
│   ├── index.ts            # Entry point для локальной разработки
│   └── routes/             # API маршруты
│       ├── auth.ts         # OAuth 2.0 авторизация с Bitrix24
│       └── api.ts          # Data endpoints (tasks, users, departments)
├── api/                     # Vercel serverless functions
│   └── index.ts            # Entry point для Vercel
├── node_modules/           # Зависимости
├── dist/                   # Compiled TypeScript (после build)
├── package.json            # Зависимости и скрипты
├── package-lock.json       # Lock файл npm
├── tsconfig.json           # TypeScript конфигурация
├── nodemon.json            # Nodemon конфигурация
├── vercel.json             # Vercel конфигурация для backend
├── .env.example            # Пример переменных окружения
├── .env                    # Переменные окружения (не в git)
└── .gitignore              # Backend gitignore

### Backend зависимости:
- express              # Web framework
- cors                 # CORS middleware
- axios                # HTTP клиент для Bitrix24 API
- dotenv               # Переменные окружения
- typescript           # TypeScript
- ts-node              # TypeScript execution
- nodemon              # Auto-restart при изменениях
- @types/*             # TypeScript типы
```

## Frontend структура

```
frontend/
├── src/                    # Исходный код
│   ├── main.tsx           # Entry point приложения
│   ├── App.tsx            # Корневой компонент с роутингом
│   ├── index.css          # Глобальные стили
│   │
│   ├── components/        # React компоненты
│   │   ├── LoginPage.tsx          # Страница авторизации
│   │   ├── AuthCallback.tsx       # OAuth callback обработчик
│   │   ├── GanttPage.tsx          # Главная страница с диаграммой
│   │   ├── GanttChart.tsx         # Компонент Gantt диаграммы
│   │   └── FilterPanel.tsx        # Панель фильтров
│   │
│   ├── hooks/             # Custom React hooks
│   │   └── useBitrixData.ts       # Hooks для загрузки данных из API
│   │
│   ├── stores/            # Zustand state management
│   │   ├── authStore.ts           # Хранилище авторизации
│   │   └── filterStore.ts         # Хранилище фильтров
│   │
│   ├── types/             # TypeScript типы и интерфейсы
│   │   └── index.ts               # Все типы проекта
│   │
│   ├── utils/             # Утилиты
│   │   └── dataTransform.ts       # Трансформация данных Bitrix24 -> Gantt
│   │
│   ├── api/               # API клиент
│   │   └── client.ts              # Axios клиент и API методы
│   │
│   └── assets/            # Статические ресурсы
│       └── react.svg              # Иконки
│
├── public/                # Публичные файлы
│   └── vite.svg          # Favicon
│
├── dist/                  # Build output (после npm run build)
├── node_modules/          # Зависимости
├── package.json           # Зависимости и скрипты
├── package-lock.json      # Lock файл npm
├── tsconfig.json          # TypeScript конфигурация
├── tsconfig.app.json      # TypeScript конфигурация для приложения
├── tsconfig.node.json     # TypeScript конфигурация для Vite
├── vite.config.ts         # Vite конфигурация
├── eslint.config.js       # ESLint конфигурация
├── index.html             # HTML template
├── .env.example           # Пример переменных окружения
└── .env                   # Переменные окружения (не в git)

### Frontend зависимости:
- react                     # React библиотека
- react-dom                 # React DOM
- react-router-dom          # Роутинг
- antd                      # UI библиотека
- gantt-task-react          # Gantt диаграмма
- @tanstack/react-query     # Кеширование и управление данными
- zustand                   # State management
- axios                     # HTTP клиент
- dayjs                     # Работа с датами
- typescript                # TypeScript
- vite                      # Build tool
- eslint                    # Линтер
```

## VS Code настройки

```
.vscode/
├── settings.json          # Настройки рабочего пространства
└── extensions.json        # Рекомендуемые расширения
```

## Переменные окружения

### Backend (.env)
```env
PORT=3001
BITRIX24_CLIENT_ID=xxx
BITRIX24_CLIENT_SECRET=xxx
BITRIX24_REDIRECT_URI=http://localhost:5173/auth/callback
FRONTEND_URL=http://localhost:5173
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3001
VITE_BITRIX24_CLIENT_ID=xxx
```

## Ключевые файлы

### Backend

**src/index.ts** - Entry point
- Инициализация Express
- Настройка middleware (cors, json)
- Подключение routes
- Запуск сервера

**src/routes/auth.ts** - OAuth авторизация
- GET /auth/bitrix24 - получение URL авторизации
- POST /auth/callback - обмен кода на токен
- GET /auth/token/:sessionId - получение токена по session ID
- Временное хранилище токенов (Map)

**src/routes/api.ts** - Data endpoints
- Middleware для авторизации
- GET /api/tasks - получение задач из Bitrix24
- GET /api/departments - получение подразделений
- GET /api/users - получение пользователей

### Frontend

**main.tsx** - Entry point
- Рендеринг корневого компонента
- Подключение стилей

**App.tsx** - Корневой компонент
- React Router настройка
- React Query Provider
- Ant Design ConfigProvider
- Защищенные маршруты

**components/LoginPage.tsx** - Авторизация
- Ввод домена Bitrix24
- Открытие OAuth окна
- Обработка callback
- Сохранение токена

**components/GanttPage.tsx** - Главная страница
- Загрузка данных (tasks, users, departments)
- Применение фильтров
- Layout с Sider и Content
- Header с переключателем режимов

**components/GanttChart.tsx** - Gantt диаграмма
- Интеграция gantt-task-react
- Обработка сворачивания/разворачивания
- Настройка отображения

**components/FilterPanel.tsx** - Фильтры
- DatePicker для дат
- Select для подразделений и пользователей
- Search для поиска
- Быстрые фильтры (неделя, месяц, квартал)

**hooks/useBitrixData.ts** - Data hooks
- useTasks - загрузка задач
- useUsers - загрузка пользователей
- useDepartments - загрузка подразделений
- Кеширование на 5 минут

**stores/authStore.ts** - Auth state
- Хранение sessionId, accessToken, domain
- Persist в LocalStorage
- setAuth, clearAuth методы

**stores/filterStore.ts** - Filter state
- Хранение фильтров
- collapsedIds для дерева
- Методы для изменения фильтров

**types/index.ts** - TypeScript типы
- BitrixTask, BitrixUser, BitrixDepartment
- GanttTask, Department, User, GanttRow
- FilterState, AppState, DataState

**utils/dataTransform.ts** - Трансформация данных
- transformBitrixUsers
- transformBitrixDepartments
- transformBitrixTasks
- buildDepartmentTree
- buildGanttRows
- createGanttTaskList

**api/client.ts** - API клиент
- Axios instance
- authApi (getAuthUrl, exchangeCode, getToken)
- bitrixApi (getTasks, getDepartments, getUsers)

## Потоки данных

### 1. Авторизация
```
LoginPage → authApi.getAuthUrl → Bitrix24 OAuth
↓
AuthCallback → authApi.exchangeCode → Backend /auth/callback
↓
authStore.setAuth → LocalStorage → GanttPage
```

### 2. Загрузка данных
```
GanttPage → useTasks/useUsers/useDepartments hooks
↓
bitrixApi → Backend /api/* → Bitrix24 REST API
↓
React Query cache → Transform → GanttChart
```

### 3. Фильтрация
```
FilterPanel → filterStore → GanttPage
↓
useMemo → buildGanttRows → createGanttTaskList
↓
GanttChart render
```

## Build процесс

### Backend
```bash
npm run build
# TypeScript компиляция: src/ → dist/
```

### Frontend
```bash
npm run build
# TypeScript + Vite: src/ → dist/
# Оптимизация, минификация, chunking
```

## Деплой на Vercel

1. Frontend → Static site (из dist/)
2. Backend → Serverless functions (из backend/api/)
3. Роутинг через vercel.json

## Размер проекта

- **Backend**: ~50 KB исходного кода
- **Frontend**: ~200 KB исходного кода
- **Dependencies**: ~500 MB (node_modules)
- **Build output**: ~2 MB (optimized)

