import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { DiaryEntry, Category, Task } from '../types';

interface DiaryEntryItemProps {
  entry: DiaryEntry;
  category?: Category;
  task?: Task;
  onEdit: (entry: DiaryEntry) => void;
  onDelete: (id: string) => void;
  onAddToTask: (entry: DiaryEntry) => void;
}

export const DiaryEntryItem: React.FC<DiaryEntryItemProps> = ({
  entry,
  category,
  task,
  onEdit,
  onDelete,
  onAddToTask,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [showFullText, setShowFullText] = useState(false);

  const playAudio = async () => {
    if (!entry.audioUri) return;

    try {
      if (sound) {
        await sound.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync({
        uri: entry.audioUri,
      });
      setSound(newSound);
      setIsPlaying(true);

      await newSound.playAsync();

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
        }
      });
    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert('Ошибка', 'Не удалось воспроизвести аудио');
    }
  };

  const stopAudio = async () => {
    if (sound) {
      await sound.stopAsync();
      setIsPlaying(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('lv-LV', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('lv-LV', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const confirmDelete = () => {
    Alert.alert(
      'Dzēst ierakstu?',
      'Šī darbība ir neatgriezeniska.',
      [
        { text: 'Atcelt', style: 'cancel' },
        { text: 'Dzēst', style: 'destructive', onPress: () => onDelete(entry.id) },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header with category and date */}
      <View style={styles.header}>
        <View style={styles.categoryContainer}>
          {category && (
            <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
          )}
          <Text style={styles.categoryText}>
            {category?.name || 'Nav kategorijas'}
          </Text>
        </View>
        <Text style={styles.dateText}>
          {formatDate(entry.date)} • {formatTime(entry.date)}
        </Text>
      </View>

      {/* Title */}
      <Text style={styles.title}>{entry.title}</Text>

      {/* Connected Task */}
      {task && (
        <View style={styles.taskContainer}>
          <View style={styles.taskHeader}>
            <Ionicons name="link" size={16} color="#60A5FA" />
            <Text style={styles.taskLabel}>Pievienots uzdevumam:</Text>
          </View>
          <View style={styles.taskInfo}>
            <Ionicons 
              name={task.completed ? "checkmark-circle" : "radio-button-off"} 
              size={18} 
              color={task.completed ? "#10B981" : "#6B7280"} 
            />
            <Text style={[
              styles.taskTitle,
              task.completed && styles.taskCompleted
            ]}>
              {task.title}
            </Text>
          </View>
          <Text style={styles.taskDate}>
            {task.dueDate.toLocaleDateString('lv-LV')} • {task.dueTime}
          </Text>
        </View>
      )}

      {/* Audio controls */}
      {entry.audioUri && (
        <View style={styles.audioContainer}>
          <TouchableOpacity
            style={styles.playButton}
            onPress={isPlaying ? stopAudio : playAudio}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={20}
              color="white"
            />
          </TouchableOpacity>
          <Text style={styles.audioText}>
            {isPlaying ? 'Atskaņo...' : 'Audio ieraksts'}
          </Text>
        </View>
      )}

      {/* Text content */}
      <TouchableOpacity
        onPress={() => setShowFullText(!showFullText)}
        activeOpacity={0.7}
      >
        <Text style={styles.text}>
          {showFullText ? entry.text : truncateText(entry.text)}
        </Text>
        {entry.text.length > 100 && (
          <Text style={styles.readMore}>
            {showFullText ? 'Rādīt mazāk' : 'Lasīt vairāk'}
          </Text>
        )}
      </TouchableOpacity>

      {/* Transcription */}
      {entry.transcription && entry.transcription !== entry.text && (
        <View style={styles.transcriptionContainer}>
          <Text style={styles.transcriptionLabel}>Automātiskais teksts:</Text>
          <Text style={styles.transcriptionText}>
            {showFullText ? entry.transcription : truncateText(entry.transcription)}
          </Text>
        </View>
      )}

      {/* Tags */}
      {entry.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {entry.tags.map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Action buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onAddToTask(entry)}
        >
          <Ionicons name="add-circle-outline" size={20} color="#60A5FA" />
          <Text style={styles.actionText}>Pievienot uzdevumam</Text>
        </TouchableOpacity>

        <View style={styles.rightActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => onEdit(entry)}
          >
            <Ionicons name="pencil" size={18} color="#10B981" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={confirmDelete}
          >
            <Ionicons name="trash" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.3)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  categoryText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '500',
  },
  dateText: {
    color: '#6B7280',
    fontSize: 12,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    lineHeight: 24,
  },
  audioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(75, 85, 99, 0.3)',
    borderRadius: 8,
    padding: 8,
  },
  playButton: {
    width: 32,
    height: 32,
    backgroundColor: '#10B981',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  audioText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '500',
  },
  text: {
    color: '#E5E7EB',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  readMore: {
    color: '#60A5FA',
    fontSize: 14,
    fontWeight: '500',
  },
  transcriptionContainer: {
    backgroundColor: 'rgba(75, 85, 99, 0.2)',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  transcriptionLabel: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  transcriptionText: {
    color: '#D1D5DB',
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    marginBottom: 12,
  },
  tag: {
    backgroundColor: 'rgba(96, 165, 250, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.3)',
  },
  tagText: {
    color: '#60A5FA',
    fontSize: 12,
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(75, 85, 99, 0.3)',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(96, 165, 250, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.3)',
  },
  actionText: {
    color: '#60A5FA',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  rightActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    width: 36,
    height: 36,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  deleteButton: {
    width: 36,
    height: 36,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  taskContainer: {
    marginBottom: 12,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  taskLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '500',
  },
  taskInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  taskCompleted: {
    textDecorationLine: 'line-through',
  },
  taskDate: {
    color: '#6B7280',
    fontSize: 12,
  },
}); 