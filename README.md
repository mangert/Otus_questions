# Мини-анкета

[English version](README.en.md)

Небольшое full-stack приложение для проведения анкеты. Backend отдаёт фиксированный набор вопросов, проверяет ответы и хранит принятые отправки в памяти. Frontend загружает вопросы, отображает обязательные поля и после успешной отправки показывает сообщение «Спасибо!».

## Возможности

- React-интерфейс на TypeScript с адаптивными стилями без UI-фреймворков;
- REST API на Express с общей типизацией запросов и ответов;
- проверка структуры данных, `Content-Type` и ограничения тела запроса в 32 KiB;
- обработка состояний загрузки, отправки и ошибок;
- unit-, API- и компонентные тесты на Vitest;
- локальный запуск для разработки и production-подобный запуск через Docker Compose;
- готовые Docker-образы в Git LFS и проверяющий их Bash-скрипт запуска.

## Стек

- Node.js 22+, npm workspaces, TypeScript;
- Express;
- React и Vite;
- Vitest, Supertest и React Testing Library;
- Nginx, Docker и Docker Compose.

## Архитектура

При локальной разработке браузер обращается с Vite dev server непосредственно к backend. В Docker единственной опубликованной точкой входа служит Nginx: он раздаёт frontend и проксирует `/api/*` во внутренний backend-контейнер.

```text
Локально: браузер -> Vite :5173 -> Express :3000
Docker:   браузер -> Nginx :8081 -> /api -> Express :3000
```

Основные каталоги:

```text
backend/src/       Express-приложение, конфигурация, валидация и хранилище
backend/tests/     unit- и API-тесты backend
frontend/src/      React-компоненты, API-клиент и стили
frontend/tests/    тесты API-клиента и интерфейса
shared/src/        общие TypeScript-контракты
docs/              дополнительная документация проекта
```

Полный контракт API приведён в [API_CONTRACT.md](API_CONTRACT.md).

## Требования

Для локальной разработки:

- Node.js `>=22`;
- npm, поставляемый вместе с Node.js.

Для контейнерного запуска:

- Docker Engine или Docker Desktop;
- Docker Compose v2 (`docker compose`);
- Git LFS — если используются сохранённые в репозитории образы;
- Bash и `sha256sum` либо `shasum` — если используется `start-docker.sh`;
- `curl` необязателен: без него скрипт пропустит HTTP-проверку готовности.

## Локальный запуск

```bash
git clone https://github.com/mangert/Otus_questions.git
cd Otus_questions
npm ci
npm run dev
```

После запуска доступны:

- frontend: <http://localhost:5173>;
- backend: <http://localhost:3000>;
- вопросы API: <http://localhost:3000/questions>.

Оба процесса запускаются одной командой. Для остановки нажмите `Ctrl+C`.

Локальные значения по умолчанию подходят друг другу без дополнительной настройки. При необходимости переменные можно передать через окружение:

```bash
PORT=3001 \
CORS_ORIGINS=http://localhost:5173 \
VITE_API_URL=http://localhost:3001 \
npm run dev
```

В PowerShell:

```powershell
$env:PORT = '3001'
$env:CORS_ORIGINS = 'http://localhost:5173'
$env:VITE_API_URL = 'http://localhost:3001'
npm run dev
```

## Запуск готовых Docker-образов

Образы `mini-survey-backend:latest` и `mini-survey-frontend:latest` сохранены в корне репозитория как TAR-файлы под управлением Git LFS.

```bash
git lfs install
git lfs pull
chmod +x start-docker.sh
./start-docker.sh
```

Скрипт:

1. проверяет Docker Engine и Compose v2;
2. использует уже установленные образы либо загружает недостающие из TAR-файлов;
3. перед загрузкой обнаруживает LFS-указатели и сверяет размер и SHA-256 архива;
4. запускает Compose без пересборки и выводит адрес приложения.

По умолчанию приложение открывается на <http://localhost:8081>. Для остановки и удаления контейнеров выполните:

```bash
docker compose down
```

Если TAR-файл имеет размер около 130 байт или Docker сообщает `unexpected EOF`, настоящий LFS-объект не был получен. Восстановите файлы и повторите запуск:

```bash
git lfs pull
git lfs checkout
```

## Сборка и запуск через Docker Compose

Чтобы собрать образы из исходников:

```bash
docker compose up --build --detach
```

Compose публикует только Nginx/frontend. Backend доступен контейнерам во внутренней сети на порту `3000` и не публикуется на хосте. Состояние можно посмотреть командой:

```bash
docker compose ps
```

Настройки Compose имеют рабочие значения по умолчанию. Для их изменения создайте `.env` из примера:

```bash
cp .env.example .env
```

На Windows PowerShell эквивалентная команда выглядит так:

```powershell
Copy-Item .env.example .env
```

## Переменные окружения

| Переменная      | Контекст             | Значение по умолчанию                              | Назначение                                                                  |
| --------------- | -------------------- | -------------------------------------------------- | --------------------------------------------------------------------------- |
| `PORT`          | backend, runtime     | `3000`                                             | Порт backend при локальном запуске; внутри Compose задан как `3000`.        |
| `CORS_ORIGINS`  | backend, runtime     | `http://localhost:5173,http://127.0.0.1:5173`      | Разрешённые origins через запятую для прямых браузерных запросов к backend. |
| `VITE_API_URL`  | frontend, build time | локально `http://localhost:3000`, в Compose `/api` | Базовый URL, который Vite встраивает в frontend-сборку.                     |
| `FRONTEND_PORT` | Compose, runtime     | `8081`                                             | Порт хоста, сопоставленный с Nginx.                                         |

### `VITE_API_URL` задаётся во время сборки

Vite подставляет `VITE_API_URL` в JavaScript при сборке frontend. Изменение переменной у уже запущенного контейнера не изменяет готовый bundle. После изменения `.env` frontend необходимо пересобрать:

```bash
docker compose build frontend
docker compose up --detach
```

`start-docker.sh` запускает заранее собранный образ с `VITE_API_URL=/api`. Для другого адреса API собирайте frontend из исходников через Compose.

### Настройка CORS

Для локальной разработки backend по умолчанию разрешает Vite origins `http://localhost:5173` и `http://127.0.0.1:5173`. Несколько дополнительных origins задаются через запятую без путей:

```env
CORS_ORIGINS=https://survey.example.com,http://localhost:4173
```

В стандартном Docker-сценарии браузер обращается к `/api` на том же origin, а Nginx пересылает запрос backend, поэтому дополнительная настройка CORS не требуется. Она нужна, если браузер обращается к backend напрямую с другого origin.

## Тестирование и проверки

Перед первым запуском проверок установите зависимости командой `npm ci`.

```bash
npm test
npm run lint
npm run build
npm run format:check
```

Отдельный набор тестов можно запустить для выбранного workspace:

```bash
npm test --workspace @mini-survey/backend
npm test --workspace @mini-survey/frontend
```

## API

### `GET /questions`

Возвращает от трёх до пяти объектов `{ id, text }` со статусом `200 OK`.

### `POST /answers`

Принимает JSON вида:

```json
{
  "answers": [
    { "questionId": "name", "value": "Анна" },
    { "questionId": "occupation", "value": "Разработчик" },
    { "questionId": "development-experience", "value": "Два года" },
    { "questionId": "course-expectations", "value": "Новые знания" }
  ]
}
```

Для успешной отправки нужен ровно один непустой ответ на каждый существующий вопрос. Успешный статус — `201 Created` без тела ответа. Ошибки возвращаются как `{ "error": "Описание" }` со статусом `400`, `413` или `415`.

## Хранение данных

Ответы хранятся только в массиве в памяти процесса backend. База данных и Docker volume не используются. Любая остановка или перезапуск backend, включая пересоздание либо перезапуск контейнера, полностью очищает ранее отправленные данные. Это ожидаемое поведение текущей учебной версии приложения.
