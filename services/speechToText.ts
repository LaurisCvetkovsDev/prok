import * as FileSystem from 'expo-file-system';
import { API_CONFIG, isOpenAIApiAvailable, isAssemblyAIApiAvailable, isGoogleSpeechApiAvailable, getAvailableApi } from '../config/api';

export interface TranscriptionResult {
  success: boolean;
  text?: string;
  error?: string;
  confidence?: number;
  provider?: string;
}

// Web Speech API (бесплатно для веб-версии)
export const transcribeWithWebSpeech = async (): Promise<TranscriptionResult> => {
  return new Promise((resolve) => {
    // Проверяем поддержку Web Speech API
    if (typeof window === 'undefined' || !('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      resolve({
        success: false,
        error: 'Web Speech API не поддерживается в этом браузере',
        provider: 'Web Speech API'
      });
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    // Настройки распознавания
    recognition.lang = 'lv-LV'; // Латышский по умолчанию
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    let hasResult = false;

    // Обработчики событий
    recognition.onresult = (event: any) => {
      const result = event.results[0];
      if (result && result[0]) {
        hasResult = true;
        resolve({
          success: true,
          text: result[0].transcript,
          confidence: result[0].confidence || 0.9,
          provider: 'Web Speech API (Бесплатно)'
        });
      }
    };

    recognition.onerror = (event: any) => {
      if (hasResult) return; // Игнорируем ошибки если уже есть результат

      let errorMessage = 'Runas atpazīšanas kļūda';
      
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'Nav dzirdama runa - runājiet skaļāk';
          break;
        case 'audio-capture':
          errorMessage = 'Mikrofona problēma';
          break;
        case 'not-allowed':
          errorMessage = 'Mikrofona atļauja nav piešķirta';
          break;
        case 'network':
          errorMessage = 'Tīkla kļūda';
          break;
        case 'aborted':
          errorMessage = 'Atpazīšana pārtraukta';
          break;
        default:
          errorMessage = `Web Speech API kļūda: ${event.error}`;
      }

      resolve({
        success: false,
        error: errorMessage,
        provider: 'Web Speech API (Бесплатно)'
      });
    };

    recognition.onend = () => {
      if (!hasResult) {
        resolve({
          success: false,
          error: 'Nav atpazīta runa - mēģiniet vēlreiz',
          provider: 'Web Speech API (Бесплатно)'
        });
      }
    };

    // Начинаем распознавание
    try {
      recognition.start();
    } catch (error) {
      resolve({
        success: false,
        error: 'Neizdevās sākt runas atpazīšanu',
        provider: 'Web Speech API (Бесплатно)'
      });
    }
  });
};

// Проверка поддержки Web Speech API
export const isWebSpeechSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
};

// Функция для преобразования аудио в base64
const audioToBase64 = async (audioUri: string): Promise<string> => {
  try {
    const base64 = await FileSystem.readAsStringAsync(audioUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64;
  } catch (error) {
    throw new Error('Neizdevās konvertēt audio uz base64');
  }
};

// OpenAI Whisper API интеграция
export const transcribeWithOpenAI = async (audioUri: string, languageCode?: string): Promise<TranscriptionResult> => {
  try {
    if (!isOpenAIApiAvailable()) {
      throw new Error('OpenAI API ключ не настроен');
    }

    // Читаем файл
    const fileInfo = await FileSystem.getInfoAsync(audioUri);
    if (!fileInfo.exists) {
      throw new Error('Audio файл не найден');
    }

    // Конвертируем язык в формат OpenAI
    const language = languageCode?.split('-')[0] || 'lv'; // lv-LV -> lv

    // Создаем FormData для отправки файла
    const formData = new FormData();
    
    // Читаем файл как blob для web или используем файловую систему для мобильного
    const audioBlob = await fetch(audioUri).then(r => r.blob());
    
    formData.append('file', audioBlob, 'audio.m4a');
    formData.append('model', 'whisper-1');
    formData.append('language', language);
    formData.append('response_format', 'verbose_json');

    const response = await fetch(API_CONFIG.OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_CONFIG.OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
    }

    const result = await response.json();

    return {
      success: true,
      text: result.text,
      confidence: 0.95, // OpenAI не возвращает confidence, используем высокое значение
      provider: 'OpenAI Whisper'
    };

  } catch (error) {
    console.error('OpenAI Whisper API error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'OpenAI API kļūda',
      provider: 'OpenAI Whisper'
    };
  }
};

// AssemblyAI интеграция через HTTP (совместимо с React Native)
export const transcribeWithAssemblyAI = async (audioUri: string, languageCode?: string): Promise<TranscriptionResult> => {
  try {
    if (!isAssemblyAIApiAvailable()) {
      throw new Error('AssemblyAI API ключ не настроен');
    }

    console.log('=== AssemblyAI Debug Start ===');
    console.log('Audio URI:', audioUri);

    // Получаем информацию о файле
    const fileInfo = await FileSystem.getInfoAsync(audioUri);
    if (!fileInfo.exists) {
      throw new Error('Audio файл не найден');
    }
    
    console.log('File info:', {
      exists: fileInfo.exists,
      size: fileInfo.size,
      isDirectory: fileInfo.isDirectory,
      uri: fileInfo.uri
    });

    // Читаем файл разными способами для диагностики
    let audioData: ArrayBuffer;
    let fileSize: number = 0;
    
    try {
      // Способ 1: Через FileSystem
      console.log('Trying FileSystem.readAsStringAsync...');
      const base64Data = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      console.log('Base64 length:', base64Data.length);
      console.log('Base64 preview:', base64Data.substring(0, 100) + '...');
      
      // Конвертируем base64 в ArrayBuffer
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      audioData = bytes.buffer;
      fileSize = audioData.byteLength;
      
      console.log('✅ FileSystem method successful, size:', fileSize);
    } catch (fsError) {
      console.log('❌ FileSystem method failed:', fsError);
      console.log('Trying fetch method...');
      
      // Способ 2: Через fetch
      const audioResponse = await fetch(audioUri);
      if (!audioResponse.ok) {
        throw new Error(`Не удалось загрузить аудио файл: ${audioResponse.status}`);
      }
      audioData = await audioResponse.arrayBuffer();
      fileSize = audioData.byteLength;
      
      console.log('✅ Fetch method successful, size:', fileSize);
    }

    // Детальная проверка размера файла
    console.log('Audio data analysis:', {
      byteLength: audioData.byteLength,
      isEmpty: audioData.byteLength === 0,
      tooLarge: audioData.byteLength > 50 * 1024 * 1024
    });

    if (audioData.byteLength === 0) {
      throw new Error('Аудио файл пустой (0 байт)');
    }

    if (audioData.byteLength < 1000) {
      console.warn('⚠️ Очень маленький файл:', audioData.byteLength, 'байт');
    }

    if (audioData.byteLength > 50 * 1024 * 1024) {
      throw new Error('Аудио файл слишком большой (максимум 50MB)');
    }

    // Анализируем первые байты файла для определения формата
    const firstBytes = new Uint8Array(audioData.slice(0, 12));
    const firstBytesHex = Array.from(firstBytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
    console.log('File header (first 12 bytes):', firstBytesHex);

    // Загружаем файл в AssemblyAI
    console.log('Starting upload to AssemblyAI...');
    const uploadStartTime = Date.now();
    
    const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'authorization': API_CONFIG.ASSEMBLYAI_API_KEY,
        'content-type': 'application/octet-stream',
      },
      body: audioData,
    });

    const uploadTime = Date.now() - uploadStartTime;
    console.log(`Upload completed in ${uploadTime}ms, status:`, uploadResponse.status);

    if (!uploadResponse.ok) {
      const uploadError = await uploadResponse.text();
      console.error('❌ Upload error response:', uploadError);
      
      // Пытаемся парсить JSON ошибку
      try {
        const errorJson = JSON.parse(uploadError);
        console.error('Upload error details:', errorJson);
        throw new Error(`Upload failed: ${errorJson.error || errorJson.message || uploadError}`);
      } catch {
        throw new Error(`Upload failed (${uploadResponse.status}): ${uploadError}`);
      }
    }

    const uploadResult = await uploadResponse.json();
    console.log('✅ Upload successful:', uploadResult);

    if (!uploadResult.upload_url) {
      throw new Error('AssemblyAI не вернул URL загруженного файла');
    }

    // Определяем параметры транскрипции в зависимости от языка
    const languageParam = languageCode?.split('-')[0]; // lv-LV -> lv
    
    const transcriptParams: any = {
      audio_url: uploadResult.upload_url,
      punctuate: true,
      format_text: true,
    };

    // Языки, требующие модель nano в AssemblyAI
    const nanoLanguages = ['lv', 'et', 'lt', 'sk', 'sl', 'hr', 'bg'];

    // Если язык указан, используем его, иначе автоопределение
    if (languageParam && languageParam !== 'auto') {
      transcriptParams.language_code = languageParam;
      
      // Для некоторых языков нужна модель nano
      if (nanoLanguages.includes(languageParam)) {
        transcriptParams.speech_model = 'nano';
        console.log(`Using nano model for language: ${languageParam}`);
      }
    } else {
      transcriptParams.language_detection = true;
    }

    console.log('Starting transcription with params:', transcriptParams);

    const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'authorization': API_CONFIG.ASSEMBLYAI_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify(transcriptParams),
    });

    console.log('Transcript request status:', transcriptResponse.status);

    if (!transcriptResponse.ok) {
      const transcriptError = await transcriptResponse.text();
      console.error('❌ Transcript error response:', transcriptError);
      
      try {
        const errorJson = JSON.parse(transcriptError);
        console.error('Transcript error details:', errorJson);
        throw new Error(`Transcript failed: ${errorJson.error || errorJson.message || transcriptError}`);
      } catch {
        throw new Error(`Transcript failed (${transcriptResponse.status}): ${transcriptError}`);
      }
    }

    const transcriptResult = await transcriptResponse.json();
    console.log('✅ Transcript started:', transcriptResult);
    
    if (!transcriptResult.id) {
      throw new Error('AssemblyAI не вернул ID транскрипции');
    }
    
    const transcriptId = transcriptResult.id;
    console.log('Polling for results, ID:', transcriptId);

    // Ждем завершения с подробным логированием
    let attempts = 0;
    const maxAttempts = 20; // Уменьшил с 40 до 20 (20 * 1.5s = 30s максимум)

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log(`Checking status, attempt ${attempts + 1}/${maxAttempts}`);
      
      const statusResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: {
          'authorization': API_CONFIG.ASSEMBLYAI_API_KEY,
        },
      });

      if (!statusResponse.ok) {
        console.error('Status check failed:', statusResponse.status);
        throw new Error(`Status check error: ${statusResponse.status}`);
      }

      const statusResult = await statusResponse.json();
      console.log(`Status update:`, {
        status: statusResult.status,
        progress: statusResult.progress || 'N/A',
        created: statusResult.created,
        audio_duration: statusResult.audio_duration
      });

      if (statusResult.status === 'completed') {
        console.log('🎉 Transcription completed!');
        console.log('Result details:', {
          text_length: statusResult.text?.length || 0,
          confidence: statusResult.confidence,
          language_code: statusResult.language_code,
          audio_duration: statusResult.audio_duration
        });
        
        if (!statusResult.text || statusResult.text.trim() === '') {
          return {
            success: false,
            error: 'AssemblyAI не смог распознать речь в аудио файле (пустой результат)',
            provider: 'AssemblyAI (5h bezmaksas mēnesī)'
          };
        }
        
        console.log('=== AssemblyAI Debug End (SUCCESS) ===');
        return {
          success: true,
          text: statusResult.text,
          confidence: statusResult.confidence || 0.9,
          provider: 'AssemblyAI (5h bezmaksas mēnesī)'
        };
        
      } else if (statusResult.status === 'error') {
        console.error('❌ Processing error:', statusResult.error);
        console.log('=== AssemblyAI Debug End (ERROR) ===');
        throw new Error(statusResult.error || 'AssemblyAI processing error');
      }
      
      attempts++;
    }

    console.log('=== AssemblyAI Debug End (TIMEOUT) ===');
    throw new Error('Превышено время ожидания обработки');

  } catch (error) {
    console.error('=== AssemblyAI Error ===', error);
    console.log('=== AssemblyAI Debug End (EXCEPTION) ===');
    
    let errorMessage = 'AssemblyAI API kļūda';
    if (error instanceof Error) {
      if (error.message.includes('400')) {
        errorMessage = 'Неподдерживаемый формат аудио файла';
      } else if (error.message.includes('401') || error.message.includes('unauthorized')) {
        errorMessage = 'Неверный API ключ AssemblyAI';
      } else if (error.message.includes('payment') || error.message.includes('quota')) {
        errorMessage = 'Превышен лимит бесплатного использования (5h/месяц)';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Превышено время ожидания обработки';
      } else if (error.message.includes('upload')) {
        errorMessage = 'Ошибка загрузки аудио файла';
      } else {
        errorMessage = error.message;
      }
    }
    
    return {
      success: false,
      error: errorMessage,
      provider: 'AssemblyAI (5h bezmaksas mēnesī)'
    };
  }
};

// Google Speech-to-Text API интеграция (обновленная)
export const transcribeWithGoogle = async (audioUri: string, languageCode?: string): Promise<TranscriptionResult> => {
  try {
    if (!isGoogleSpeechApiAvailable()) {
      throw new Error('Google Speech API ключ не настроен');
    }

    // Конвертируем аудио в base64
    const audioBase64 = await audioToBase64(audioUri);

    // Подготавливаем запрос к Google Speech API
    const requestBody = {
      config: {
        encoding: 'WEBM_OPUS',
        sampleRateHertz: 48000,
        languageCode: languageCode || 'lv-LV',
        alternativeLanguageCodes: ['en-US', 'ru-RU'],
        enableAutomaticPunctuation: true,
        enableWordConfidence: true,
        model: 'latest_long',
      },
      audio: {
        content: audioBase64,
      },
    };

    const response = await fetch(
      `https://speech.googleapis.com/v1/speech:recognize?key=${API_CONFIG.GOOGLE_SPEECH_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `Google API error: ${response.status}`);
    }

    const result = await response.json();

    if (result.results && result.results.length > 0) {
      const transcript = result.results[0].alternatives[0];
      return {
        success: true,
        text: transcript.transcript,
        confidence: transcript.confidence || 0,
        provider: 'Google Speech (60min бесплатно)'
      };
    } else {
      return {
        success: false,
        error: 'Audio failā netika atpazīta runa',
        provider: 'Google Speech (60min бесплатно)'
      };
    }
  } catch (error) {
    console.error('Google Speech API error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Google Speech API kļūda',
      provider: 'Google Speech (60min бесплатно)'
    };
  }
};

// Простая локальная имитация (как fallback)
export const transcribeAudioLocal = async (audioUri: string): Promise<TranscriptionResult> => {
  try {
    // Имитация обработки
    await new Promise(resolve => setTimeout(resolve, API_CONFIG.LOCAL_TRANSCRIPTION.processingDelay));
    
    // Получаем информацию о файле
    const fileInfo = await FileSystem.getInfoAsync(audioUri);
    
    if (!fileInfo.exists) {
      return {
        success: false,
        error: 'Audio failu nav atrasts',
        provider: 'Local Mock'
      };
    }

    // Имитация результата распознавания на латышском языке
    const mockTexts = [
      'Šis ir mana dienasgrāmatas ieraksts par šodienas notikumiem un pārdomām.',
      'Šodien bija ļoti produktīva diena darbā. Izdevās pabeigt visus svarīgos uzdevumus.',
      '⚠️ IMITĀCIJA: Настройте API ключи для настоящего распознавания речи!',
      'Jāsaplāno nākamās nedēļas tikšanās un projekta uzdevumi komandai.',
      'Šī ideja varētu būt ļoti noderīga mūsu nākamajam projektam. Jāapspriež ar kolēģiem.',
      '⚠️ MOCK: Это тестовый текст! Используйте Web Speech API или настройте API.',
      'Jauna mācīšanās pieredze programmēšanā - jāizpēta šī bibliotēka tālāk.',
      'Pozitīva diena ar jauniem sasniegumiem, idejām un interesantām diskusijām.',
    ];

    const randomText = mockTexts[Math.floor(Math.random() * mockTexts.length)];
    
    // Генерируем случайную уверенность в заданном диапазоне
    const confidence = API_CONFIG.LOCAL_TRANSCRIPTION.minConfidence + 
      Math.random() * (API_CONFIG.LOCAL_TRANSCRIPTION.maxConfidence - API_CONFIG.LOCAL_TRANSCRIPTION.minConfidence);
    
    return {
      success: true,
      text: randomText,
      confidence: confidence,
      provider: 'Local Mock (Настройте API!)'
    };
  } catch (error) {
    console.error('Local transcription error:', error);
    return {
      success: false,
      error: 'Transkrīpcijas kļūda',
      provider: 'Local Mock'
    };
  }
};

// Тестовая функция для проверки API ключа AssemblyAI
export const testAssemblyAIConnection = async (): Promise<TranscriptionResult> => {
  try {
    console.log('Testing AssemblyAI API connection...');
    
    // Используем тестовый аудио файл от AssemblyAI
    const testAudioUrl = 'https://github.com/AssemblyAI-Examples/audio-examples/raw/main/20230607_me_canadian_english.wav';
    
    const transcriptParams = {
      audio_url: testAudioUrl,
      language_code: 'en',
    };

    console.log('AssemblyAI Test: Starting transcription with test file');

    const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'authorization': API_CONFIG.ASSEMBLYAI_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify(transcriptParams),
    });

    console.log('AssemblyAI Test: Response status:', transcriptResponse.status);

    if (!transcriptResponse.ok) {
      const error = await transcriptResponse.text();
      console.error('AssemblyAI Test Error:', error);
      
      if (transcriptResponse.status === 401) {
        return {
          success: false,
          error: '❌ API ключ AssemblyAI неверный или заблокирован',
          provider: 'AssemblyAI Test'
        };
      }
      
      return {
        success: false,
        error: `❌ Ошибка API: ${transcriptResponse.status} - ${error}`,
        provider: 'AssemblyAI Test'
      };
    }

    const result = await transcriptResponse.json();
    console.log('AssemblyAI Test: Transcript ID:', result.id);

    // Ждем завершения (упрощенная версия)
    let attempts = 0;
    while (attempts < 30) { // 1.5 минуты максимум для теста
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const statusResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${result.id}`, {
        headers: {
          'authorization': API_CONFIG.ASSEMBLYAI_API_KEY,
        },
      });

      const status = await statusResponse.json();
      console.log('AssemblyAI Test: Status:', status.status);

      if (status.status === 'completed') {
        return {
          success: true,
          text: `✅ API работает! Тест: "${status.text?.substring(0, 100)}..."`,
          confidence: 1.0,
          provider: 'AssemblyAI Test'
        };
      } else if (status.status === 'error') {
        return {
          success: false,
          error: `❌ Ошибка обработки: ${status.error}`,
          provider: 'AssemblyAI Test'
        };
      }
      
      attempts++;
    }

    return {
      success: false,
      error: '⏱️ Тест превысил время ожидания',
      provider: 'AssemblyAI Test'
    };

  } catch (error) {
    console.error('AssemblyAI Test Error:', error);
    return {
      success: false,
      error: `❌ Ошибка соединения: ${error instanceof Error ? error.message : 'Unknown error'}`,
      provider: 'AssemblyAI Test'
    };
  }
};

// Основная функция для преобразования речи в текст
export const transcribeAudio = async (audioUri: string, languageCode?: string, useWebSpeech?: boolean): Promise<TranscriptionResult> => {
  // Если включена локальная имитация, используем её
  if (API_CONFIG.LOCAL_TRANSCRIPTION.enabled) {
    return transcribeAudioLocal(audioUri);
  }

  // Если запрошен Web Speech API и он поддерживается
  if (useWebSpeech && isWebSpeechSupported()) {
    return transcribeWithWebSpeech();
  }

  // Получаем первый доступный API
  const availableApi = getAvailableApi();

  if (!availableApi) {
    // Если нет API ключей, пробуем Web Speech API
    if (isWebSpeechSupported()) {
      console.log('No API keys, trying Web Speech API');
      return transcribeWithWebSpeech();
    }
    
    console.warn('No API keys configured and Web Speech not supported, falling back to local mock');
    return transcribeAudioLocal(audioUri);
  }

  // Используем доступный API
  switch (availableApi) {
    case 'openai':
      return transcribeWithOpenAI(audioUri, languageCode);
    case 'assemblyai':
      return transcribeWithAssemblyAI(audioUri, languageCode);
    case 'google':
      return transcribeWithGoogle(audioUri, languageCode);
    default:
      console.warn(`Unknown API: ${availableApi}, falling back to local mock`);
      return transcribeAudioLocal(audioUri);
  }
};

// Функция для получения поддерживаемых языков
export const getSupportedLanguages = () => {
  return [
    { code: 'lv', name: 'Latviešu', flag: '🇱🇻', whisperCode: 'lv', googleCode: 'lv-LV', assemblyCode: 'lv' },
    { code: 'en', name: 'English', flag: '🇺🇸', whisperCode: 'en', googleCode: 'en-US', assemblyCode: 'en' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺', whisperCode: 'ru', googleCode: 'ru-RU', assemblyCode: 'ru' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪', whisperCode: 'de', googleCode: 'de-DE', assemblyCode: 'de' },
    { code: 'fr', name: 'Français', flag: '🇫🇷', whisperCode: 'fr', googleCode: 'fr-FR', assemblyCode: 'fr' },
    { code: 'es', name: 'Español', flag: '🇪🇸', whisperCode: 'es', googleCode: 'es-ES', assemblyCode: 'es' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹', whisperCode: 'it', googleCode: 'it-IT', assemblyCode: 'it' },
    { code: 'pt', name: 'Português', flag: '🇵🇹', whisperCode: 'pt', googleCode: 'pt-PT', assemblyCode: 'pt' },
    { code: 'nl', name: 'Nederlands', flag: '🇳🇱', whisperCode: 'nl', googleCode: 'nl-NL', assemblyCode: 'nl' },
    { code: 'pl', name: 'Polski', flag: '🇵🇱', whisperCode: 'pl', googleCode: 'pl-PL', assemblyCode: 'pl' },
    { code: 'sv', name: 'Svenska', flag: '🇸🇪', whisperCode: 'sv', googleCode: 'sv-SE', assemblyCode: 'sv' },
    { code: 'da', name: 'Dansk', flag: '🇩🇰', whisperCode: 'da', googleCode: 'da-DK', assemblyCode: 'da' },
    { code: 'no', name: 'Norsk', flag: '🇳🇴', whisperCode: 'no', googleCode: 'no-NO', assemblyCode: 'no' },
    { code: 'fi', name: 'Suomi', flag: '🇫🇮', whisperCode: 'fi', googleCode: 'fi-FI', assemblyCode: 'fi' },
    { code: 'et', name: 'Eesti', flag: '🇪🇪', whisperCode: 'et', googleCode: 'et-EE', assemblyCode: 'et' },
    { code: 'lt', name: 'Lietuvių', flag: '🇱🇹', whisperCode: 'lt', googleCode: 'lt-LT', assemblyCode: 'lt' },
  ];
};

// Функция для определения качества аудио
export const analyzeAudioQuality = async (audioUri: string): Promise<{
  duration: number;
  fileSize: number;
  quality: 'low' | 'medium' | 'high';
  recommendation?: string;
}> => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(audioUri);
    
    if (!fileInfo.exists) {
      throw new Error('Audio failu nav atrasts');
    }

    const fileSize = fileInfo.size || 0;
    const estimatedDuration = fileSize / (32000); // Примерная оценка для 32kb/s
    
    let quality: 'low' | 'medium' | 'high' = 'medium';
    let recommendation: string | undefined;
    
    if (fileSize < API_CONFIG.AUDIO_QUALITY.lowQualityThreshold) {
      quality = 'low';
      recommendation = 'Ierakstiet ilgāku audio labākai atpazīšanai';
    } else if (fileSize > API_CONFIG.AUDIO_QUALITY.highQualityThreshold) {
      quality = 'high';
      recommendation = 'Lieliska kvalitāte teksta atpazīšanai';
    } else {
      recommendation = 'Laba kvalitāte teksta atpazīšanai';
    }

    // Проверяем минимальную длительность
    if (estimatedDuration < API_CONFIG.AUDIO_QUALITY.minRecordingDuration) {
      quality = 'low';
      recommendation = 'Audio ir pārāk īss kvalitatīvai atpazīšanai';
    }

    return {
      duration: estimatedDuration,
      fileSize,
      quality,
      recommendation,
    };
  } catch (error) {
    console.error('Audio quality analysis error:', error);
    return {
      duration: 0,
      fileSize: 0,
      quality: 'low',
      recommendation: 'Neizdevās analizēt audio kvalitāti',
    };
  }
};

// Функция для валидации аудио файла перед транскрипцией
export const validateAudioForTranscription = async (audioUri: string): Promise<{
  isValid: boolean;
  error?: string;
  warnings?: string[];
}> => {
  try {
    const quality = await analyzeAudioQuality(audioUri);
    const warnings: string[] = [];

    // Проверяем минимальную длительность
    if (quality.duration < API_CONFIG.AUDIO_QUALITY.minRecordingDuration) {
      return {
        isValid: false,
        error: 'Audio ir pārāk īss atpazīšanai (minimums 1 sekunde)',
      };
    }

    // Проверяем максимальную длительность
    if (quality.duration > API_CONFIG.AUDIO_QUALITY.maxRecordingDuration) {
      return {
        isValid: false,
        error: 'Audio ir pārāk garš atpazīšanai (maksimums 5 minūtes)',
      };
    }

    // Проверяем размер файла
    if (quality.fileSize > API_CONFIG.AUDIO_QUALITY.maxFileSize) {
      return {
        isValid: false,
        error: 'Audio fails ir pārāk liels (maksimums 25MB)',
      };
    }

    // Добавляем предупреждения
    if (quality.quality === 'low') {
      warnings.push('Zema audio kvalitāte var ietekmēt atpazīšanas precizitāti');
    }

    if (quality.fileSize < 10000) { // < 10KB
      warnings.push('Ļoti mazs faila izmērs - iespējams nepietiekams audio');
    }

    return {
      isValid: true,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Neizdevās validēt audio failu',
    };
  }
};

// Функция для получения статуса доступных API
export const getApiStatus = () => {
  return {
    openai: isOpenAIApiAvailable(),
    assemblyai: isAssemblyAIApiAvailable(),
    google: isGoogleSpeechApiAvailable(),
    webSpeech: isWebSpeechSupported(),
    currentApi: getAvailableApi(),
    hasAnyApi: getAvailableApi() !== null,
    hasFreeOptions: isWebSpeechSupported() || isAssemblyAIApiAvailable() || isGoogleSpeechApiAvailable(),
  };
}; 