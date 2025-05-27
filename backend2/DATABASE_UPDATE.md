# Обновление базы данных

## Выполните эти SQL-запросы в phpMyAdmin

### 1. Обновление таблицы tasks_app (для добавления поля времени)

```sql
ALTER TABLE tasks_app
ADD COLUMN due_time TIME;
```

### 2. Опционально: Обновление таблицы users_app (для профиля пользователя - пока не используется)

```sql
ALTER TABLE users_app
ADD COLUMN first_name VARCHAR(100),
ADD COLUMN last_name VARCHAR(100),
ADD COLUMN avatar_url VARCHAR(500),
ADD COLUMN bio TEXT,
ADD COLUMN phone VARCHAR(20),
ADD COLUMN birth_date DATE;
```

## Что изменилось

- Теперь все задачи сохраняются в базе данных для каждого пользователя отдельно
- Дневниковые записи тоже сохраняются в БД
- При перезапуске приложения все данные остаются
- Каждый пользователь видит только свои задачи и записи

## Новые API endpoints

- `tasks.php` - для работы с задачами
- `diary.php` - для работы с дневниковыми записями
- Все запросы требуют авторизации (сессии)
