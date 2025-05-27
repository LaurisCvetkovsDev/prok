import React, { useState, useEffect } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DiaryEntry, Category, Task } from "../types";
import { AnimatedBackground } from "./AnimatedBackground";
import { AudioRecorder } from "./AudioRecorder";
import { DiaryEntryItem } from "./DiaryEntryItem";
import { DiaryAPI, TaskAPI } from "../utils/api";
import { loadCategories, saveCategories } from "../utils/storage";

export function AudioDiaryScreen() {
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showRecorder, setShowRecorder] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DiaryEntry | null>(null);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [searchText, setSearchText] = useState("");

  // Поля для создания/редактирования записи
  const [entryTitle, setEntryTitle] = useState("");
  const [entryText, setEntryText] = useState("");
  const [entryTags, setEntryTags] = useState("");
  const [recordedAudioUri, setRecordedAudioUri] = useState<string | null>(null);
  const [audioTranscription, setAudioTranscription] = useState<string | null>(
    null
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const loadedEntries = await DiaryAPI.getEntries();
    const loadedCategories = await loadCategories();
    const loadedTasks = await TaskAPI.getTasks();
    setDiaryEntries(loadedEntries);
    setCategories(loadedCategories);
    setTasks(loadedTasks);
  };

  const handleRecordingComplete = (
    audioUri: string,
    transcription?: string,
    confidence?: number
  ) => {
    setRecordedAudioUri(audioUri);
    setAudioTranscription(transcription || null);
    if (transcription) {
      setEntryText(transcription);
      // Автоматически устанавливаем заголовок на основе первых слов
      if (!entryTitle.trim()) {
        const firstWords = transcription.split(" ").slice(0, 5).join(" ");
        setEntryTitle(
          firstWords.length > 30
            ? firstWords.substring(0, 30) + "..."
            : firstWords
        );
      }
    }
    setShowRecorder(false);
    setShowEntryModal(true);
  };

  const resetEntryForm = () => {
    setEntryTitle("");
    setEntryText("");
    setEntryTags("");
    setSelectedCategory("");
    setSelectedTaskId("");
    setRecordedAudioUri(null);
    setAudioTranscription(null);
    setEditingEntry(null);
  };

  const saveEntry = async () => {
    if (!entryTitle.trim() && !entryText.trim()) {
      Alert.alert("Kļūda", "Ievadiet ieraksta nosaukumu vai tekstu");
      return;
    }

    const tags = entryTags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    try {
      let audioUrl = null;

      // Если есть аудиофайл, сначала загружаем его
      if (recordedAudioUri && !editingEntry) {
        audioUrl = await DiaryAPI.uploadAudio(recordedAudioUri);
        if (!audioUrl) {
          Alert.alert("Kļūda", "Neizdevās augšupielādēt audio failu");
          return;
        }
      }

      if (editingEntry) {
        // Редактирование существующей записи
        const success = await DiaryAPI.updateEntry({
          id: editingEntry.id,
          title: entryTitle || "Bez nosaukuma",
          text: entryText,
          tags,
        });

        if (success) {
          setDiaryEntries((prev) =>
            prev.map((entry) =>
              entry.id === editingEntry.id
                ? {
                    ...entry,
                    title: entryTitle || "Bez nosaukuma",
                    text: entryText,
                    tags,
                  }
                : entry
            )
          );
        } else {
          Alert.alert("Kļūda", "Neizdevās atjaunināt ierakstu");
          return;
        }
      } else {
        // Создание новой записи
        const success = await DiaryAPI.createEntry({
          title: entryTitle || "Bez nosaukuma",
          text: entryText,
          date: new Date(),
          tags,
          audioUri: audioUrl,
          transcription: audioTranscription,
          isAudioProcessed: !!audioTranscription,
        });

        if (success) {
          // Перезагружаем данные, чтобы получить правильный ID из базы данных
          await loadData();
        } else {
          Alert.alert("Kļūda", "Neizdevās izveidot ierakstu");
          return;
        }
      }

      setShowEntryModal(false);
      resetEntryForm();
    } catch (error) {
      console.error("Error saving entry:", error);
      Alert.alert("Kļūda", "Radās problēma saglabājot ierakstu");
    }
  };

  const editEntry = (entry: DiaryEntry) => {
    setEditingEntry(entry);
    setEntryTitle(entry.title);
    setEntryText(entry.text);
    setEntryTags(entry.tags.join(", "));
    setSelectedCategory(entry.categoryId || "");
    setSelectedTaskId(entry.taskId || "");
    setShowEntryModal(true);
  };

  const deleteEntry = async (id: string) => {
    try {
      const success = await DiaryAPI.deleteEntry(id);
      if (success) {
        setDiaryEntries((prev) => prev.filter((entry) => entry.id !== id));
      } else {
        Alert.alert("Kļūda", "Neizdevās dzēst ierakstu");
      }
    } catch (error) {
      console.error("Error deleting entry:", error);
      Alert.alert("Kļūda", "Radās problēma dzēšot ierakstu");
    }
  };

  const addToTask = (entry: DiaryEntry) => {
    // Здесь будет логика добавления записи к задаче
    Alert.alert(
      "Pievienot uzdevumam",
      `Vai vēlaties izveidot jaunu uzdevumu no "${entry.title}"?`,
      [
        { text: "Atcelt", style: "cancel" },
        {
          text: "Izveidot uzdevumu",
          onPress: () => {
            // TODO: Интеграция с планировщиком задач
            Alert.alert(
              "Paziņojums",
              "Uzdevums tiks izveidots nākamajā versijā"
            );
          },
        },
      ]
    );
  };

  const filteredEntries = diaryEntries.filter((entry) => {
    const matchesSearch =
      !searchText ||
      entry.title.toLowerCase().includes(searchText.toLowerCase()) ||
      entry.text.toLowerCase().includes(searchText.toLowerCase()) ||
      entry.tags.some((tag) =>
        tag.toLowerCase().includes(searchText.toLowerCase())
      );

    const matchesCategory =
      !selectedCategory || entry.categoryId === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const getCategoryById = (id: string) =>
    categories.find((cat) => cat.id === id);

  const getTaskById = (id: string) => tasks.find((task) => task.id === id);

  const getAvailableTasks = () => {
    // Возвращаем только незавершенные задания
    return tasks.filter((task) => !task.completed);
  };

  return (
    <View style={styles.container}>
      <AnimatedBackground />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Audio dienasgrāmata</Text>
        <View style={styles.headerStats}>
          <Text style={styles.statsText}>{diaryEntries.length} ieraksti</Text>
        </View>
      </View>

      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Meklēt ierakstus..."
            placeholderTextColor="#9CA3AF"
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText("")}>
              <Ionicons name="close" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
          contentContainerStyle={styles.categoriesContainer}
        >
          <TouchableOpacity
            style={[
              styles.categoryChip,
              selectedCategory === "" && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory("")}
          >
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === "" && styles.categoryChipTextActive,
              ]}
            >
              Visi
            </Text>
          </TouchableOpacity>

          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryChip,
                selectedCategory === category.id && styles.categoryChipActive,
                { borderColor: category.color },
              ]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <View
                style={[
                  styles.categoryDot,
                  { backgroundColor: category.color },
                ]}
              />
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === category.id &&
                    styles.categoryChipTextActive,
                ]}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Entries List */}
      <FlatList
        data={filteredEntries}
        renderItem={({ item }) => (
          <DiaryEntryItem
            entry={item}
            category={getCategoryById(item.categoryId || "")}
            task={getTaskById(item.taskId || "")}
            onEdit={editEntry}
            onDelete={deleteEntry}
            onAddToTask={addToTask}
          />
        )}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="mic-outline" size={48} color="#6B7280" />
            <Text style={styles.emptyTitle}>Nav ierakstu</Text>
            <Text style={styles.emptyText}>
              Izveidojiet savu pirmo audio ierakstu vai teksta piezīmi
            </Text>
          </View>
        }
      />

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.textButton}
          onPress={() => {
            resetEntryForm();
            setShowEntryModal(true);
          }}
        >
          <Ionicons name="document-text" size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.recordButton}
          onPress={() => setShowRecorder(true)}
        >
          <Ionicons name="mic" size={30} color="white" />
        </TouchableOpacity>
      </View>

      {/* Audio Recorder Modal */}
      <Modal visible={showRecorder} animationType="slide" transparent={false}>
        <AudioRecorder
          onRecordingComplete={handleRecordingComplete}
          onCancel={() => setShowRecorder(false)}
        />
      </Modal>

      {/* Entry Edit Modal */}
      <Modal visible={showEntryModal} animationType="slide" transparent={true}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalContainer}>
              <ScrollView>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>
                      {editingEntry ? "Rediģēt ierakstu" : "Jauns ieraksts"}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        setShowEntryModal(false);
                        resetEntryForm();
                      }}
                    >
                      <Ionicons name="close" size={24} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Nosaukums</Text>
                    <TextInput
                      style={styles.input}
                      value={entryTitle}
                      onChangeText={setEntryTitle}
                      placeholder="Ievadiet ieraksta nosaukumu..."
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Kategorija</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                    >
                      <TouchableOpacity
                        style={[
                          styles.categoryOption,
                          selectedCategory === "" &&
                            styles.categoryOptionActive,
                        ]}
                        onPress={() => setSelectedCategory("")}
                      >
                        <Text
                          style={[
                            styles.categoryOptionText,
                            selectedCategory === "" &&
                              styles.categoryOptionTextActive,
                          ]}
                        >
                          Nav kategorijas
                        </Text>
                      </TouchableOpacity>

                      {categories.map((category) => (
                        <TouchableOpacity
                          key={category.id}
                          style={[
                            styles.categoryOption,
                            selectedCategory === category.id &&
                              styles.categoryOptionActive,
                            { borderColor: category.color },
                          ]}
                          onPress={() => setSelectedCategory(category.id)}
                        >
                          <View
                            style={[
                              styles.categoryDot,
                              { backgroundColor: category.color },
                            ]}
                          />
                          <Text
                            style={[
                              styles.categoryOptionText,
                              selectedCategory === category.id &&
                                styles.categoryOptionTextActive,
                            ]}
                          >
                            {category.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  <View style={styles.inputContainer}>
                    <View style={styles.taskSelectorHeader}>
                      <Text style={styles.inputLabel}>Pievienot uzdevumam</Text>
                      {selectedTaskId && (
                        <TouchableOpacity
                          onPress={() => setSelectedTaskId("")}
                          style={styles.clearTaskButton}
                        >
                          <Ionicons
                            name="close-circle"
                            size={20}
                            color="#EF4444"
                          />
                          <Text style={styles.clearTaskText}>Noņemt</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    {selectedTaskId ? (
                      <View style={styles.selectedTaskContainer}>
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color="#10B981"
                        />
                        <View style={styles.selectedTaskInfo}>
                          <Text style={styles.selectedTaskTitle}>
                            {getTaskById(selectedTaskId)?.title}
                          </Text>
                          <Text style={styles.selectedTaskDate}>
                            {getTaskById(
                              selectedTaskId
                            )?.dueDate.toLocaleDateString("lv-LV")}{" "}
                            • {getTaskById(selectedTaskId)?.dueTime}
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.taskSelector}
                        onPress={() => setShowTaskPicker(true)}
                      >
                        <Ionicons
                          name="add-circle-outline"
                          size={20}
                          color="#60A5FA"
                        />
                        <Text style={styles.taskSelectorText}>
                          {getAvailableTasks().length > 0
                            ? "Izvēlieties uzdevumu..."
                            : "Nav pieejamu uzdevumu"}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Teksts</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={entryText}
                      onChangeText={setEntryText}
                      placeholder="Ievadiet ieraksta tekstu..."
                      placeholderTextColor="#9CA3AF"
                      multiline
                      numberOfLines={6}
                      textAlignVertical="top"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>
                      Tegi (atdalīti ar komatu)
                    </Text>
                    <TextInput
                      style={styles.input}
                      value={entryTags}
                      onChangeText={setEntryTags}
                      placeholder="darbs, idejas, svarīgi..."
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => {
                        setShowEntryModal(false);
                        resetEntryForm();
                      }}
                    >
                      <Text style={styles.cancelButtonText}>Atcelt</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.saveButtonModal}
                      onPress={saveEntry}
                    >
                      <Text style={styles.saveButtonText}>
                        {editingEntry
                          ? "Saglabāt izmaiņas"
                          : "Izveidot ierakstu"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Task Picker Modal */}
      <Modal visible={showTaskPicker} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Izvēlieties uzdevumu</Text>
              <TouchableOpacity onPress={() => setShowTaskPicker(false)}>
                <Ionicons name="close" size={24} color="#FF3B30" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={getAvailableTasks()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.taskPickerItem}
                  onPress={() => {
                    setSelectedTaskId(item.id);
                    setShowTaskPicker(false);
                  }}
                >
                  <View style={styles.taskPickerHeader}>
                    <Ionicons name="list" size={20} color="#60A5FA" />
                    <Text style={styles.taskPickerTitle}>{item.title}</Text>
                  </View>
                  {item.description && (
                    <Text style={styles.taskPickerDescription}>
                      {item.description}
                    </Text>
                  )}
                  <Text style={styles.taskPickerDate}>
                    {item.dueDate.toLocaleDateString("lv-LV")} • {item.dueTime}
                  </Text>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.id}
              style={styles.tasksList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyTasksContainer}>
                  <Ionicons name="list-outline" size={48} color="#6B7280" />
                  <Text style={styles.emptyTasksText}>
                    Nav pieejamu uzdevumu
                  </Text>
                  <Text style={styles.emptyTasksSubtext}>
                    Izveidojiet uzdevumus plānotājā, lai tos varētu pievienot
                    ierakstiem
                  </Text>
                </View>
              }
            />

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowTaskPicker(false)}
            >
              <Text style={styles.cancelButtonText}>Atcelt</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
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
  },
  title: {
    fontSize: 34,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 10,
  },
  headerStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statsText: {
    fontSize: 14,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  searchContainer: {
    padding: 16,
    backgroundColor: "rgba(17, 24, 39, 0.8)",
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(31, 41, 55, 0.8)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(75, 85, 99, 0.3)",
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    marginLeft: 12,
  },
  categoriesScroll: {
    marginBottom: 8,
  },
  categoriesContainer: {
    flexDirection: "row",
    paddingRight: 16,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(31, 41, 55, 0.8)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "rgba(75, 85, 99, 0.3)",
  },
  categoryChipActive: {
    backgroundColor: "rgba(96, 165, 250, 0.2)",
    borderColor: "#60A5FA",
  },
  categoryChipText: {
    color: "#9CA3AF",
    fontSize: 14,
    fontWeight: "500",
  },
  categoryChipTextActive: {
    color: "#60A5FA",
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#9CA3AF",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 32,
  },
  actionButtons: {
    position: "absolute",
    right: 20,
    bottom: 25,
    flexDirection: "column",
    gap: 12,
  },
  textButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  recordButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#EF4444",
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
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#E5E7EB",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "rgba(31, 41, 55, 0.8)",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#fff",
    borderWidth: 1,
    borderColor: "rgba(75, 85, 99, 0.3)",
  },
  textArea: {
    height: 120,
  },
  categoryOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(31, 41, 55, 0.8)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "rgba(75, 85, 99, 0.3)",
  },
  categoryOptionActive: {
    backgroundColor: "rgba(96, 165, 250, 0.2)",
    borderColor: "#60A5FA",
  },
  categoryOptionText: {
    color: "#9CA3AF",
    fontSize: 14,
    fontWeight: "500",
  },
  categoryOptionTextActive: {
    color: "#60A5FA",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 32,
    gap: 16,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "rgba(75, 85, 99, 0.3)",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(75, 85, 99, 0.5)",
  },
  cancelButtonText: {
    color: "#9CA3AF",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButtonModal: {
    flex: 1,
    backgroundColor: "#60A5FA",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  taskSelectorHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  clearTaskButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  clearTaskText: {
    color: "#EF4444",
    fontSize: 16,
    fontWeight: "600",
  },
  selectedTaskContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  selectedTaskInfo: {
    marginLeft: 8,
  },
  selectedTaskTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  selectedTaskDate: {
    color: "#9CA3AF",
    fontSize: 14,
    fontWeight: "500",
  },
  taskSelector: {
    flexDirection: "row",
    alignItems: "center",
  },
  taskSelectorText: {
    color: "#60A5FA",
    fontSize: 16,
    fontWeight: "600",
  },
  taskPickerItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(75, 85, 99, 0.3)",
  },
  taskPickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  taskPickerTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  taskPickerDescription: {
    color: "#9CA3AF",
    fontSize: 14,
    fontWeight: "500",
  },
  taskPickerDate: {
    color: "#9CA3AF",
    fontSize: 14,
    fontWeight: "500",
  },
  tasksList: {
    flex: 1,
  },
  emptyTasksContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 80,
  },
  emptyTasksText: {
    fontSize: 24,
    fontWeight: "600",
    color: "#9CA3AF",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyTasksSubtext: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 32,
  },
});
