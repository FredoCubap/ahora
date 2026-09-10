import Database from "@tauri-apps/plugin-sql";

export interface Task {
  id?: number;
  title: string;
  description: string;
  start_date: string; 
  end_date: string;   
  priority: 'Baja' | 'Media' | 'Alta';
  status: 'Pendiente' | 'En Progreso' | 'Completada';
  created_at?: string;
}

// Usamos la ruta más simple posible para que Tauri gestione el almacenamiento automáticamente
const DB_NAME = "sqlite:agenda.db";

export async function initDb() {
  try {
    const db = await Database.load(DB_NAME);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        priority TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    return db;
  } catch (error) {
    console.error("Error en initDb:", error);
    throw error;
  }
}

export async function getTasks(): Promise<Task[]> {
  const db = await Database.load(DB_NAME);
  return await db.select<Task[]>("SELECT * FROM tasks ORDER BY start_date ASC");
}

export async function addTask(task: Task): Promise<void> {
  const db = await Database.load(DB_NAME);
  await db.execute(
    "INSERT INTO tasks (title, description, start_date, end_date, priority, status) VALUES (?, ?, ?, ?, ?, ?)",
    [task.title, task.description, task.start_date, task.end_date, task.priority, task.status]
  );
}

export async function updateTask(id: number, task: Partial<Task>): Promise<void> {
  const db = await Database.load(DB_NAME);
  const fields = Object.keys(task).map(key => `${key} = ?`).join(", ");
  const values = Object.values(task);
  await db.execute(`UPDATE tasks SET ${fields} WHERE id = ?`, [...values, id]);
}

export async function deleteTask(id: number): Promise<void> {
  const db = await Database.load(DB_NAME);
  await db.execute("DELETE FROM tasks WHERE id = ?", [id]);
}
