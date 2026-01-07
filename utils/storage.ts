


import { Task, CalendarEvent, PersonalTask, Correspondence, RemoteWorkSettings, RemoteLog, RemoteAttendance } from '../types';

export const TASKS_KEY = 'pars_tasks_v1';
export const EVENTS_KEY = 'pars_events_v1';
export const NOTIFS_KEY = 'pars_notifications_v1';
export const PERSONAL_TASKS_KEY = 'pars_personal_tasks_v1';
export const CORRESPONDENCE_KEY = 'pars_correspondence_v1';
export const REMOTE_GLOBAL_KEY = 'pars_remote_global_v1';
export const REMOTE_EMP_KEY = 'pars_remote_emp_v1';
export const REMOTE_LOGS_KEY = 'pars_remote_logs_v1';
export const REMOTE_PURCHASED_KEY = 'pars_remote_purchased_v1';
export const REMOTE_ATTENDANCE_KEY = 'pars_remote_attendance_v1';

// Tasks
export const saveTasksToStorage = (tasks: Task[]) => {
  try {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.error('Error saving tasks to storage:', error);
  }
};

export const loadTasksFromStorage = (): Task[] | null => {
  try {
    const data = localStorage.getItem(TASKS_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error loading tasks from storage:', error);
    return null;
  }
};

// Personal Tasks
export const savePersonalTasksToStorage = (tasks: PersonalTask[]) => {
  try {
    localStorage.setItem(PERSONAL_TASKS_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.error('Error saving personal tasks to storage:', error);
  }
};

export const loadPersonalTasksFromStorage = (): PersonalTask[] | null => {
  try {
    const data = localStorage.getItem(PERSONAL_TASKS_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error loading personal tasks from storage:', error);
    return null;
  }
};

// Correspondence
export const saveCorrespondenceToStorage = (items: Correspondence[]) => {
  try {
    localStorage.setItem(CORRESPONDENCE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error('Error saving correspondence to storage:', error);
  }
};

export const loadCorrespondenceFromStorage = (): Correspondence[] | null => {
  try {
    const data = localStorage.getItem(CORRESPONDENCE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error loading correspondence from storage:', error);
    return null;
  }
};

// Events
export const saveEventsToStorage = (events: CalendarEvent[]) => {
  try {
    localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  } catch (error) {
    console.error('Error saving events to storage:', error);
  }
};

export const loadEventsFromStorage = (): CalendarEvent[] | null => {
  try {
    const data = localStorage.getItem(EVENTS_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error loading events from storage:', error);
    return null;
  }
};

// Read Notifications
export const saveReadNotifsToStorage = (data: Record<string, string[]>) => {
  try {
    localStorage.setItem(NOTIFS_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving notifications to storage:', error);
  }
};

export const loadReadNotifsFromStorage = (): Record<string, string[]> | null => {
  try {
    const data = localStorage.getItem(NOTIFS_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error loading notifications from storage:', error);
    return null;
  }
};

// Remote Work Settings
export const saveRemoteGlobalSettings = (settings: RemoteWorkSettings) => {
    try {
        localStorage.setItem(REMOTE_GLOBAL_KEY, JSON.stringify(settings));
    } catch (error) {
        console.error('Error saving remote global settings:', error);
    }
};

export const loadRemoteGlobalSettings = (): RemoteWorkSettings | null => {
    try {
        const data = localStorage.getItem(REMOTE_GLOBAL_KEY);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        return null;
    }
};

export const saveRemoteEmployeeSettings = (data: Record<string, RemoteWorkSettings>) => {
    try {
        localStorage.setItem(REMOTE_EMP_KEY, JSON.stringify(data));
    } catch (error) {
        console.error('Error saving remote employee settings:', error);
    }
};

export const loadRemoteEmployeeSettings = (): Record<string, RemoteWorkSettings> | null => {
    try {
        const data = localStorage.getItem(REMOTE_EMP_KEY);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        return null;
    }
};

// Remote Logs
export const saveRemoteLogs = (logs: RemoteLog[]) => {
    try {
        localStorage.setItem(REMOTE_LOGS_KEY, JSON.stringify(logs));
    } catch (error) {
        console.error('Error saving remote logs:', error);
    }
};

export const loadRemoteLogs = (): RemoteLog[] => {
    try {
        const data = localStorage.getItem(REMOTE_LOGS_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        return [];
    }
};

// Remote Module Purchase Status
export const saveRemoteModulePurchased = (status: boolean) => {
    try {
        localStorage.setItem(REMOTE_PURCHASED_KEY, JSON.stringify(status));
    } catch (error) {
        console.error('Error saving remote purchase status:', error);
    }
};

export const loadRemoteModulePurchased = (): boolean => {
    try {
        const data = localStorage.getItem(REMOTE_PURCHASED_KEY);
        return data ? JSON.parse(data) : false;
    } catch (error) {
        return false;
    }
};

// Remote Attendance
export const saveRemoteAttendance = (records: RemoteAttendance[]) => {
    try {
        localStorage.setItem(REMOTE_ATTENDANCE_KEY, JSON.stringify(records));
    } catch (error) {
        console.error('Error saving remote attendance:', error);
    }
};

export const loadRemoteAttendance = (): RemoteAttendance[] => {
    try {
        const data = localStorage.getItem(REMOTE_ATTENDANCE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        return [];
    }
};