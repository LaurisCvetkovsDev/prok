import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Task } from '../types';
import { Ionicons } from '@expo/vector-icons';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onShare: (task: Task) => void;
}

export function TaskItem({ task, onToggle, onEdit, onDelete, onShare }: TaskItemProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.checkboxContainer} 
        onPress={() => onToggle(task.id)}
      >
        <View style={styles.checkbox}>
          {task.completed ? (
            <Ionicons name="checkmark-circle" size={24} color="#60A5FA" />
          ) : (
            <View style={styles.uncheckedCircle} />
          )}
          <Text style={styles.checkboxLabel}>
            {task.completed ? "Pabeigts" : "Nepabeigts"}
          </Text>
        </View>
      </TouchableOpacity>

      <Text style={[styles.title, task.completed && styles.completedText]}>
        {task.title}
      </Text>
      {task.description && (
        <Text style={styles.description}>{task.description}</Text>
      )}
      
      <View style={styles.footer}>
        <View style={styles.dateTimeInfo}>
          <Text style={styles.dateTimeText}>
            Termiņš: {task.dueDate.toLocaleDateString('lv-LV')}
          </Text>
          <Text style={styles.dateTimeText}>
            Laiks: {task.dueTime}
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity onPress={() => onShare(task)} style={styles.actionButton}>
            <Ionicons name="share" size={20} color="#10B981" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onEdit(task)} style={styles.actionButton}>
            <Ionicons name="pencil" size={20} color="#60A5FA" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(task.id)} style={styles.actionButton}>
            <Ionicons name="trash" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  checkboxContainer: {
    marginBottom: 8,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  uncheckedCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#9CA3AF',
  },
  checkboxLabel: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  dateTimeInfo: {
    flex: 1,
  },
  dateTimeText: {
    fontSize: 12,
    color: '#60A5FA',
    marginBottom: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 4,
  },
}); 