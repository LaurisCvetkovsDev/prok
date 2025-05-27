-- Обновление таблицы tasks_app для добавления поля времени
ALTER TABLE tasks_app 
ADD COLUMN due_time TIME; 