import { TaskProgress, TaskStatus, PageCapture, AIAnalysis } from './types';

const tasks = new Map<string, TaskProgress>();
const listeners = new Map<string, Set<(task: TaskProgress) => void>>();

export function createTask(id: string): TaskProgress {
  const task: TaskProgress = {
    id,
    status: 'pending',
    progress: 0,
    currentStep: '準備中...',
    totalPages: 0,
    processedPages: 0,
    pages: [],
    analyses: [],
  };
  tasks.set(id, task);
  return task;
}

export function getTask(id: string): TaskProgress | undefined {
  return tasks.get(id);
}

export function updateTask(id: string, updates: Partial<TaskProgress>): TaskProgress | undefined {
  const task = tasks.get(id);
  if (!task) return undefined;

  Object.assign(task, updates);
  notifyListeners(id, task);
  return task;
}

export function updateTaskStatus(id: string, status: TaskStatus, currentStep: string, progress?: number) {
  updateTask(id, { status, currentStep, progress: progress ?? undefined });
}

export function addPageCapture(id: string, page: PageCapture) {
  const task = tasks.get(id);
  if (!task) return;
  task.pages.push(page);
  task.processedPages = task.pages.length;
  notifyListeners(id, task);
}

export function addAnalysis(id: string, analysis: AIAnalysis) {
  const task = tasks.get(id);
  if (!task) return;
  task.analyses.push(analysis);
  notifyListeners(id, task);
}

export function subscribe(id: string, callback: (task: TaskProgress) => void): () => void {
  if (!listeners.has(id)) {
    listeners.set(id, new Set());
  }
  listeners.get(id)!.add(callback);

  // Send current state immediately
  const task = tasks.get(id);
  if (task) callback(task);

  return () => {
    listeners.get(id)?.delete(callback);
  };
}

function notifyListeners(id: string, task: TaskProgress) {
  listeners.get(id)?.forEach(cb => cb(task));
}

export function deleteTask(id: string) {
  tasks.delete(id);
  listeners.delete(id);
}
