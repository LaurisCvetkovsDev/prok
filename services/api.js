// API сервис для работы с бэкэндом
import AsyncStorage from '@react-native-async-storage/async-storage';

// ЗАМЕНИТЕ НА ВАШ ДОМЕН!
const API_BASE = 'https://yourdomain.com/api'; // Замените на ваш реальный домен

class ApiService {
  constructor() {
    this.baseURL = API_BASE;
    this.token = null;
  }

  // Загрузка токена из AsyncStorage
  async loadToken() {
    try {
      const token = await AsyncStorage.getItem('authToken');
      this.token = token;
      return token;
    } catch (error) {
      console.error('Ошибка загрузки токена:', error);
      return null;
    }
  }

  // Сохранение токена в AsyncStorage
  async saveToken(token) {
    try {
      await AsyncStorage.setItem('authToken', token);
      this.token = token;
    } catch (error) {
      console.error('Ошибка сохранения токена:', error);
    }
  }

  // Удаление токена
  async clearToken() {
    try {
      await AsyncStorage.removeItem('authToken');
      this.token = null;
    } catch (error) {
      console.error('Ошибка удаления токена:', error);
    }
  }

  // Базовый запрос
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    // Добавляем токен авторизации если есть
    if (this.token) {
      defaultOptions.headers.Authorization = `Bearer ${this.token}`;
    }

    const config = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    };

    try {
      console.log(`API запрос: ${options.method || 'GET'} ${url}`);
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`API ошибка (${endpoint}):`, error.message);
      throw error;
    }
  }

  // === АУТЕНТИФИКАЦИЯ ===

  // Регистрация
  async register(email, name, surname, password) {
    const data = await this.request('/users/register', {
      method: 'POST',
      body: JSON.stringify({ email, name, surname, password }),
    });

    if (data.token) {
      await this.saveToken(data.token);
    }

    return data;
  }

  // Авторизация
  async login(email, password) {
    const data = await this.request('/users/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (data.token) {
      await this.saveToken(data.token);
    }

    return data;
  }

  // Выход
  async logout() {
    try {
      await this.request('/users/logout', { method: 'POST' });
    } catch (error) {
      // Игнорируем ошибки при logout
    }
    await this.clearToken();
  }

  // Получение профиля
  async getProfile() {
    return await this.request('/users/profile');
  }

  // === ЗАДАЧИ ===

  // Получение всех задач
  async getTasks() {
    const data = await this.request('/tasks');
    return data.tasks || [];
  }

  // Создание задачи
  async createTask(task) {
    const data = await this.request('/tasks', {
      method: 'POST',
      body: JSON.stringify({
        id: task.id,
        title: task.title,
        description: task.description || '',
        completed: task.completed || false,
        dueDate: task.dueDate,
        dueTime: task.dueTime,
        diaryEntryId: task.diaryEntryId || null,
      }),
    });
    return data.task;
  }

  // Обновление задачи
  async updateTask(taskId, updates) {
    const data = await this.request(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return data.task;
  }

  // Удаление задачи
  async deleteTask(taskId) {
    return await this.request(`/tasks/${taskId}`, {
      method: 'DELETE',
    });
  }

  // === ДНЕВНИК ===

  // Получение всех записей
  async getDiaryEntries() {
    const data = await this.request('/diary');
    return data.entries || [];
  }

  // Создание записи
  async createDiaryEntry(entry) {
    const data = await this.request('/diary', {
      method: 'POST',
      body: JSON.stringify({
        id: entry.id,
        title: entry.title,
        text: entry.text || '',
        audioUri: entry.audioUri || null,
        transcription: entry.transcription || null,
        date: entry.date,
        categoryId: entry.categoryId || null,
        taskId: entry.taskId || null,
        isAudioProcessed: entry.isAudioProcessed || false,
        tags: entry.tags || [],
      }),
    });
    return data.entry;
  }

  // Обновление записи
  async updateDiaryEntry(entryId, updates) {
    const data = await this.request(`/diary/${entryId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return data.entry;
  }

  // Удаление записи
  async deleteDiaryEntry(entryId) {
    return await this.request(`/diary/${entryId}`, {
      method: 'DELETE',
    });
  }

  // === ФАЙЛЫ ===

  // Загрузка аудиофайла
  async uploadAudio(audioUri) {
    const formData = new FormData();
    formData.append('audio', {
      uri: audioUri,
      type: 'audio/m4a',
      name: 'recording.m4a',
    });

    const data = await this.request('/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${this.token}`,
      },
      body: formData,
    });

    return data.file;
  }

  // === ПРОВЕРКА ПОДКЛЮЧЕНИЯ ===

  // Проверка работы API
  async checkConnection() {
    try {
      const data = await this.request('');
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // === ИНИЦИАЛИЗАЦИЯ ===

  // Инициализация (загрузка токена)
  async init() {
    await this.loadToken();
    
    // Проверяем валидность токена
    if (this.token) {
      try {
        await this.getProfile();
        return true;
      } catch (error) {
        // Токен недействителен
        await this.clearToken();
        return false;
      }
    }
    return false;
  }
}

// Экспортируем единственный экземпляр
export const apiService = new ApiService();
export default apiService; 