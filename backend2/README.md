# Backend2 (PHP)

## Endpoints

- `register.php` — регистрация пользователя (POST: email, password)
- `login.php` — вход пользователя (POST: email, password)
- `logout.php` — выход пользователя (GET/POST)
- `user.php` — получить текущего пользователя (GET)

## Пример запроса на регистрацию

```bash
curl -X POST -d "email=test@example.com&password=123456" http://your-server/backend2/register.php
```

## Пример запроса на вход

```bash
curl -X POST -d "email=test@example.com&password=123456" http://your-server/backend2/login.php
```

## Пример запроса на выход

```bash
curl http://your-server/backend2/logout.php
```

## Пример получения текущего пользователя

```bash
curl http://your-server/backend2/user.php
```
