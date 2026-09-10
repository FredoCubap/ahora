import { useEffect, useState } from "react";
import { initDb, getTasks, addTask, Task } from "./lib/db";
import { Plus, Calendar, CheckCircle2, Clock, AlertCircle } from "lucide-react";

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: "",
    description: "",
    priority: "Media",
    status: "Pendiente",
    start_date: new Date().toISOString().slice(0, 16),
    end_date: new Date().toISOString().slice(0, 16),
  });

  useEffect(() => {
    async function setup() {
      try {
        await initDb();
        await refreshTasks();
      } catch (e) {
        console.error("Error during setup:", e);
      }
    }
    setup();
  }, []);

  async function refreshTasks() {
    try {
      const data = await getTasks();
      setTasks(data);
    } catch (e) {
      console.error("Error refreshing tasks:", e);
    }
  }

  async function handleAddTask() {
    if (!newTask.title || !newTask.start_date || !newTask.end_date) {
      alert("Por favor, completa los campos obligatorios");
      return;
    }
    
    try {
      // Aseguramos que el objeto sea una instancia limpia de Task
      const taskToSave: Task = {
        title: String(newTask.title),
        description: String(newTask.description || ""),
        start_date: String(newTask.start_date),
        end_date: String(newTask.end_date),
        priority: (newTask.priority as any) || "Media",
        status: (newTask.status as any) || "Pendiente",
      };

      await addTask(taskToSave);
      await refreshTasks();
      setIsModalOpen(false);
      setNewTask({
        title: "",
        description: "",
        priority: "Media",
        status: "Pendiente",
        start_date: new Date().toISOString().slice(0, 16),
        end_date: new Date().toISOString().slice(0, 16),
      });
    } catch (e: any) {
      console.error("DETALLE DEL ERROR DE GUARDADO:", e);
      alert(`Error al guardar: ${e.message || "Error desconocido en el plugin SQL"}`);
    }
  }

  const formatDateTime = (isoString: string) => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      return date.toLocaleString('es-ES', { 
        day: '2-digit', 
        month: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    } catch (e) {
      return isoString;
    }
  };

  return (
    <div className="min-h-screen bg-base-200 text-base-content p-4 md:p-8 font-sans">
      {/* Header */}
      <header className="max-w-6xl mx-auto flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="text-primary" /> 
            Agenda de Trabajo
          </h1>
          <p className="text-base-content/60">Gestiona tus prioridades y tiempos</p>
        </div>
        <button 
          className="btn btn-primary btn-md gap-2"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus size={20} /> Nueva Tarea
        </button>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tasks.length === 0 ? (
          <div className="col-span-full text-center py-20 opacity-50">
            <AlertCircle size={48} className="mx-auto mb-4" />
            <p className="text-xl">No hay tareas programadas. ¡Empieza creando una!</p>
          </div>
        ) : (
          tasks.map(task => (
            <div key={task.id} className="card bg-base-100 shadow-xl border-l-4 border-primary">
              <div className="card-body p-5">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="card-title text-lg">{task.title}</h3>
                  <div className={`badge badge-sm ${
                    task.priority === 'Alta' ? 'badge-error' : 
                    task.priority === 'Media' ? 'badge-warning' : 'badge-success'
                  }`}>
                    {task.priority}
                  </div>
                </div>
                <p className="text-sm opacity-70 mb-4 line-clamp-2">{task.description}</p>
                
                <div className="flex flex-col gap-2 text-xs opacity-60">
                  <div className="flex items-center gap-2">
                    <Clock size={14} /> 
                    {formatDateTime(task.start_date)} $\rightarrow$ {formatDateTime(task.end_date)}
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} /> {task.status}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </main>

      {/* Modal Simple */}
      {isModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Añadir Nueva Tarea</h3>
            <div className="flex flex-col gap-4">
              <input 
                type="text" 
                placeholder="Título de la tarea" 
                className="input input-bordered w-full"
                value={newTask.title}
                onChange={e => setNewTask({...newTask, title: e.target.value})}
              />
              <textarea 
                placeholder="Descripción" 
                className="textarea textarea-bordered w-full"
                value={newTask.description}
                onChange={e => setNewTask({...newTask, description: e.target.value})}
              />
              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label"><span className="label-text">Inicio</span></label>
                  <input 
                    type="datetime-local" 
                    className="input input-bordered w-full"
                    value={newTask.start_date}
                    onChange={e => setNewTask({...newTask, start_date: e.target.value})}
                  />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">Fin</span></label>
                  <input 
                    type="datetime-local" 
                    className="input input-bordered w-full"
                    value={newTask.end_date}
                    onChange={e => setNewTask({...newTask, end_date: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <select 
                  className="select select-bordered flex-1"
                  value={newTask.priority}
                  onChange={e => setNewTask({...newTask, priority: e.target.value as any})}
                >
                  <option value="Baja">Baja</option>
                  <option value="Media">Media</option>
                  <option value="Alta">Alta</option>
                </select>
                <select 
                  className="select select-bordered flex-1"
                  value={newTask.status}
                  onChange={e => setNewTask({...newTask, status: e.target.value as any})}
                >
                  <option value="Pendiente">Pendiente</option>
                  <option value="En Progreso">En Progreso</option>
                  <option value="Completada">Completada</option>
                </select>
              </div>
            </div>
            <div className="modal-action">
              <button className="btn" onClick={() => setIsModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleAddTask}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
