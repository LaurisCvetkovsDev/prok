import React, { useState, useEffect, useCallback } from "react";
import { StatusBar } from "expo-status-bar";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
  Alert,
  Share,
} from "react-native";
import { NavigationContainer, useFocusEffect } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  createStackNavigator,
  StackNavigationProp,
} from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { TaskItem } from "./components/TaskItem";
import { Task, DiaryEntry, Category } from "./types";
import DateTimePicker from "@react-native-community/datetimepicker";
import { AnimatedBackground } from "./components/AnimatedBackground";
import { Calendar, LocaleConfig } from "react-native-calendars";
import { LoginScreen } from "./components/LoginScreen";
import { RegistrationScreen } from "./components/RegistrationScreen";
import { AudioDiaryScreen } from "./components/AudioDiaryScreen";
import {
  saveTasks,
  loadTasks,
  saveDiaryEntries,
  loadDiaryEntries,
  saveCategories,
  loadCategories,
  saveAuthStatus,
  loadAuthStatus,
} from "./utils/storage";
import { TaskAPI, DiaryAPI } from "./utils/api";

LocaleConfig.locales["lv"] = {
  monthNames: [
    "Janvāris",
    "Februāris",
    "Marts",
    "Aprīlis",
    "Maijs",
    "Jūnijs",
    "Jūlijs",
    "Augusts",
    "Septembris",
    "Oktobris",
    "Novembris",
    "Decembris",
  ],
  monthNamesShort: [
    "Janv.",
    "Febr.",
    "Marts",
    "Apr.",
    "Maijs",
    "Jūn.",
    "Jūl.",
    "Aug.",
    "Sept.",
    "Okt.",
    "Nov.",
    "Dec.",
  ],
  dayNames: [
    "Svētdiena",
    "Pirmdiena",
    "Otrdiena",
    "Trešdiena",
    "Ceturtdiena",
    "Piektdiena",
    "Sestdiena",
  ],
  dayNamesShort: ["Sv.", "Pr.", "Ot.", "Tr.", "Ce.", "Pk.", "Se."],
};

LocaleConfig.defaultLocale = "lv";

function PlannerScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Загружаем задачи при инициализации
  useEffect(() => {
    const loadTasksFromAPI = async () => {
      const loadedTasks = await TaskAPI.getTasks();
      setTasks(loadedTasks);
    };
    loadTasksFromAPI();
  }, []);

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
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const addTask = async () => {
    if (newTaskTitle.trim()) {
      const newTask = {
        title: newTaskTitle,
        description: newTaskDescription,
        completed: false,
        dueDate: selectedDate,
        dueTime: formatTime(selectedTime),
      };

      const success = await TaskAPI.createTask(newTask);
      if (success) {
        // Перезагружаем задачи с сервера
        const updatedTasks = await TaskAPI.getTasks();
        setTasks(updatedTasks);
        resetForm();
      }
    }
  };

  const resetForm = () => {
    setNewTaskTitle("");
    setNewTaskDescription("");
    setSelectedDate(new Date());
    setSelectedTime(new Date());
    setModalVisible(false);
  };

  const toggleTask = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (task) {
      const updatedTask = { ...task, completed: !task.completed };
      const success = await TaskAPI.updateTask(updatedTask);
      if (success) {
        const updatedTasks = await TaskAPI.getTasks();
        setTasks(updatedTasks);
      }
    }
  };

  const editTask = (task: Task) => {
    setEditingTask(task);
    setNewTaskTitle(task.title);
    setNewTaskDescription(task.description || "");
    setSelectedDate(task.dueDate);
    setSelectedTime(new Date(`2000-01-01T${task.dueTime}`));
    setModalVisible(true);
  };

  const updateTask = async () => {
    if (editingTask && newTaskTitle.trim()) {
      const updatedTask = {
        ...editingTask,
        title: newTaskTitle,
        description: newTaskDescription,
        dueDate: selectedDate,
        dueTime: formatTime(selectedTime),
      };

      const success = await TaskAPI.updateTask(updatedTask);
      if (success) {
        const updatedTasks = await TaskAPI.getTasks();
        setTasks(updatedTasks);
        setModalVisible(false);
        setEditingTask(null);
        resetForm();
      }
    }
  };

  const deleteTask = async (id: string) => {
    const success = await TaskAPI.deleteTask(id);
    if (success) {
      const updatedTasks = await TaskAPI.getTasks();
      setTasks(updatedTasks);
    }
  };

  const shareTask = async (task: Task) => {
    try {
      const shareText = `📋 Uzdevums: ${task.title}\n\n📝 Apraksts: ${
        task.description || "Nav norādīts"
      }\n\n📅 Datums: ${task.dueDate.toLocaleDateString("lv-LV")}\n⏰ Laiks: ${
        task.dueTime
      }\n\n✅ Status: ${task.completed ? "Pabeigts" : "Nepabeigts"}`;

      const result = await Share.share({
        message: shareText,
        title: `Uzdevums: ${task.title}`,
      });

      if (result.action === Share.sharedAction) {
        console.log("Задание успешно расшарено");
      }
    } catch (error) {
      console.error("Ошибка при шаринге:", error);
      Alert.alert("Kļūda", "Neizdevās dalīties ar uzdevumu");
    }
  };

  const completedTasks = tasks.filter((task) => task.completed).length;
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
          <Text style={styles.progressText}>
            {progress.toFixed(0)}% pabeigts
          </Text>
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
            onShare={shareTask}
          />
        )}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
      />

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => {
          setEditingTask(null);
          setNewTaskTitle("");
          setNewTaskDescription("");
          setSelectedDate(new Date());
          setSelectedTime(new Date());
          setShowDatePicker(false);
          setShowTimePicker(false);
          setModalVisible(true);
        }}
      >
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
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
                      {editingTask ? "Rediģēt uzdevumu" : "Jauns uzdevums"}
                    </Text>
                    <TouchableOpacity onPress={resetForm}>
                      <Ionicons name="close" size={24} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.inputContainer}>
                    <Ionicons
                      name="pencil"
                      size={24}
                      color="#007AFF"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Uzdevuma nosaukums"
                      value={newTaskTitle}
                      onChangeText={setNewTaskTitle}
                      placeholderTextColor="#666"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Ionicons
                      name="document-text"
                      size={24}
                      color="#007AFF"
                      style={styles.inputIcon}
                    />
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
                      {editingTask ? "Saglabāt izmaiņas" : "Pievienot uzdevumu"}
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
  const [selectedDate, setSelectedDate] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDateTasks, setSelectedDateTasks] = useState<Task[]>([]);
  const [showTasksModal, setShowTasksModal] = useState(false);

  useEffect(() => {
    loadTasksForCalendar();
  }, []);

  // Обновляем задачи при каждом переходе на экран календаря
  useFocusEffect(
    useCallback(() => {
      loadTasksForCalendar();
    }, [])
  );

  const loadTasksForCalendar = async () => {
    const loadedTasks = await TaskAPI.getTasks();
    console.log("Календарь: Загружено задач:", loadedTasks.length);
    if (loadedTasks.length > 0) {
      console.log("Календарь: Первое задание:", loadedTasks[0]);
      console.log("Календарь: Дата первого задания:", loadedTasks[0].dueDate);
    }
    setTasks(loadedTasks);
  };

  // Функция для форматирования даты в строку YYYY-MM-DD
  const formatDateToString = (date: Date): string => {
    return date.toISOString().split("T")[0];
  };

  // Получаем даты с заданиями для отметки в календаре
  const getMarkedDates = () => {
    console.log("getMarkedDates: Всего задач:", tasks.length);
    const marked: any = {};

    // Отмечаем даты с заданиями красным цветом
    tasks.forEach((task) => {
      const dateStr = formatDateToString(new Date(task.dueDate));
      console.log(
        "getMarkedDates: Обрабатываю задание:",
        task.title,
        "Дата:",
        dateStr
      );
      marked[dateStr] = {
        marked: true,
        dotColor: "#EF4444", // Красная точка
        customStyles: {
          container: {
            backgroundColor: "rgba(239, 68, 68, 0.1)", // Красный фон
            borderRadius: 16,
          },
          text: {
            color: "#EF4444", // Красный текст
            fontWeight: "bold",
          },
        },
      };
    });

    console.log("getMarkedDates: Помеченные даты:", Object.keys(marked));

    // Если есть выбранная дата, добавляем её стиль
    if (selectedDate) {
      if (marked[selectedDate]) {
        marked[selectedDate] = {
          ...marked[selectedDate],
          selected: true,
          selectedColor: "#60A5FA",
        };
      } else {
        marked[selectedDate] = {
          selected: true,
          selectedColor: "#60A5FA",
        };
      }
    }

    return marked;
  };

  // Обработчик нажатия на дату
  const onDayPress = (day: { dateString: string }) => {
    console.log("selected day", day);
    setSelectedDate(day.dateString);

    // Находим задания для выбранной даты
    const tasksForDate = tasks.filter((task) => {
      const taskDateStr = formatDateToString(new Date(task.dueDate));
      return taskDateStr === day.dateString;
    });

    if (tasksForDate.length > 0) {
      setSelectedDateTasks(tasksForDate);
      setShowTasksModal(true);
    }
  };

  const formatTaskTime = (timeStr: string, date: Date) => {
    const taskDate = new Date(date);
    const day = taskDate.getDate().toString().padStart(2, "0");
    const month = (taskDate.getMonth() + 1).toString().padStart(2, "0");
    return `${day}.${month}. plkst. ${timeStr}`;
  };

  const shareTaskFromCalendar = async (task: Task) => {
    try {
      const shareText = `📋 Uzdevums: ${task.title}\n\n📝 Apraksts: ${
        task.description || "Nav norādīts"
      }\n\n📅 Datums: ${task.dueDate.toLocaleDateString("lv-LV")}\n⏰ Laiks: ${
        task.dueTime
      }\n\n✅ Status: ${task.completed ? "Pabeigts" : "Nepabeigts"}`;

      const result = await Share.share({
        message: shareText,
        title: `Uzdevums: ${task.title}`,
      });

      if (result.action === Share.sharedAction) {
        console.log("Задание из календаря успешно расшарено");
      }
    } catch (error) {
      console.error("Ошибка при шаринге из календаря:", error);
      Alert.alert("Kļūda", "Neizdevās dalīties ar uzdevumu");
    }
  };

  return (
    <View style={[styles.container, { padding: 15 }]}>
      <AnimatedBackground />

      {/* Информация о заданиях */}
      <View style={styles.calendarHeader}>
        <Text style={styles.calendarTitle}>Kalendārs</Text>
        <Text style={styles.calendarSubtitle}>
          {tasks.length > 0
            ? `${tasks.length} uzdevumi plānoti`
            : "Nav plānotu uzdevumu"}
        </Text>
      </View>

      <Calendar
        style={{
          borderRadius: 10,
          elevation: 4,
          margin: 5,
          backgroundColor: "rgba(17, 24, 39, 0.95)",
        }}
        theme={{
          backgroundColor: "transparent",
          calendarBackground: "rgba(17, 24, 39, 0.95)",
          textSectionTitleColor: "#fff",
          selectedDayBackgroundColor: "#60A5FA",
          selectedDayTextColor: "#ffffff",
          todayTextColor: "#60A5FA",
          dayTextColor: "#fff",
          textDisabledColor: "#666",
          dotColor: "#EF4444",
          selectedDotColor: "#ffffff",
          arrowColor: "#60A5FA",
          monthTextColor: "#fff",
          textMonthFontWeight: "bold",
          textDayFontSize: 16,
          textMonthFontSize: 16,
          textDayHeaderFontSize: 14,
        }}
        onDayPress={onDayPress}
        markedDates={getMarkedDates()}
        enableSwipeMonths={true}
        markingType={"custom"}
      />

      {/* Легенда */}
      <View style={styles.calendarLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#EF4444" }]} />
          <Text style={styles.legendText}>Datumi ar uzdevumiem</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#60A5FA" }]} />
          <Text style={styles.legendText}>Izvēlētais datums</Text>
        </View>
      </View>

      {/* Модальное окно с заданиями для выбранной даты */}
      <Modal visible={showTasksModal} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Uzdevumi{" "}
                {selectedDate
                  ? new Date(selectedDate + "T00:00:00").toLocaleDateString(
                      "lv-LV"
                    )
                  : ""}
              </Text>
              <TouchableOpacity onPress={() => setShowTasksModal(false)}>
                <Ionicons name="close" size={24} color="#FF3B30" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={selectedDateTasks}
              renderItem={({ item }) => (
                <View style={styles.taskInCalendar}>
                  <View style={styles.taskInCalendarHeader}>
                    <Ionicons
                      name={
                        item.completed ? "checkmark-circle" : "radio-button-off"
                      }
                      size={24}
                      color={item.completed ? "#10B981" : "#6B7280"}
                    />
                    <Text
                      style={[
                        styles.taskInCalendarTitle,
                        item.completed && styles.taskCompleted,
                      ]}
                    >
                      {item.title}
                    </Text>
                    <TouchableOpacity
                      onPress={() => shareTaskFromCalendar(item)}
                      style={styles.shareButton}
                    >
                      <Ionicons name="share" size={20} color="#10B981" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.taskInCalendarTime}>
                    {formatTaskTime(item.dueTime, item.dueDate)}
                  </Text>
                  {item.description && (
                    <Text style={styles.taskInCalendarDescription}>
                      {item.description}
                    </Text>
                  )}
                </View>
              )}
              keyExtractor={(item) => item.id}
              style={styles.tasksList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <Text style={styles.noTasksText}>Nav uzdevumu šai datumam</Text>
              }
            />

            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setShowTasksModal(false)}
            >
              <Text style={styles.closeModalButtonText}>Aizvērt</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Define types for the authentication stack navigator
type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

type LoginScreenNavigationProp = StackNavigationProp<
  AuthStackParamList,
  "Login"
>;
type RegistrationScreenNavigationProp = StackNavigationProp<
  AuthStackParamList,
  "Register"
>;

const Tab = createBottomTabNavigator();
const AuthStack = createStackNavigator<AuthStackParamList>();

function AuthStackNavigator({
  setIsAuthenticated,
}: {
  setIsAuthenticated: (isAuthenticated: boolean) => void;
}) {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login">
        {({ navigation }: { navigation: LoginScreenNavigationProp }) => (
          <LoginScreen
            onLoginSuccess={() => setIsAuthenticated(true)}
            onGoToRegister={() => navigation.navigate("Register")}
          />
        )}
      </AuthStack.Screen>
      <AuthStack.Screen name="Register">
        {({ navigation }: { navigation: RegistrationScreenNavigationProp }) => (
          <RegistrationScreen
            onRegisterSuccess={() => setIsAuthenticated(true)}
            onGoToLogin={() => navigation.navigate("Login")}
          />
        )}
      </AuthStack.Screen>
    </AuthStack.Navigator>
  );
}

function ProfileScreen({
  user,
  onLogout,
}: {
  user: { email: string; user_id: number } | null;
  onLogout: () => void;
}) {
  return (
    <View style={styles.container}>
      <AnimatedBackground />
      <View style={styles.header}>
        <Text style={styles.title}>Профиль</Text>
      </View>
      <View style={{ padding: 20 }}>
        {user && (
          <View style={styles.userInfo}>
            <Text style={styles.userEmail}>{user.email}</Text>
            <Text style={styles.userId}>ID: {user.user_id}</Text>
          </View>
        )}
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Ionicons name="log-out-outline" size={24} color="#fff" />
          <Text style={styles.logoutButtonText}>Выйти</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function MainAppNavigator({
  user,
  onLogout,
}: {
  user: { email: string; user_id: number } | null;
  onLogout: () => void;
}) {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: "#60A5FA",
        tabBarInactiveTintColor: "#6B7280",
        tabBarStyle: {
          backgroundColor: "rgba(17, 24, 39, 0.95)",
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
          height: 60,
          paddingBottom: 8,
        },
        headerStyle: {
          backgroundColor: "rgba(17, 24, 39, 0.95)",
          elevation: 0,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
        },
        headerTitleStyle: {
          fontWeight: "bold",
          fontSize: 20,
          color: "#fff",
        },
        headerTitleAlign: "center",
      }}
    >
      <Tab.Screen
        name="Planner"
        component={PlannerScreen}
        options={{
          title: "Plānotājs",
          tabBarLabel: "Plānotājs",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          title: "Kalendārs",
          tabBarLabel: "Kalendārs",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AudioDiary"
        component={AudioDiaryScreen}
        options={{
          title: "Audio dienasgrāmata",
          tabBarLabel: "Dienasgrāmata",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="mic" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        options={{
          title: "Профиль",
          tabBarLabel: "Профиль",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      >
        {() => <ProfileScreen user={user} onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ email: string; user_id: number } | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  // Проверяем статус авторизации при запуске приложения
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch(
        "https://laucve1.dreamhosters.com/backend2/user.php",
        {
          credentials: "include",
        }
      );
      const data = await response.json();

      if (response.ok && data.authenticated) {
        setIsAuthenticated(true);
        setUser(data);
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
    checkAuthStatus(); // Получаем данные пользователя
  };

  const handleLogout = async () => {
    try {
      await fetch("https://laucve1.dreamhosters.com/backend2/logout.php", {
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  if (loading) {
    return (
      <View
        style={[
          styles.root,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <Text style={{ color: "#fff", fontSize: 18 }}>Загрузка...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <View style={styles.root}>
        {isAuthenticated ? (
          <MainAppNavigator user={user} onLogout={handleLogout} />
        ) : (
          <AuthStackNavigator setIsAuthenticated={handleLogin} />
        )}
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
    backgroundColor: "transparent",
    position: "relative",
  },
  header: {
    padding: 20,
    backgroundColor: "rgba(17, 24, 39, 0.95)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(75, 85, 99, 0.3)",
    marginBottom: 10,
  },
  title: {
    fontSize: 34,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 10,
  },
  progressContainer: {
    marginTop: 15,
  },
  progressBar: {
    height: 8,
    backgroundColor: "rgba(75, 85, 99, 0.3)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#60A5FA",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 8,
    fontWeight: "500",
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 15,
    paddingBottom: 100,
  },
  addButton: {
    position: "absolute",
    right: 20,
    bottom: 25,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#60A5FA",
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#60A5FA",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  modalContent: {
    backgroundColor: "rgba(17, 24, 39, 0.95)",
    borderRadius: 20,
    padding: 20,
    margin: 20,
    marginTop: Platform.OS === "ios" ? 50 : 20,
    borderWidth: 1,
    borderColor: "rgba(75, 85, 99, 0.3)",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(75, 85, 99, 0.3)",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    backgroundColor: "rgba(31, 41, 55, 0.95)",
    borderRadius: 12,
    padding: 5,
    borderWidth: 1,
    borderColor: "rgba(75, 85, 99, 0.3)",
  },
  inputIcon: {
    marginHorizontal: 12,
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: "#fff",
  },
  textArea: {
    height: 120,
    textAlignVertical: "top",
  },
  dateTimeSection: {
    marginTop: 10,
    marginBottom: 20,
    padding: 15,
    backgroundColor: "rgba(31, 41, 55, 0.95)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(75, 85, 99, 0.3)",
  },
  sectionTitle: {
    fontSize: 14,
    color: "#9CA3AF",
    marginBottom: 10,
    textAlign: "center",
  },
  dateTimeGrid: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
  },
  pickerColumn: {
    width: "40%",
    alignItems: "center",
  },
  pickerLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 4,
    textAlign: "center",
  },
  pickerContainer: {
    backgroundColor: "rgba(17, 24, 39, 0.95)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(75, 85, 99, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    height: 40,
    overflow: "hidden",
  },
  picker: {
    width: 100,
    height: 40,
  },
  saveButtonLarge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#60A5FA",
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: Platform.OS === "ios" ? 30 : 20,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
    marginLeft: 10,
  },
  calendarHeader: {
    padding: 20,
    backgroundColor: "rgba(17, 24, 39, 0.95)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(75, 85, 99, 0.3)",
    marginBottom: 10,
  },
  calendarTitle: {
    fontSize: 34,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 10,
  },
  calendarSubtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  calendarLegend: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  legendText: {
    fontSize: 14,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  taskInCalendar: {
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(75, 85, 99, 0.3)",
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: "rgba(31, 41, 55, 0.8)",
  },
  taskInCalendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  taskInCalendarTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginLeft: 10,
    flex: 1,
  },
  taskInCalendarTime: {
    fontSize: 14,
    color: "#9CA3AF",
    marginBottom: 2,
  },
  taskInCalendarDescription: {
    fontSize: 14,
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  taskCompleted: {
    textDecorationLine: "line-through",
    color: "#6B7280",
  },
  tasksList: {
    maxHeight: 300,
  },
  noTasksText: {
    fontSize: 16,
    color: "#9CA3AF",
    textAlign: "center",
    padding: 20,
    fontStyle: "italic",
  },
  closeModalButton: {
    backgroundColor: "#60A5FA",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  closeModalButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
  shareButton: {
    padding: 5,
  },
  userInfo: {
    backgroundColor: "rgba(31, 41, 55, 0.95)",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(75, 85, 99, 0.3)",
  },
  userEmail: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 8,
  },
  userId: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EF4444",
    padding: 16,
    borderRadius: 12,
    marginTop: 10,
  },
  logoutButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
    marginLeft: 10,
  },
});
