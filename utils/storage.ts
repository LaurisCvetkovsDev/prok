import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task, DiaryEntry, Category, User } from '../types';

// Ключи для хранения
const STORAGE_KEYS = {
  TASKS: 'tasks',
  DIARY_ENTRIES: 'diaryEntries',
  CATEGORIES: 'categories',
  USER: 'user',
  IS_AUTHENTICATED: 'isAuthenticated',
};

// Функции для работы с задачами
export const saveTasks = async (tasks: Task[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  } catch (error) {
    console.error('Ошибка при сохранении задач:', error);
  }
};

export const loadTasks = async (): Promise<Task[]> => {
  try {
    const tasksJson = await AsyncStorage.getItem(STORAGE_KEYS.TASKS);
    if (tasksJson) {
      const tasks = JSON.parse(tasksJson);
      return tasks.map((task: any) => ({
        ...task,
        dueDate: new Date(task.dueDate),
      }));
    }
    return [];
  } catch (error) {
    console.error('Ошибка при загрузке задач:', error);
    return [];
  }
};

// Функции для работы с записями дневника
export const saveDiaryEntries = async (entries: DiaryEntry[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.DIARY_ENTRIES, JSON.stringify(entries));
  } catch (error) {
    console.error('Ошибка при сохранении записей дневника:', error);
  }
};

export const loadDiaryEntries = async (): Promise<DiaryEntry[]> => {
  try {
    const entriesJson = await AsyncStorage.getItem(STORAGE_KEYS.DIARY_ENTRIES);
    if (entriesJson) {
      const entries = JSON.parse(entriesJson);
      return entries.map((entry: any) => ({
        ...entry,
        date: new Date(entry.date),
      }));
    }
    return [];
  } catch (error) {
    console.error('Ошибка при загрузке записей дневника:', error);
    return [];
  }
};

// Функции для работы с категориями
export const saveCategories = async (categories: Category[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
  } catch (error) {
    console.error('Ошибка при сохранении категорий:', error);
  }
};

export const loadCategories = async (): Promise<Category[]> => {
  try {
    const categoriesJson = await AsyncStorage.getItem(STORAGE_KEYS.CATEGORIES);
    return categoriesJson ? JSON.parse(categoriesJson) : getDefaultCategories();
  } catch (error) {
    console.error('Ошибка при загрузке категорий:', error);
    return getDefaultCategories();
  }
};

// Функции для работы с пользователем
export const saveUser = async (user: User): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  } catch (error) {
    console.error('Ошибка при сохранении пользователя:', error);
  }
};

export const loadUser = async (): Promise<User | null> => {
  try {
    const userJson = await AsyncStorage.getItem(STORAGE_KEYS.USER);
    return userJson ? JSON.parse(userJson) : null;
  } catch (error) {
    console.error('Ошибка при загрузке пользователя:', error);
    return null;
  }
};

export const saveAuthStatus = async (isAuthenticated: boolean): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.IS_AUTHENTICATED, JSON.stringify(isAuthenticated));
  } catch (error) {
    console.error('Ошибка при сохранении статуса аутентификации:', error);
  }
};

export const loadAuthStatus = async (): Promise<boolean> => {
  try {
    const authJson = await AsyncStorage.getItem(STORAGE_KEYS.IS_AUTHENTICATED);
    return authJson ? JSON.parse(authJson) : false;
  } catch (error) {
    console.error('Ошибка при загрузке статуса аутентификации:', error);
    return false;
  }
};

// Функция очистки данных (для выхода из системы)
export const clearStorage = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.USER,
      STORAGE_KEYS.IS_AUTHENTICATED,
      STORAGE_KEYS.TASKS,
      STORAGE_KEYS.DIARY_ENTRIES,
    ]);
  } catch (error) {
    console.error('Ошибка при очистке данных:', error);
  }
};

// Стандартные категории
const getDefaultCategories = (): Category[] => [
  {
    id: 'work',
    name: 'Darbs',
    color: '#3B82F6',
    icon: 'briefcase',
  },
  {
    id: 'personal',
    name: 'Personīgs',
    color: '#10B981',
    icon: 'person',
  },
  {
    id: 'ideas',
    name: 'Idejas',
    color: '#F59E0B',
    icon: 'bulb',
  },
  {
    id: 'goals',
    name: 'Mērķi',
    color: '#EF4444',
    icon: 'flag',
  },
  {
    id: 'reflection',
    name: 'Refleksijas',
    color: '#8B5CF6',
    icon: 'journal',
  },
]; 