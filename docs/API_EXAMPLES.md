# Примеры использования API

## Backend API Endpoints

### Authentication

#### 1. Получение URL для авторизации
```bash
GET /auth/bitrix24?domain=example.bitrix24.ru
```

Ответ:
```json
{
  "authUrl": "https://example.bitrix24.ru/oauth/authorize/?client_id=..."
}
```

#### 2. Обмен кода на токен
```bash
POST /auth/callback
Content-Type: application/json

{
  "code": "authorization_code",
  "domain": "example.bitrix24.ru"
}
```

Ответ:
```json
{
  "sessionId": "session_1234567890_abc123",
  "access_token": "access_token_here"
}
```

#### 3. Получение токена по session ID
```bash
GET /auth/token/:sessionId
```

Ответ:
```json
{
  "access_token": "access_token_here",
  "refresh_token": "refresh_token_here",
  "domain": "example.bitrix24.ru"
}
```

### Data API

Все data endpoints требуют авторизации через headers:
```
Authorization: Bearer <access_token>
X-Bitrix-Domain: example.bitrix24.ru
```

#### 1. Получение задач
```bash
GET /api/tasks?start=0&limit=50
Authorization: Bearer your_access_token
X-Bitrix-Domain: example.bitrix24.ru
```

Ответ:
```json
{
  "result": {
    "tasks": [
      {
        "ID": "123",
        "TITLE": "Задача 1",
        "STATUS": "3",
        "RESPONSIBLE_ID": "1",
        "START_DATE_PLAN": "2023-11-01T00:00:00+03:00",
        "END_DATE_PLAN": "2023-11-15T00:00:00+03:00"
      }
    ]
  },
  "total": 100
}
```

#### 2. Получение подразделений
```bash
GET /api/departments
Authorization: Bearer your_access_token
X-Bitrix-Domain: example.bitrix24.ru
```

Ответ:
```json
{
  "result": [
    {
      "ID": "1",
      "NAME": "Отдел разработки",
      "PARENT": "0",
      "SORT": 500
    }
  ]
}
```

#### 3. Получение пользователей
```bash
GET /api/users?start=0
Authorization: Bearer your_access_token
X-Bitrix-Domain: example.bitrix24.ru
```

Ответ:
```json
{
  "result": [
    {
      "ID": "1",
      "NAME": "Иван",
      "LAST_NAME": "Иванов",
      "WORK_POSITION": "Разработчик",
      "UF_DEPARTMENT": ["1"],
      "ACTIVE": true
    }
  ]
}
```

## Frontend API Usage

### Пример использования API клиента

```typescript
import { authApi, bitrixApi } from './api/client';
import { useAuthStore } from './stores/authStore';

// Авторизация
const handleLogin = async (domain: string) => {
  // Получаем URL
  const { authUrl } = await authApi.getAuthUrl(domain);
  
  // Открываем окно авторизации
  const authWindow = window.open(authUrl, ...);
  
  // После получения кода
  const { sessionId, access_token } = await authApi.exchangeCode(code, domain);
  
  // Сохраняем в store
  useAuthStore.getState().setAuth(sessionId, access_token, domain);
};

// Получение данных
const loadData = async () => {
  const { accessToken, domain } = useAuthStore.getState();
  
  // Загружаем задачи
  const tasksResponse = await bitrixApi.getTasks(accessToken, domain);
  
  // Загружаем пользователей
  const usersResponse = await bitrixApi.getUsers(accessToken, domain);
  
  // Загружаем подразделения
  const deptsResponse = await bitrixApi.getDepartments(accessToken, domain);
};
```

### Пример использования hooks

```typescript
import { useTasks, useUsers, useDepartments } from './hooks/useBitrixData';

function MyComponent() {
  const { data: tasks, isLoading: tasksLoading } = useTasks();
  const { data: users, isLoading: usersLoading } = useUsers();
  const { data: departments, isLoading: deptsLoading } = useDepartments();
  
  if (tasksLoading || usersLoading || deptsLoading) {
    return <Spin />;
  }
  
  return (
    <div>
      <p>Задач: {tasks?.length}</p>
      <p>Пользователей: {users?.length}</p>
      <p>Подразделений: {departments?.length}</p>
    </div>
  );
}
```

## Тестирование API

### Использование curl

```bash
# 1. Получить URL авторизации
curl "http://localhost:3001/auth/bitrix24?domain=example.bitrix24.ru"

# 2. После авторизации обменять код на токен
curl -X POST http://localhost:3001/auth/callback \
  -H "Content-Type: application/json" \
  -d '{"code":"AUTH_CODE","domain":"example.bitrix24.ru"}'

# 3. Получить задачи
curl http://localhost:3001/api/tasks \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "X-Bitrix-Domain: example.bitrix24.ru"

# 4. Получить пользователей
curl http://localhost:3001/api/users \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "X-Bitrix-Domain: example.bitrix24.ru"

# 5. Получить подразделения
curl http://localhost:3001/api/departments \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "X-Bitrix-Domain: example.bitrix24.ru"
```

### Использование Postman

1. Импортируйте коллекцию endpoints
2. Настройте environment variables:
   - `BASE_URL`: http://localhost:3001
   - `ACCESS_TOKEN`: ваш токен
   - `DOMAIN`: ваш домен Bitrix24

3. Выполните запросы в порядке:
   - Get Auth URL
   - Exchange Code (после авторизации)
   - Get Tasks
   - Get Users
   - Get Departments

## Обработка ошибок

Все endpoints возвращают ошибки в формате:

```json
{
  "error": "Описание ошибки"
}
```

HTTP коды:
- `200` - Успех
- `400` - Неверные параметры запроса
- `401` - Не авторизован
- `404` - Ресурс не найден
- `500` - Внутренняя ошибка сервера

