import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, SafeAreaView, Platform } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { transcribeAudio, analyzeAudioQuality, validateAudioForTranscription, getApiStatus, testAssemblyAIConnection, getSupportedLanguages } from '../services/speechToText';

interface AudioRecorderProps {
  onRecordingComplete: (audioUri: string, transcription?: string, confidence?: number) => void;
  onCancel: () => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onRecordingComplete,
  onCancel,
}) => {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionResult, setTranscriptionResult] = useState<{
    text?: string;
    confidence?: number;
    error?: string;
    provider?: string;
  } | null>(null);
  const [audioQuality, setAudioQuality] = useState<{
    duration: number;
    fileSize: number;
    quality: 'low' | 'medium' | 'high';
    recommendation?: string;
  } | null>(null);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [apiStatus, setApiStatus] = useState<{
    openai: boolean;
    assemblyai: boolean;
    google: boolean;
    webSpeech: boolean;
    currentApi: string | null;
    hasAnyApi: boolean;
    hasFreeOptions: boolean;
  } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [recordingFormat, setRecordingFormat] = useState<'high' | 'compatible'>('compatible');
  const [selectedLanguage, setSelectedLanguage] = useState('lv');

  const supportedLanguages = getSupportedLanguages();

  useEffect(() => {
    // Проверяем статус API при загрузке
    setApiStatus(getApiStatus());
    
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync();
      }
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      console.log('Requesting permissions...');
      const { status } = await Audio.requestPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Kļūda', 'Mikrofona atļauja ir nepieciešama audio ierakstiem');
        return;
      }

      console.log('Setting audio mode...');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('Starting recording with format:', recordingFormat);
      
      let recordingOptions;
      
      if (recordingFormat === 'compatible') {
        // Более совместимый формат специально для AssemblyAI
        recordingOptions = {
          android: {
            extension: '.m4a',
            outputFormat: Audio.AndroidOutputFormat.MPEG_4,
            audioEncoder: Audio.AndroidAudioEncoder.AAC,
            sampleRate: 16000, // Оптимальная частота для speech-to-text
            numberOfChannels: 1, // Моно
            bitRate: 64000, // Достаточно для речи
          },
          ios: {
            extension: '.m4a',
            audioQuality: Audio.IOSAudioQuality.MEDIUM,
            sampleRate: 16000, // Стандарт для речи
            numberOfChannels: 1, // Моно
            bitRate: 64000,
            linearPCMBitDepth: 16,
            linearPCMIsBigEndian: false,
            linearPCMIsFloat: false,
          },
          web: {
            mimeType: 'audio/webm;codecs=opus',
            bitsPerSecond: 64000,
          },
        };
      } else {
        recordingOptions = Audio.RecordingOptionsPresets.HIGH_QUALITY;
      }
      
      const { recording } = await Audio.Recording.createAsync(recordingOptions);
      
      setRecording(recording);
      setIsRecording(true);
      setRecordingDuration(0);
      setTranscriptionResult(null);
      setAudioQuality(null);
      setValidationWarnings([]);

      // Обновление времени записи
      const interval = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      // Очистка интервала при остановке
      recording.setOnRecordingStatusUpdate((status) => {
        if (!status.isRecording) {
          clearInterval(interval);
        }
      });

    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Kļūda', `Neizdevās sākt ierakstīšanu: ${err instanceof Error ? err.message : 'Nezināma kļūda'}`);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    console.log('Stopping recording...');
    setIsRecording(false);
    await recording.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
    });

    const uri = recording.getURI();
    setRecordingUri(uri);
    setRecording(null);
    console.log('Recording stopped and stored at', uri);

    // Анализируем качество аудио и начинаем транскрипцию
    if (uri) {
      // Быстрый анализ качества без задержек
      const quality = await analyzeAudioQuality(uri);
      setAudioQuality(quality);
      
      // Сразу начинаем транскрипцию без валидации
      await startTranscription(uri);
    }
  };

  const startTranscription = async (audioUri: string) => {
    setIsTranscribing(true);
    setTranscriptionResult(null);

    try {
      console.log('Starting transcription with language:', selectedLanguage);
      const result = await transcribeAudio(audioUri, selectedLanguage);
      
      if (result.success && result.text) {
        setTranscriptionResult({
          text: result.text,
          confidence: result.confidence,
          provider: result.provider,
        });
      } else {
        setTranscriptionResult({
          error: result.error || 'Neizdevās atpazīt runu',
          provider: result.provider,
        });
      }
    } catch (error) {
      console.error('Transcription error:', error);
      setTranscriptionResult({
        error: 'Transkrīpcijas kļūda',
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  const retryTranscription = async () => {
    if (recordingUri) {
      await startTranscription(recordingUri);
    }
  };

  const playRecording = async () => {
    if (!recordingUri) return;

    try {
      if (sound) {
        await sound.unloadAsync();
      }

      console.log('Loading Sound');
      const { sound: newSound } = await Audio.Sound.createAsync({
        uri: recordingUri,
      });
      setSound(newSound);
      setIsPlaying(true);

      console.log('Playing Sound');
      await newSound.playAsync();

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
        }
      });
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  const stopPlaying = async () => {
    if (sound) {
      await sound.stopAsync();
      setIsPlaying(false);
    }
  };

  const saveRecording = () => {
    if (!recordingUri) return;
    
    onRecordingComplete(
      recordingUri, 
      transcriptionResult?.text, 
      transcriptionResult?.confidence
    );
  };

  const resetRecording = () => {
    setRecordingUri(null);
    setRecordingDuration(0);
    setTranscriptionResult(null);
    setAudioQuality(null);
    setValidationWarnings([]);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getQualityColor = (quality: 'low' | 'medium' | 'high') => {
    switch (quality) {
      case 'low': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'high': return '#10B981';
    }
  };

  const getQualityText = (quality: 'low' | 'medium' | 'high') => {
    switch (quality) {
      case 'low': return 'Zema kvalitāte';
      case 'medium': return 'Vidēja kvalitāte';
      case 'high': return 'Augsta kvalitāte';
    }
  };

  const getQualityIcon = (quality: 'low' | 'medium' | 'high') => {
    switch (quality) {
      case 'low': return 'warning';
      case 'medium': return 'information-circle';
      case 'high': return 'checkmark-circle';
    }
  };

  const getApiProviderIcon = (provider?: string) => {
    if (provider?.includes('OpenAI')) return 'globe';
    if (provider?.includes('AssemblyAI')) return 'cloud';
    if (provider?.includes('Google')) return 'search';
    if (provider?.includes('Mock')) return 'warning';
    return 'mic';
  };

  const testApiConnection = async () => {
    setIsTesting(true);
    try {
      console.log('Testing API connection...');
      const result = await testAssemblyAIConnection();
      
      if (result.success) {
        Alert.alert('✅ Тест успешен!', result.text || 'API работает корректно');
      } else {
        Alert.alert('❌ Тест не прошел', result.error || 'Неизвестная ошибка');
      }
    } catch (error) {
      Alert.alert('❌ Ошибка теста', error instanceof Error ? error.message : 'Неизвестная ошибка');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Audio ieraksts</Text>
        <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      {/* API Status Info */}
      {apiStatus && (
        <View style={styles.apiStatusContainer}>
          <View style={styles.apiStatus}>
            <Ionicons 
              name={apiStatus.hasAnyApi ? "checkmark-circle" : "warning"} 
              size={16} 
              color={apiStatus.hasAnyApi ? "#10B981" : "#F59E0B"} 
            />
            <Text style={[styles.apiStatusText, { color: apiStatus.hasAnyApi ? "#10B981" : "#F59E0B" }]}>
              {apiStatus.hasAnyApi 
                ? `API: ${apiStatus.currentApi?.toUpperCase() || 'Unknown'}`
                : 'Nav konfigurēts API - tiek izmantota imitācija'
              }
            </Text>
          </View>
          
          {/* Test Button */}
          {apiStatus.assemblyai && (
            <TouchableOpacity 
              style={styles.testButton} 
              onPress={testApiConnection}
              disabled={isTesting}
            >
              {isTesting ? (
                <ActivityIndicator size="small" color="#60A5FA" />
              ) : (
                <Ionicons name="flask" size={14} color="#60A5FA" />
              )}
              <Text style={styles.testButtonText}>
                {isTesting ? 'Testē...' : 'Test API'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.recordingArea}>
        <View style={styles.timerContainer}>
          <Text style={styles.timer}>{formatTime(recordingDuration)}</Text>
          {isRecording && <View style={styles.recordingIndicator} />}
        </View>

        {/* Audio Quality Info */}
        {audioQuality && (
          <View style={styles.qualityContainer}>
            <View style={styles.qualityInfo}>
              <Ionicons 
                name={getQualityIcon(audioQuality.quality)} 
                size={20} 
                color={getQualityColor(audioQuality.quality)} 
              />
              <Text style={[styles.qualityText, { color: getQualityColor(audioQuality.quality) }]}>
                {getQualityText(audioQuality.quality)}
              </Text>
              <Text style={styles.sizeText}>
                {formatFileSize(audioQuality.fileSize)}
              </Text>
            </View>
            {audioQuality.recommendation && (
              <Text style={styles.recommendationText}>
                {audioQuality.recommendation}
              </Text>
            )}
          </View>
        )}

        {/* Validation Warnings */}
        {validationWarnings.length > 0 && (
          <View style={styles.warningsContainer}>
            {validationWarnings.map((warning, index) => (
              <View key={index} style={styles.warningItem}>
                <Ionicons name="warning" size={16} color="#F59E0B" />
                <Text style={styles.warningText}>{warning}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.controlsContainer}>
          {!isRecording && !recordingUri && (
            <TouchableOpacity
              style={styles.recordButton}
              onPress={startRecording}
            >
              <Ionicons name="mic" size={40} color="white" />
            </TouchableOpacity>
          )}

          {isRecording && (
            <TouchableOpacity
              style={[styles.recordButton, styles.stopButton]}
              onPress={stopRecording}
            >
              <Ionicons name="stop" size={40} color="white" />
            </TouchableOpacity>
          )}

          {recordingUri && (
            <View style={styles.playbackControls}>
              <TouchableOpacity
                style={styles.playButton}
                onPress={isPlaying ? stopPlaying : playRecording}
              >
                <Ionicons 
                  name={isPlaying ? "pause" : "play"} 
                  size={30} 
                  color="white" 
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.retryButton}
                onPress={resetRecording}
              >
                <Ionicons name="refresh" size={24} color="#60A5FA" />
                <Text style={styles.retryText}>Ierakstīt vēlreiz</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Transcription Section */}
        {recordingUri && (
          <View style={styles.transcriptionSection}>
            <View style={styles.transcriptionHeader}>
              <View style={styles.transcriptionTitleContainer}>
                <Text style={styles.transcriptionTitle}>Teksta atpazīšana</Text>
                {transcriptionResult?.provider && (
                  <View style={styles.providerContainer}>
                    <Ionicons 
                      name={getApiProviderIcon(transcriptionResult.provider)} 
                      size={14} 
                      color="#9CA3AF" 
                    />
                    <Text style={styles.providerText}>{transcriptionResult.provider}</Text>
                  </View>
                )}
              </View>
              {!isTranscribing && transcriptionResult && (
                <TouchableOpacity onPress={retryTranscription} style={styles.retryTranscriptionButton}>
                  <Ionicons name="refresh" size={16} color="#60A5FA" />
                </TouchableOpacity>
              )}
            </View>

            {isTranscribing && (
              <View style={styles.transcribingContainer}>
                <ActivityIndicator size="small" color="#60A5FA" />
                <Text style={styles.transcribingText}>Apstrādā audio...</Text>
              </View>
            )}

            {transcriptionResult && !isTranscribing && (
              <View style={styles.transcriptionResult}>
                {transcriptionResult.text ? (
                  <View>
                    <Text style={styles.transcriptionText}>
                      {transcriptionResult.text}
                    </Text>
                    {transcriptionResult.confidence && (
                      <Text style={styles.confidenceText}>
                        Pārliecība: {(transcriptionResult.confidence * 100).toFixed(0)}%
                      </Text>
                    )}
                  </View>
                ) : (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={20} color="#EF4444" />
                    <Text style={styles.errorText}>
                      {transcriptionResult.error}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {recordingUri && !isTranscribing && (
          <View style={styles.saveContainer}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={saveRecording}
            >
              <Ionicons name="checkmark" size={24} color="white" />
              <Text style={styles.saveText}>Saglabāt ierakstu</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Language Selection */}
        {!isRecording && !recordingUri && (
          <View style={styles.languageSelection}>
            <Text style={styles.languageTitle}>Valoda:</Text>
            <View style={styles.languageGrid}>
              {supportedLanguages.slice(0, 6).map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageButton,
                    selectedLanguage === lang.code && styles.languageButtonActive
                  ]}
                  onPress={() => setSelectedLanguage(lang.code)}
                >
                  <Text style={styles.languageFlag}>{lang.flag}</Text>
                  <Text style={[
                    styles.languageButtonText,
                    selectedLanguage === lang.code && styles.languageButtonTextActive
                  ]}>
                    {lang.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Format Toggle */}
        {!isRecording && !recordingUri && (
          <View style={styles.formatToggle}>
            <Text style={styles.formatTitle}>Ieraksta formāts:</Text>
            <View style={styles.formatButtons}>
              <TouchableOpacity
                style={[styles.formatButton, recordingFormat === 'high' && styles.formatButtonActive]}
                onPress={() => setRecordingFormat('high')}
              >
                <Text style={[styles.formatButtonText, recordingFormat === 'high' && styles.formatButtonTextActive]}>
                  Augsta kvalitāte
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.formatButton, recordingFormat === 'compatible' && styles.formatButtonActive]}
                onPress={() => setRecordingFormat('compatible')}
              >
                <Text style={[styles.formatButtonText, recordingFormat === 'compatible' && styles.formatButtonTextActive]}>
                  Saderīgs
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <View style={styles.instructions}>
        <Text style={styles.instructionText}>
          {!recordingUri 
            ? (isRecording 
              ? "Runājiet skaidri un skaļi..." 
              : "Nospiediet mikrofonu, lai sāktu ierakstu")
            : isTranscribing
              ? "Notiek teksta atpazīšana..."
              : "Pārbaudiet rezultātu un saglabājiet ierakstu"
          }
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.95)',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: Platform.OS === 'ios' ? 5 : 0,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    padding: 8,
  },
  apiStatusContainer: {
    marginBottom: 20,
  },
  apiStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.3)',
  },
  apiStatusText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 8,
  },
  recordingArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  timer: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#60A5FA',
    fontFamily: 'monospace',
  },
  recordingIndicator: {
    width: 12,
    height: 12,
    backgroundColor: '#EF4444',
    borderRadius: 6,
    marginLeft: 15,
    opacity: 0.8,
  },
  qualityContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  qualityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  qualityText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sizeText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  recommendationText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  warningsContainer: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    width: '100%',
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  warningText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  controlsContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  recordButton: {
    width: 100,
    height: 100,
    backgroundColor: '#EF4444',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  stopButton: {
    backgroundColor: '#6B7280',
  },
  playbackControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 30,
  },
  playButton: {
    width: 70,
    height: 70,
    backgroundColor: '#10B981',
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButton: {
    alignItems: 'center',
    gap: 8,
  },
  retryText: {
    color: '#60A5FA',
    fontSize: 14,
  },
  transcriptionSection: {
    width: '100%',
    marginTop: 20,
    marginBottom: 20,
  },
  transcriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  transcriptionTitleContainer: {
    flex: 1,
  },
  transcriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  providerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  providerText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  retryTranscriptionButton: {
    padding: 4,
  },
  transcribingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 20,
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.3)',
  },
  transcribingText: {
    color: '#60A5FA',
    fontSize: 16,
    fontWeight: '500',
  },
  transcriptionResult: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.3)',
  },
  transcriptionText: {
    color: '#E5E7EB',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
  },
  confidenceText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '500',
  },
  saveContainer: {
    marginTop: 20,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
  },
  saveText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  instructions: {
    marginTop: 20,
  },
  instructionText: {
    color: '#9CA3AF',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 8,
    gap: 6,
  },
  testButtonText: {
    color: '#60A5FA',
    fontSize: 12,
    fontWeight: '500',
  },
  formatToggle: {
    marginBottom: 20,
    alignItems: 'center',
  },
  formatTitle: {
    color: '#E5E7EB',
    fontSize: 14,
    marginBottom: 8,
  },
  formatButtons: {
    flexDirection: 'row',
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 8,
    padding: 4,
  },
  formatButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 100,
    alignItems: 'center',
  },
  formatButtonActive: {
    backgroundColor: '#60A5FA',
  },
  formatButtonText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '500',
  },
  formatButtonTextActive: {
    color: 'white',
  },
  languageSelection: {
    marginBottom: 20,
    alignItems: 'center',
  },
  languageTitle: {
    color: '#E5E7EB',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '600',
  },
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.3)',
    gap: 6,
  },
  languageButtonActive: {
    backgroundColor: '#60A5FA',
    borderColor: '#60A5FA',
  },
  languageFlag: {
    fontSize: 16,
  },
  languageButtonText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '500',
  },
  languageButtonTextActive: {
    color: 'white',
  },
}); 