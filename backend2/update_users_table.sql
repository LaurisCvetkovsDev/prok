-- Обновление таблицы users_app для добавления полей профиля
ALTER TABLE users_app 
ADD COLUMN first_name VARCHAR(100),
ADD COLUMN last_name VARCHAR(100),
ADD COLUMN avatar_url VARCHAR(500),
ADD COLUMN bio TEXT,
ADD COLUMN phone VARCHAR(20),
ADD COLUMN birth_date DATE; 