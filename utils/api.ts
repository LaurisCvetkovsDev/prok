const API_BASE_URL = 'https://laucve1.dreamhosters.com/backend2';

// Утилиты для работы с задачами
export const TaskAPI = {
  // Получить все задачи пользователя
  async getTasks() {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks.php`, {
        credentials: 'include',
      });
      const data = await response.json();
      
      if (response.ok) {
        return data.map((task: any) => ({
          ...task,
          dueDate: new Date(task.dueDate),
          id: task.id.toString(),
        }));
      } else {
        console.error('Error loading tasks:', data.error);
        return [];
      }
    } catch (error) {
      console.error('Network error loading tasks:', error);
      return [];
    }
  },

  // Создать новую задачу
  async createTask(task: any) {
    try {
      console.log('Creating task:', task);
      
      const response = await fetch(`${API_BASE_URL}/tasks.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'create',
          title: task.title,
          description: task.description,
          dueDate: task.dueDate.toISOString().split('T')[0],
          dueTime: task.dueTime,
          category_id: task.category_id,
        }),
      });
      
      console.log('Response status:', response.status);
      const responseText = await response.text();
      console.log('Response text:', responseText);
      
      if (!responseText) {
        console.error('Empty response from server');
        return false;
      }
      
      const data = JSON.parse(responseText);
      console.log('Parsed data:', data);
      
      if (!response.ok) {
        console.error('Server error:', data.error);
        return false;
      }
      
      return data.success;
    } catch (error) {
      console.error('Error creating task:', error);
      return false;
    }
  },

  // Обновить задачу
  async updateTask(task: any) {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'update',
          id: task.id,
          title: task.title,
          description: task.description,
          completed: task.completed,
          dueDate: task.dueDate.toISOString().split('T')[0],
          dueTime: task.dueTime,
        }),
      });
      
      const data = await response.json();
      return response.ok && data.success;
    } catch (error) {
      console.error('Error updating task:', error);
      return false;
    }
  },

  // Удалить задачу
  async deleteTask(taskId: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'delete',
          id: taskId,
        }),
      });
      
      const data = await response.json();
      return response.ok && data.success;
    } catch (error) {
      console.error('Error deleting task:', error);
      return false;
    }
  },
};

// Утилиты для работы с дневником
export const DiaryAPI = {
  // Получить все записи дневника
  async getEntries() {
    try {
      const response = await fetch(`${API_BASE_URL}/diary.php`, {
        credentials: 'include',
      });
      const data = await response.json();
      
      if (response.ok) {
        return data.map((entry: any) => ({
          id: entry.id.toString(),
          title: entry.title || 'Bez nosaukuma',
          text: entry.content,
          date: new Date(entry.date),
          tags: entry.tags || [],
          audioUri: entry.audio_url,
          transcription: entry.transcription,
          isAudioProcessed: entry.is_audio_processed,
          created_at: entry.created_at,
        }));
      } else {
        console.error('Error loading diary entries:', data.error);
        return [];
      }
    } catch (error) {
      console.error('Network error loading diary entries:', error);
      return [];
    }
  },

  // Создать новую запись
  async createEntry(entry: any) {
    try {
      const response = await fetch(`${API_BASE_URL}/diary.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'create',
          title: entry.title,
          date: entry.date.toISOString().split('T')[0],
          content: entry.text,
          tags: entry.tags || [],
          audio_url: entry.audioUri,
          transcription: entry.transcription,
          is_audio_processed: entry.isAudioProcessed,
        }),
      });
      
      const data = await response.json();
      return response.ok && data.success;
    } catch (error) {
      console.error('Error creating diary entry:', error);
      return false;
    }
  },

  // Обновить запись
  async updateEntry(entry: any) {
    try {
      const response = await fetch(`${API_BASE_URL}/diary.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'update',
          id: entry.id,
          content: entry.text,
          tags: entry.tags || [],
        }),
      });
      
      const data = await response.json();
      return response.ok && data.success;
    } catch (error) {
      console.error('Error updating diary entry:', error);
      return false;
    }
  },

  // Удалить запись
  async deleteEntry(entryId: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/diary.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'delete',
          id: entryId,
        }),
      });
      
      const data = await response.json();
      return response.ok && data.success;
    } catch (error) {
      console.error('Error deleting diary entry:', error);
      return false;
    }
  },

  // Загрузить аудиофайл
  async uploadAudio(audioUri: string) {
    try {
      const formData = new FormData();
      const filename = `audio_${Date.now()}.wav`;
      
      formData.append('audio', {
        uri: audioUri,
        type: 'audio/wav',
        name: filename,
      } as any);

      const response = await fetch(`${API_BASE_URL}/upload_audio.php`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        return data.audio_url;
      } else {
        console.error('Error uploading audio:', data.error);
        return null;
      }
    } catch (error) {
      console.error('Network error uploading audio:', error);
      return null;
    }
  },
}; 