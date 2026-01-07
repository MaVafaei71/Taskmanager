
import { supabase } from './supabaseClient';
import { Task, Employee, CalendarEvent, PersonalTask, Correspondence, RemoteLog, RemoteAttendance, RemoteWorkSettings } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';

// --- Realtime Subscription Helper ---
export const apiSubscribe = (tableName: string, callback: () => void): RealtimeChannel => {
  return supabase
    .channel(`public:${tableName}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: tableName },
      (payload) => {
        // console.log(`Change received for ${tableName}`, payload);
        callback();
      }
    )
    .subscribe();
};

// --- Employees ---
export const apiFetchEmployees = async (): Promise<Employee[]> => {
  const { data, error } = await supabase.from('employees').select('*');
  if (error) {
    console.error('Error fetching employees:', error);
    return [];
  }
  return data || [];
};

export const apiSyncEmployees = async (employees: Employee[]) => {
  if (!employees || employees.length === 0) return;
  
  // Upsert employees to Supabase to keep DB in sync with Ding API
  const { error } = await supabase.from('employees').upsert(employees);
  
  if (error) {
    console.error('Error syncing employees to Supabase:', error);
  }
};

// --- Tasks (Complex with relations) ---
export const apiFetchTasks = async (): Promise<Task[]> => {
  // We use aliases to map snake_case tables to camelCase properties expected by the frontend
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      subTasks:sub_tasks(*),
      comments:comments(*),
      timeLogs:time_logs(*)
    `);

  if (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }
  return data || [];
};

export const apiSaveTask = async (task: Task) => {
  // 1. Save Main Task
  const { subTasks, comments, timeLogs, ...taskData } = task;
  const { error: taskError } = await supabase.from('tasks').upsert(taskData);
  
  if (taskError) {
    console.error('Error saving task:', taskError);
    return;
  }

  // 2. Save Relations (Upserting to keep it simple)
  // Note: For a real production app, you might want to handle deletions specifically
  if (subTasks && subTasks.length > 0) {
    const subTasksWithId = subTasks.map(st => ({ ...st, taskId: task.id }));
    await supabase.from('sub_tasks').upsert(subTasksWithId);
  }
  
  if (comments && comments.length > 0) {
    const commentsWithId = comments.map(c => ({ ...c, taskId: task.id }));
    await supabase.from('comments').upsert(commentsWithId);
  }

  if (timeLogs && timeLogs.length > 0) {
    const logsWithId = timeLogs.map(l => ({ ...l, taskId: task.id }));
    await supabase.from('time_logs').upsert(logsWithId);
  }
};

export const apiDeleteTask = async (taskId: string) => {
  // Cascade delete handles relations in SQL usually, but explicit is safe
  await supabase.from('tasks').delete().eq('id', taskId);
};

export const apiDeleteComment = async (commentId: string) => {
  const { error } = await supabase.from('comments').delete().eq('id', commentId);
  if (error) {
      console.error('Error deleting comment:', error);
  }
};

// --- Events ---
export const apiFetchEvents = async (): Promise<CalendarEvent[]> => {
  const { data, error } = await supabase.from('calendar_events').select('*');
  if (error) return [];
  return data || [];
};

export const apiSaveEvent = async (event: CalendarEvent) => {
  await supabase.from('calendar_events').upsert(event);
};

export const apiDeleteEvent = async (eventId: string) => {
  await supabase.from('calendar_events').delete().eq('id', eventId);
};

// --- Personal Tasks ---
export const apiFetchPersonalTasks = async (): Promise<PersonalTask[]> => {
  const { data, error } = await supabase.from('personal_tasks').select('*');
  if (error) return [];
  return data || [];
};

export const apiSavePersonalTask = async (task: PersonalTask) => {
  await supabase.from('personal_tasks').upsert(task);
};

export const apiDeletePersonalTask = async (id: string) => {
  await supabase.from('personal_tasks').delete().eq('id', id);
};

// --- Correspondence ---
export const apiFetchCorrespondence = async (): Promise<Correspondence[]> => {
  const { data, error } = await supabase.from('correspondence').select('*');
  if (error) return [];
  return data || [];
};

export const apiSaveCorrespondence = async (item: Correspondence) => {
  await supabase.from('correspondence').upsert(item);
};

// --- Remote Work ---
export const apiFetchRemoteLogs = async (): Promise<RemoteLog[]> => {
  const { data, error } = await supabase.from('remote_logs').select('*');
  if (error) return [];
  return data || [];
};

export const apiSaveRemoteLog = async (log: RemoteLog) => {
  await supabase.from('remote_logs').insert(log);
};

export const apiFetchRemoteAttendance = async (): Promise<RemoteAttendance[]> => {
  // Fetch attendance and map the breaks relation
  const { data, error } = await supabase
    .from('remote_attendance')
    .select(`*, breaks:remote_breaks(*)`);
    
  if (error) return [];
  return data || [];
};

export const apiSaveRemoteAttendance = async (session: RemoteAttendance) => {
  const { breaks, ...sessionData } = session;
  // 1. Save Session
  const { error } = await supabase.from('remote_attendance').upsert(sessionData);
  if (error) {
      console.error(error);
      return;
  }

  // 2. Save Breaks (Sync)
  if (breaks && breaks.length > 0) {
      // First delete existing breaks to ensure array sync (simple approach)
      await supabase.from('remote_breaks').delete().eq('attendanceId', session.id);
      
      const breaksWithId = breaks.map(b => ({ ...b, attendanceId: session.id }));
      await supabase.from('remote_breaks').insert(breaksWithId);
  }
};

// --- Settings ---
export const apiFetchAppSettings = async (key: string): Promise<any> => {
    const { data } = await supabase.from('app_settings').select('value').eq('key', key).single();
    return data ? data.value : null;
};

export const apiSaveAppSettings = async (key: string, value: any) => {
    await supabase.from('app_settings').upsert({ key, value });
};
