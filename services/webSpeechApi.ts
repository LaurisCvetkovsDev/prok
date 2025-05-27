// Сервис для работы с Web Speech API браузера
// Работает только в веб-версии приложения

export interface WebSpeechResult {
  success: boolean;
  text?: string;
  error?: string;
  confidence?: number;
}

// Проверка поддержки Web Speech API
export const isWebSpeechApiSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
};

// Функция для преобразования речи в текст с помощью Web Speech API
export const transcribeWithWebSpeech = async (
  audioBlob?: Blob,
  languageCode: string = 'lv-LV'
): Promise<WebSpeechResult> => {
  return new Promise((resolve) => {
    if (!isWebSpeechApiSupported()) {
      resolve({
        success: false,
        error: 'Web Speech API nav atbalstīts šajā pārlūkprogrammā'
      });
      return;
    }

    // Получаем SpeechRecognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    // Настройки распознавания
    recognition.lang = languageCode;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    // Обработчики событий
    recognition.onresult = (event: any) => {
      const result = event.results[0];
      if (result && result[0]) {
        resolve({
          success: true,
          text: result[0].transcript,
          confidence: result[0].confidence || 0.9
        });
      } else {
        resolve({
          success: false,
          error: 'Nav atpazīta runa'
        });
      }
    };

    recognition.onerror = (event: any) => {
      let errorMessage = 'Runas atpazīšanas kļūda';
      
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'Nav dzirdama runa';
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
        default:
          errorMessage = `Kļūda: ${event.error}`;
      }

      resolve({
        success: false,
        error: errorMessage
      });
    };

    recognition.onend = () => {
      // Если результат еще не получен, это означает ошибку
      resolve({
        success: false,
        error: 'Runas atpazīšana pārtraukta'
      });
    };

    // Начинаем распознавание
    try {
      recognition.start();
    } catch (error) {
      resolve({
        success: false,
        error: 'Neizdevās sākt runas atpazīšanu'
      });
    }
  });
};

// Функция для живого распознавания речи
export const startLiveSpeechRecognition = (
  onResult: (text: string, isFinal: boolean) => void,
  onError: (error: string) => void,
  languageCode: string = 'lv-LV'
): (() => void) => {
  if (!isWebSpeechApiSupported()) {
    onError('Web Speech API nav atbalstīts');
    return () => {};
  }

  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  recognition.lang = languageCode;
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event: any) => {
    let finalTranscript = '';
    let interimTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }

    if (finalTranscript) {
      onResult(finalTranscript, true);
    } else if (interimTranscript) {
      onResult(interimTranscript, false);
    }
  };

  recognition.onerror = (event: any) => {
    let errorMessage = 'Runas atpazīšanas kļūda';
    
    switch (event.error) {
      case 'no-speech':
        errorMessage = 'Nav dzirdama runa';
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
      default:
        errorMessage = `Kļūda: ${event.error}`;
    }

    onError(errorMessage);
  };

  recognition.start();

  // Возвращаем функцию остановки
  return () => {
    recognition.stop();
  };
};

// Поддерживаемые языки для Web Speech API
export const getWebSpeechLanguages = () => {
  return [
    { code: 'lv-LV', name: 'Latviešu', flag: '🇱🇻' },
    { code: 'en-US', name: 'English (US)', flag: '🇺🇸' },
    { code: 'en-GB', name: 'English (UK)', flag: '🇬🇧' },
    { code: 'ru-RU', name: 'Русский', flag: '🇷🇺' },
    { code: 'de-DE', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'fr-FR', name: 'Français', flag: '🇫🇷' },
    { code: 'es-ES', name: 'Español', flag: '🇪🇸' },
    { code: 'it-IT', name: 'Italiano', flag: '🇮🇹' },
    { code: 'pt-PT', name: 'Português', flag: '🇵🇹' },
    { code: 'nl-NL', name: 'Nederlands', flag: '🇳🇱' },
    { code: 'pl-PL', name: 'Polski', flag: '🇵🇱' },
    { code: 'sv-SE', name: 'Svenska', flag: '🇸🇪' },
    { code: 'da-DK', name: 'Dansk', flag: '🇩🇰' },
    { code: 'no-NO', name: 'Norsk', flag: '🇳🇴' },
    { code: 'fi-FI', name: 'Suomi', flag: '🇫🇮' },
  ];
}; 