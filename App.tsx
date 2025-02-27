import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, TextInput, Modal, Platform, KeyboardAvoidingView, ScrollView, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { TaskItem } from './components/TaskItem';
import { Task } from './types';
import DateTimePicker from '@react-native-community/datetimepicker';
import { AnimatedBackground } from './components/AnimatedBackground';
import { Calendar, LocaleConfig } from 'react-native-calendars';


LocaleConfig.locales['lv'] = {
  monthNames: [
    'Janvāris',
    'Februāris',
    'Marts',
    'Aprīlis',
    'Maijs',
    'Jūnijs',
    'Jūlijs',
    'Augusts',
    'Septembris',
    'Oktobris',
    'Novembris',
    'Decembris'
  ],
  monthNamesShort: ['Janv.', 'Febr.', 'Marts', 'Apr.', 'Maijs', 'Jūn.', 'Jūl.', 'Aug.', 'Sept.', 'Okt.', 'Nov.', 'Dec.'],
  dayNames: ['Svētdiena', 'Pirmdiena', 'Otrdiena', 'Trešdiena', 'Ceturtdiena', 'Piektdiena', 'Sestdiena'],
  dayNamesShort: ['Sv.', 'Pr.', 'Ot.', 'Tr.', 'Ce.', 'Pk.', 'Se.'],
};

LocaleConfig.defaultLocale = 'lv';


function PlannerScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setSelectedDate(selectedDate);
    }
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    if (selectedTime) {
      setSelectedTime(selectedTime);
    }
  };

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const addTask = () => {
    if (newTaskTitle.trim()) {
      const newTask: Task = {
        id: Date.now().toString(),
        title: newTaskTitle,
        description: newTaskDescription,
        completed: false,
        dueDate: selectedDate,
        dueTime: formatTime(selectedTime),
      };
      setTasks([...tasks, newTask]);
      resetForm();
    }
  };

  const resetForm = () => {
    setNewTaskTitle('');
    setNewTaskDescription('');
    setSelectedDate(new Date());
    setSelectedTime(new Date());
    setModalVisible(false);
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  const editTask = (task: Task) => {
    setEditingTask(task);
    setNewTaskTitle(task.title);
    setNewTaskDescription(task.description || '');
    setSelectedDate(task.dueDate);
    setSelectedTime(new Date(`2000-01-01T${task.dueTime}`));
    setModalVisible(true);
  };

  const updateTask = () => {
    if (editingTask && newTaskTitle.trim()) {
      setTasks(tasks.map(task =>
        task.id === editingTask.id
          ? { 
              ...task, 
              title: newTaskTitle, 
              description: newTaskDescription, 
              dueDate: selectedDate,
              dueTime: formatTime(selectedTime)
            }
          : task
      ));
      setModalVisible(false);
      setEditingTask(null);
      resetForm();
    }
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  const completedTasks = tasks.filter(task => task.completed).length;
  const progress = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

  return (
    <View style={styles.container}>
      <AnimatedBackground />
      <View style={styles.header}>
        <Text style={styles.title}>Mani uzdevumi</Text>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{progress.toFixed(0)}% pabeigts</Text>
        </View>
      </View>

      <FlatList
        data={tasks}
        renderItem={({ item }) => (
          <TaskItem
            task={item}
            onToggle={toggleTask}
            onEdit={editTask}
            onDelete={deleteTask}
          />
        )}
        keyExtractor={item => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
      />

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => {
          setEditingTask(null);
          setNewTaskTitle('');
          setNewTaskDescription('');
          setSelectedDate(new Date());
          setSelectedTime(new Date());
          setShowDatePicker(false);
          setShowTimePicker(false);
          setModalVisible(true);
        }}
      >
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
          keyboardVerticalOffset={Platform.OS === "ios" ? -64 : 0}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalContainer}>
              <ScrollView>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>
                      {editingTask ? 'Rediģēt uzdevumu' : 'Jauns uzdevums'}
                    </Text>
                    <TouchableOpacity onPress={resetForm}>
                      <Ionicons name="close" size={24} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.inputContainer}>
                    <Ionicons name="pencil" size={24} color="#007AFF" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Uzdevuma nosaukums"
                      value={newTaskTitle}
                      onChangeText={setNewTaskTitle}
                      placeholderTextColor="#666"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Ionicons name="document-text" size={24} color="#007AFF" style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder="Apraksts"
                      value={newTaskDescription}
                      onChangeText={setNewTaskDescription}
                      multiline
                      placeholderTextColor="#666"
                    />
                  </View>

                  <View style={styles.dateTimeSection}>
                    <Text style={styles.sectionTitle}>Datums un laiks</Text>
                    
                    <View style={styles.dateTimeGrid}>
                      <View style={styles.pickerColumn}>
                        <Text style={styles.pickerLabel}>Datums</Text>
                        <View style={styles.pickerContainer}>
                          <DateTimePicker
                            value={selectedDate}
                            mode="date"
                            onChange={onDateChange}
                            minimumDate={new Date()}
                            locale="lv-LV"
                            style={styles.picker}
                            textColor="#fff"
                          />
                        </View>
                      </View>

                      <View style={styles.pickerColumn}>
                        <Text style={styles.pickerLabel}>Laiks</Text>
                        <View style={styles.pickerContainer}>
                          <DateTimePicker
                            value={selectedTime}
                            mode="time"
                            onChange={onTimeChange}
                            locale="lv-LV"
                            minuteInterval={5}
                            style={styles.picker}
                            textColor="#fff"
                          />
                        </View>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.saveButtonLarge}
                    onPress={editingTask ? updateTask : addTask}
                  >
                    <Ionicons name="save" size={24} color="white" />
                    <Text style={styles.saveButtonText}>
                      {editingTask ? 'Saglabāt izmaiņas' : 'Pievienot uzdevumu'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState('');

  return (
    <View style={[styles.container, { padding: 15 }]}>
      <AnimatedBackground />
      <Calendar
        style={{
          borderRadius: 10,
          elevation: 4,
          margin: 5,
          backgroundColor: 'rgba(17, 24, 39, 0.95)',
        }}
        theme={{
          backgroundColor: 'transparent',
          calendarBackground: 'rgba(17, 24, 39, 0.95)',
          textSectionTitleColor: '#fff',
          selectedDayBackgroundColor: '#60A5FA',
          selectedDayTextColor: '#ffffff',
          todayTextColor: '#60A5FA',
          dayTextColor: '#fff',
          textDisabledColor: '#666',
          dotColor: '#60A5FA',
          selectedDotColor: '#ffffff',
          arrowColor: '#60A5FA',
          monthTextColor: '#fff',
          textMonthFontWeight: 'bold',
          textDayFontSize: 16,
          textMonthFontSize: 16,
          textDayHeaderFontSize: 14
        }}
        onDayPress={(day: { dateString: string }) => {
          console.log('selected day', day);
          setSelectedDate(day.dateString);
        }}
        markedDates={{
          [selectedDate]: {
            selected: true,
            selectedColor: '#60A5FA',
          }
        }}
        enableSwipeMonths={true}
      />
    </View>
  );
}

function AudioDiaryScreen() {
  return (
    <View style={styles.container}>
      <Text>Audio dienasgrāmata</Text>
    </View>
  );
}

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <View style={styles.root}>
        <Tab.Navigator
          screenOptions={{
            tabBarActiveTintColor: '#60A5FA',
            tabBarInactiveTintColor: '#6B7280',
            tabBarStyle: {
              backgroundColor: 'rgba(17, 24, 39, 0.95)',
              borderTopWidth: 0,
              elevation: 10,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              height: 60,
              paddingBottom: 8,
            },
            headerStyle: {
              backgroundColor: 'rgba(17, 24, 39, 0.95)',
              elevation: 0,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
            },
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 20,
              color: '#fff',
            },
            headerTitleAlign: 'center',
          }}
        >
          <Tab.Screen 
            name="Planner" 
            component={PlannerScreen}
            options={{
              title: 'Plānotājs',
              tabBarLabel: 'Plānotājs',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="list" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen 
            name="Calendar" 
            component={CalendarScreen}
            options={{
              title: 'Kalendārs',
              tabBarLabel: 'Kalendārs',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="calendar" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen 
            name="AudioDiary" 
            component={AudioDiaryScreen}
            options={{
              title: 'Audio dienasgrāmata',
              tabBarLabel: 'Dienasgrāmata',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="mic" size={size} color={color} />
              ),
            }}
          />
        </Tab.Navigator>
        <StatusBar style="light" />
      </View>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  header: {
    padding: 20,
    backgroundColor: 'rgba(17, 24, 39, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(75, 85, 99, 0.3)',
    marginBottom: 10,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 10,
  },
  progressContainer: {
    marginTop: 15,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(75, 85, 99, 0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#60A5FA',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    fontWeight: '500',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 15,
    paddingBottom: 100,
  },
  addButton: {
    position: 'absolute',
    right: 20,
    bottom: 25,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#60A5FA',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#60A5FA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    backgroundColor: 'rgba(17, 24, 39, 0.95)',
    borderRadius: 20,
    padding: 20,
    margin: 20,
    marginTop: Platform.OS === 'ios' ? 50 : 20,
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.3)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(75, 85, 99, 0.3)',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: 'rgba(31, 41, 55, 0.95)',
    borderRadius: 12,
    padding: 5,
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.3)',
  },
  inputIcon: {
    marginHorizontal: 12,
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#fff',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  dateTimeSection: {
    marginTop: 10,
    marginBottom: 20,
    padding: 15,
    backgroundColor: 'rgba(31, 41, 55, 0.95)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.3)',
  },
  sectionTitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 10,
    textAlign: 'center',
  },
  dateTimeGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  pickerColumn: {
    width: '40%',
    alignItems: 'center',
  },
  pickerLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
    textAlign: 'center',
  },
  pickerContainer: {
    backgroundColor: 'rgba(17, 24, 39, 0.95)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    overflow: 'hidden',
  },
  picker: {
    width: 100,
    height: 40,
  },
  saveButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#60A5FA',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: Platform.OS === 'ios' ? 30 : 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 10,
  },
  calendar: {
    marginBottom: 10,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.3)',
  },
  taskList: {
    flex: 1,
    padding: 15,
  },
  dateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 10,
  },
});
