// Конфигурация API ключей
// В продакшн версии эти значения должны быть в переменных окружения

export const API_CONFIG = {
  // OpenAI Whisper API (рекомендуется)
  OPENAI_API_KEY: process.env.EXPO_PUBLIC_OPENAI_API_KEY || 'YOUR_OPENAI_API_KEY',
  OPENAI_API_URL: 'https://api.openai.com/v1/audio/transcriptions',
  
  // Google Speech-to-Text API
  GOOGLE_SPEECH_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_SPEECH_API_KEY || 'YOUR_GOOGLE_SPEECH_API_KEY',
  
  // AssemblyAI API (хорошая альтернатива)
  ASSEMBLYAI_API_KEY: process.env.EXPO_PUBLIC_ASSEMBLYAI_API_KEY || '713e302ed6fb4af88f618045cfdb6ba6',
  ASSEMBLYAI_API_URL: 'https://api.assemblyai.com/v2/transcript',
  
  // Azure Speech Services API
  AZURE_SPEECH_KEY: process.env.EXPO_PUBLIC_AZURE_SPEECH_KEY || 'YOUR_AZURE_SPEECH_KEY',
  AZURE_SPEECH_REGION: process.env.EXPO_PUBLIC_AZURE_SPEECH_REGION || 'eastus',
  
  // Приоритет API (какой использовать первым)
  API_PRIORITY: ['assemblyai', 'openai', 'google', 'azure'] as const,
  
  // Настройки распознавания речи
  SPEECH_CONFIG: {
    // Основной язык
    primaryLanguage: 'lv',
    
    // Альтернативные языки
    alternativeLanguages: ['en', 'ru'],
    
    // Включить автоматическую пунктуацию
    enableAutomaticPunctuation: true,
    
    // Включить оценку уверенности для слов
    enableWordConfidence: true,
    
    // Модель для использования (latest_long для длинных записей)
    model: 'latest_long',
    
    // Частота дискретизации (16kHz оптимально для речи)
    sampleRateHertz: 16000,
    
    // Кодировка аудио (M4A/AAC совместимо с AssemblyAI)
    audioEncoding: 'M4A',
  },
  
  // Настройки качества аудио
  AUDIO_QUALITY: {
    // Минимальный размер файла для хорошего качества (в байтах)
    highQualityThreshold: 200000, // 200KB
    
    // Максимальный размер файла для плохого качества
    lowQualityThreshold: 50000, // 50KB
    
    // Максимальная продолжительность записи (в секундах)
    maxRecordingDuration: 300, // 5 минут
    
    // Минимальная продолжительность для транскрипции
    minRecordingDuration: 1, // 1 секунда
    
    // Максимальный размер файла для API (в байтах)
    maxFileSize: 25 * 1024 * 1024, // 25MB
  },
  
  // Настройки локальной имитации
  LOCAL_TRANSCRIPTION: {
    // Использовать локальную имитацию вместо API
    enabled: false, // Отключаем имитацию
    
    // Время имитации обработки (в мс)
    processingDelay: 2000,
    
    // Минимальная уверенность
    minConfidence: 0.85,
    
    // Максимальная уверенность
    maxConfidence: 1.0,
  }
};

// Функция проверки доступности API
export const isOpenAIApiAvailable = (): boolean => {
  return API_CONFIG.OPENAI_API_KEY !== 'YOUR_OPENAI_API_KEY' && 
         API_CONFIG.OPENAI_API_KEY.length > 0;
};

export const isGoogleSpeechApiAvailable = (): boolean => {
  return API_CONFIG.GOOGLE_SPEECH_API_KEY !== 'YOUR_GOOGLE_SPEECH_API_KEY' && 
         API_CONFIG.GOOGLE_SPEECH_API_KEY.length > 0;
};

export const isAssemblyAIApiAvailable = (): boolean => {
  return API_CONFIG.ASSEMBLYAI_API_KEY !== 'YOUR_ASSEMBLYAI_API_KEY' && 
         API_CONFIG.ASSEMBLYAI_API_KEY.length > 0;
};

export const isAzureSpeechApiAvailable = (): boolean => {
  return API_CONFIG.AZURE_SPEECH_KEY !== 'YOUR_AZURE_SPEECH_KEY' && 
         API_CONFIG.AZURE_SPEECH_KEY.length > 0;
};

// Функция получения первого доступного API
export const getAvailableApi = (): string | null => {
  for (const api of API_CONFIG.API_PRIORITY) {
    switch (api) {
      case 'openai':
        if (isOpenAIApiAvailable()) return 'openai';
        break;
      case 'assemblyai':
        if (isAssemblyAIApiAvailable()) return 'assemblyai';
        break;
      case 'google':
        if (isGoogleSpeechApiAvailable()) return 'google';
        break;
      case 'azure':
        if (isAzureSpeechApiAvailable()) return 'azure';
        break;
    }
  }
  return null;
};

// Функция получения конфигурации для конкретного языка
export const getSpeechConfigForLanguage = (languageCode: string) => {
  return {
    ...API_CONFIG.SPEECH_CONFIG,
    primaryLanguage: languageCode,
    alternativeLanguages: API_CONFIG.SPEECH_CONFIG.alternativeLanguages.filter(
      lang => lang !== languageCode
    ),
  };
}; 