
import React, { useState, useEffect, useRef, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Tasks from './components/Tasks';
import PersonalTasks from './components/PersonalTasks';
import Employees from './components/Employees';
import Reports from './components/Reports';
import CalendarView from './components/CalendarView'; 
import TaskModal from './components/TaskModal'; 
import TaskHistoryModal from './components/TaskHistoryModal';
import EventModal from './components/EventModal'; 
import PersonalTaskModal from './components/PersonalTaskModal';
import NotificationCenter from './components/NotificationCenter'; 
import RecycleBin from './components/RecycleBin'; 
import TaskArchive from './components/TaskArchive'; 
import CorrespondenceView from './components/CorrespondenceView'; 
import RemoteWork from './components/RemoteWork'; 
import { Employee, Task, Role, CalendarEvent, Comment, AssigneeType, PersonalTask, Correspondence, RemoteLog, RemoteWorkSettings, AppMode, RemoteAttendance, IdleDetector } from './types';
import { LogIn, Loader2, Menu } from 'lucide-react';
import Swal from 'sweetalert2';
import { toJalali, toPersianDigits } from './utils/dateUtils';
import { v4 as uuidv4 } from 'uuid';
import { playNotificationSound, playWarningSound } from './utils/audio';
import { fetchEmployeesFromDing } from './utils/dingApi';
import { 
    apiFetchTasks, apiSaveTask, apiDeleteTask,
    apiSyncEmployees, 
    apiFetchEvents, apiSaveEvent, apiDeleteEvent,
    apiFetchPersonalTasks, apiSavePersonalTask, apiDeletePersonalTask,
    apiFetchCorrespondence, apiSaveCorrespondence,
    apiFetchRemoteLogs, apiSaveRemoteLog,
    apiFetchRemoteAttendance, apiSaveRemoteAttendance,
    apiFetchAppSettings, apiSaveAppSettings,
    apiSubscribe,
    apiDeleteComment,
    apiEmergencyCloseSession // Imported new function
} from './utils/api';
import { loadReadNotifsFromStorage, saveReadNotifsToStorage, saveRemoteModulePurchased } from './utils/storage'; 

const DEFAULT_REMOTE_SETTINGS: RemoteWorkSettings = {
  isEnabled: false,
  checkInactivity: false,
  inactivityThreshold: 5,
};

const App: React.FC = () => {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [mobileInput, setMobileInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isAppLoading, setIsAppLoading] = useState(true);

  // App State
  const [appMode, setAppMode] = useState<AppMode>('TASK_MANAGER');
  const [currentView, setCurrentView] = useState('dashboard');
  const [isRemoteModulePurchased, setIsRemoteModulePurchased] = useState(false);
  
  // Data States
  const [tasks, setTasks] = useState<Task[]>([]);
  const [remoteLogs, setRemoteLogs] = useState<RemoteLog[]>([]);
  const [remoteAttendance, setRemoteAttendance] = useState<RemoteAttendance[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [personalTasks, setPersonalTasks] = useState<PersonalTask[]>([]);
  const [correspondenceList, setCorrespondenceList] = useState<Correspondence[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  
  // Real-time Idle State for UI feedback
  const [currentUserIsIdle, setCurrentUserIsIdle] = useState(false);
  const isIdleRef = useRef(false);
  const idleStartTimeRef = useRef<number | null>(null);
  const processedLogIdsRef = useRef<Set<string>>(new Set());

  // Notification State
  const [userReadNotifications, setUserReadNotifications] = useState<Record<string, string[]>>(() => {
    return loadReadNotifsFromStorage() || {};
  });

  // Mobile Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false); 
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isPersonalTaskModalOpen, setIsPersonalTaskModalOpen] = useState(false);

  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | undefined>(undefined);
  const [editingPersonalTask, setEditingPersonalTask] = useState<PersonalTask | undefined>(undefined);
  
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<Date | undefined>(undefined);

  // Loading state for Remote Actions to prevent double clicks
  const [isRemoteActionLoading, setIsRemoteActionLoading] = useState(false);

  // --- REMOTE WORK MONITORING ENGINE ---
  const lastActivityTime = useRef<number>(Date.now());
  const activityTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const idleDetectorRef = useRef<IdleDetector | null>(null);
  const idleAbortController = useRef<AbortController | null>(null);
  
  // New State to track monitoring type
  const [monitoringType, setMonitoringType] = useState<'SYSTEM' | 'BROWSER' | undefined>(undefined);

  // Detect active task for current user
  const currentActiveTask = React.useMemo(() => {
      if (!currentUser) return null;
      return tasks.find(t => 
          t.timeLogs?.some(log => !log.endTime && log.userId === currentUser.id) && !t.isOnBreak
      );
  }, [tasks, currentUser]);

  // Determine current user's effective remote settings (Fetched from API)
  const [userRemoteSettings, setUserRemoteSettings] = useState<RemoteWorkSettings>(DEFAULT_REMOTE_SETTINGS);

  // Determine current active remote session
  const activeRemoteSession = useMemo(() => {
      if (!currentUser) return null;
      return remoteAttendance.find(
          r => r.userId === currentUser.id && r.status !== 'COMPLETED'
      ) || null;
  }, [remoteAttendance, currentUser]);

  // --- INITIAL DATA FETCHING ---
  useEffect(() => {
      const initData = async () => {
          setIsAppLoading(true);
          try {
              // 1. Fetch Employees from Ding API
              const emps = await fetchEmployeesFromDing();
              setEmployees(emps);
              
              // Sync employees to Supabase (Background)
              apiSyncEmployees(emps).catch(err => console.error("Employee sync failed", err));

              // 2. Fetch Other Data
              const [fetchedTasks, fetchedEvents, fetchedPT, fetchedCorr, fetchedLogs, fetchedAtt, isPurchased] = await Promise.all([
                  apiFetchTasks(),
                  apiFetchEvents(),
                  apiFetchPersonalTasks(),
                  apiFetchCorrespondence(),
                  apiFetchRemoteLogs(),
                  apiFetchRemoteAttendance(),
                  apiFetchAppSettings('remote_purchased')
              ]);

              setTasks(fetchedTasks);
              setEvents(fetchedEvents);
              setPersonalTasks(fetchedPT);
              setCorrespondenceList(fetchedCorr);
              setRemoteLogs(fetchedLogs);
              setRemoteAttendance(fetchedAtt);
              setIsRemoteModulePurchased(!!isPurchased);

          } catch (err) {
              console.error("Failed to load initial data", err);
              Swal.fire('خطا', 'مشکلی در ارتباط با سرور پیش آمده است.', 'error');
          } finally {
              setIsAppLoading(false);
          }
      };

      initData();
  }, []);

  // --- REALTIME SUBSCRIPTIONS ---
  useEffect(() => {
      // We subscribe to all relevant tables. 
      // When a change occurs, we simply re-fetch the list for that table to ensure consistency with relations.
      const subscriptions = [
          // Tasks & Relations: Update Tasks List
          apiSubscribe('tasks', () => apiFetchTasks().then(setTasks)),
          apiSubscribe('sub_tasks', () => apiFetchTasks().then(setTasks)),
          apiSubscribe('comments', () => apiFetchTasks().then(setTasks)),
          apiSubscribe('time_logs', () => apiFetchTasks().then(setTasks)),

          // Remote Work: Update Logs & Attendance
          apiSubscribe('remote_logs', () => apiFetchRemoteLogs().then(setRemoteLogs)),
          apiSubscribe('remote_attendance', () => apiFetchRemoteAttendance().then(setRemoteAttendance)),
          apiSubscribe('remote_breaks', () => apiFetchRemoteAttendance().then(setRemoteAttendance)), // Break changes affect attendance duration

          // Others
          apiSubscribe('calendar_events', () => apiFetchEvents().then(setEvents)),
          apiSubscribe('personal_tasks', () => apiFetchPersonalTasks().then(setPersonalTasks)),
          apiSubscribe('correspondence', () => apiFetchCorrespondence().then(setCorrespondenceList)),
      ];

      return () => {
          subscriptions.forEach(sub => sub.unsubscribe());
      };
  }, []);

  // --- SYNC EDITING TASK (REALTIME CHAT) ---
  useEffect(() => {
      if (editingTask) {
          const updated = tasks.find(t => t.id === editingTask.id);
          // Check if updated task has changes (e.g. new comments) compared to editingTask
          if (updated && JSON.stringify(updated) !== JSON.stringify(editingTask)) {
              setEditingTask(updated);
          }
      }
  }, [tasks]);

  // Fetch specific settings when user logs in
  useEffect(() => {
      const loadSettings = async () => {
          if (!currentUser) return;
          const global = await apiFetchAppSettings('remote_global') || DEFAULT_REMOTE_SETTINGS;
          const empSettingsMap = await apiFetchAppSettings('remote_emp_settings') || {};
          const settings = empSettingsMap[currentUser.id] || global;
          setUserRemoteSettings(settings);
      };
      loadSettings();
  }, [currentUser]);

  // --- WARNING SOUND EFFECT ---
  useEffect(() => {
      if (remoteLogs.length === 0) return;
      const latestLog = remoteLogs[remoteLogs.length - 1];
      const isRecent = (Date.now() - new Date(latestLog.timestamp).getTime()) < 10000;
      
      if (latestLog && !processedLogIdsRef.current.has(latestLog.id)) {
          processedLogIdsRef.current.add(latestLog.id);
          if (isRecent && latestLog.type === 'ACTIVITY_ALERT') {
              playWarningSound();
          }
      }
  }, [remoteLogs]);

  // --- LIFECYCLE HANDLERS (Tab Close / Refresh) ---
  useEffect(() => {
    // 1. Before Unload: Prompt user (if supported)
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (activeRemoteSession && activeRemoteSession.status !== 'COMPLETED') {
        e.preventDefault();
        e.returnValue = 'با بستن تب برای شما پایان ثبت میشود';
        return 'با بستن تب برای شما پایان ثبت میشود';
      }
    };

    // 2. Unload: Emergency Save
    const handleUnload = () => {
      if (!currentUser || !activeRemoteSession || activeRemoteSession.status === 'COMPLETED') return;
      
      // Stop Idle Detector
      if (idleAbortController.current) idleAbortController.current.abort();

      const now = new Date();
      const endTimeStr = now.toISOString();
      
      const newBreaks = activeRemoteSession.breaks.map(b => {
          if (!b.endTime) return { ...b, endTime: endTimeStr };
          return b;
      });

      const start = new Date(activeRemoteSession.startTime).getTime();
      const end = now.getTime();
      let breakTime = 0;
      newBreaks.forEach(b => {
          const bStart = new Date(b.startTime).getTime();
          const bEnd = b.endTime ? new Date(b.endTime).getTime() : end;
          breakTime += (bEnd - bStart);
      });

      const completedSession: RemoteAttendance = {
          ...activeRemoteSession,
          status: 'COMPLETED',
          endTime: endTimeStr,
          breaks: newBreaks,
          totalDuration: Math.max(0, (end - start) - breakTime),
          terminationReason: 'AUTO_CLOSE'
      };

      // USE NEW EMERGENCY FUNCTION
      apiEmergencyCloseSession(completedSession); 
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    // Visibility change is often more reliable on mobile, but unload is standard for desktop tab close
    window.addEventListener('unload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
    };
  }, [currentUser, activeRemoteSession]);

  // 1. Basic Activity Listener (Backup for system monitoring)
  useEffect(() => {
      const handleActivity = () => {
          // Always update activity timestamp on basic events as a fallback
          lastActivityTime.current = Date.now();
          
          if (isIdleRef.current && currentUser && activeRemoteSession) {
              // Only resume if using Browser Monitoring or if System Detector is Active
              if (monitoringType === 'BROWSER' || (idleDetectorRef.current?.userState === 'active')) {
                  isIdleRef.current = false;
                  setCurrentUserIsIdle(false);

                  let durationMinutes = 0;
                  if (idleStartTimeRef.current) {
                      durationMinutes = Math.floor((Date.now() - idleStartTimeRef.current) / 60000);
                  }

                  const newLog: RemoteLog = {
                      id: uuidv4(),
                      userId: currentUser.id,
                      taskId: activeRemoteSession.id, 
                      timestamp: new Date().toISOString(),
                      type: 'ACTIVITY_RESUMED',
                      activityLevel: 'ACTIVE',
                      description: `بازگشت به کار پس از ${durationMinutes > 0 ? toPersianDigits(durationMinutes) + ' دقیقه' : 'مدتی'} عدم فعالیت.`
                  };
                  setRemoteLogs(prev => [...prev, newLog]);
                  apiSaveRemoteLog(newLog); // API
                  idleStartTimeRef.current = null;
              }
          }
      };
      
      window.addEventListener('mousemove', handleActivity);
      window.addEventListener('keydown', handleActivity);
      window.addEventListener('click', handleActivity);
      window.addEventListener('scroll', handleActivity);

      return () => {
          window.removeEventListener('mousemove', handleActivity);
          window.removeEventListener('keydown', handleActivity);
          window.removeEventListener('click', handleActivity);
          window.removeEventListener('scroll', handleActivity);
      };
  }, [currentUser, activeRemoteSession, monitoringType]); 

  // 2. Monitoring Logic Interval
  useEffect(() => {
      if (activityTimerRef.current) clearInterval(activityTimerRef.current);

      if (!currentUser || !activeRemoteSession || !isRemoteModulePurchased) return;
      if (activeRemoteSession.status === 'BREAK') {
          setCurrentUserIsIdle(false);
          isIdleRef.current = false;
          return;
      }

      if (!userRemoteSettings.isEnabled) return;

      if (userRemoteSettings.checkInactivity) {
          activityTimerRef.current = setInterval(() => {
              const threshold = userRemoteSettings.inactivityThreshold || 5;
              let isIdle = false;

              // Check System Idle State if detector is active
              if (idleDetectorRef.current && monitoringType === 'SYSTEM') {
                  const state = idleDetectorRef.current.userState;
                  const screen = idleDetectorRef.current.screenState;
                  
                  if (state === 'active' && screen === 'unlocked') {
                      isIdle = false;
                      // Sync fallback timer to keep it fresh
                      lastActivityTime.current = Date.now();
                  } else {
                      // System reports idle or locked
                      // IdleDetector threshold is usually 60s. We respect user setting here? 
                      // Actually, if detector says idle (min 60s), it's idle.
                      // But we want to trigger alert only if user-defined threshold met.
                      // Since we can't get "duration" from IdleDetector easily without our own timer, we rely on lastActivityTime
                      // However, lastActivityTime is NOT updated if detector is idle. So diff grows.
                      isIdle = true;
                  }
              }

              // Fallback / Calculation logic
              // If system is active (or we are in browser mode), lastActivityTime is updated by events.
              // If system is idle, lastActivityTime is NOT updated.
              const inactiveMins = (Date.now() - lastActivityTime.current) / (1000 * 60);
              
              if (inactiveMins >= threshold) {
                  isIdle = true;
              }

              if (isIdle) {
                  if (!isIdleRef.current) {
                      isIdleRef.current = true;
                      setCurrentUserIsIdle(true);
                      idleStartTimeRef.current = Date.now();

                      const newLog: RemoteLog = {
                          id: uuidv4(),
                          userId: currentUser.id,
                          taskId: activeRemoteSession.id, 
                          timestamp: new Date().toISOString(),
                          type: 'ACTIVITY_ALERT',
                          activityLevel: 'IDLE',
                          description: `عدم فعالیت ${monitoringType === 'SYSTEM' ? '(سیستمی)' : '(مرورگر)'} بیش از ${toPersianDigits(threshold)} دقیقه`
                      };
                      setRemoteLogs(prev => [...prev, newLog]);
                      apiSaveRemoteLog(newLog); // API
                  }
              }
          }, 5000); 
      }

      return () => {
          if (activityTimerRef.current) clearInterval(activityTimerRef.current);
      };
  }, [activeRemoteSession, currentUser, isRemoteModulePurchased, userRemoteSettings, monitoringType]); 

  // --- Helper to start Idle Detector ---
  const startSystemIdleMonitoring = async () => {
      if ('IdleDetector' in window) {
          try {
              if (idleAbortController.current) idleAbortController.current.abort();
              idleAbortController.current = new AbortController();
              
              const detector = new window.IdleDetector();
              
              detector.addEventListener('change', () => {
                  const uState = detector.userState;
                  const sState = detector.screenState;
                  // console.log(`Idle change: ${uState}, ${sState}`);
                  
                  if (uState === 'active' && sState === 'unlocked') {
                      // System is active again.
                      // We update the local timestamp so our interval logic knows we are back.
                      lastActivityTime.current = Date.now();
                      
                      // Explicit resume logic if we were idle
                      if (isIdleRef.current) {
                          isIdleRef.current = false;
                          setCurrentUserIsIdle(false);
                          // Log resume? The interval logic or mousemove handler usually does it, 
                          // but for system events (like unlocking screen without moving mouse over browser), we force it here.
                          // Ideally wait for next interval or mouse move to log resume to avoid spam.
                      }
                  }
              });
              
              await detector.start({ 
                  threshold: 60000, // Minimum 60s for API
                  signal: idleAbortController.current.signal 
              });
              
              idleDetectorRef.current = detector;
              setMonitoringType('SYSTEM');
              return true;
          } catch (err) { 
              console.error("Idle detection permission failed or not supported:", err);
              setMonitoringType('BROWSER');
              return false; 
          }
      }
      setMonitoringType('BROWSER');
      return false;
  };

  useEffect(() => {
    saveReadNotifsToStorage(userReadNotifications);
  }, [userReadNotifications]);

  // Handlers
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    let searchMobile = mobileInput;
    if (mobileInput.startsWith('09')) searchMobile = '98' + mobileInput.substring(1);
    else if (mobileInput.startsWith('+98')) searchMobile = '98' + mobileInput.substring(3);

    const user = employees.find(emp => emp.mobile === searchMobile || emp.mobile === mobileInput);
    
    if (user) {
      setCurrentUser(user);
      setIsAuthenticated(true);
      setLoginError('');
      setMobileInput('');
    } else {
      setLoginError('شماره موبایل در لیست کارمندان یافت نشد.');
    }
  };

  const handleLogout = () => {
    if (activeRemoteSession && activeRemoteSession.status !== 'COMPLETED') {
        Swal.fire({
            title: 'هشدار خروج',
            text: 'شما هنوز در حال دورکاری هستید. آیا می‌خواهید پایان کار را ثبت کنید؟',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'بله، پایان کار و خروج',
            cancelButtonText: 'انصراف'
        }).then((result) => {
            if (result.isConfirmed) {
               // Force call handleRemoteEnd Logic here but synchronously
               // For simplicity, we just perform simple close logic
               const now = new Date();
               const endTimeStr = now.toISOString();
               const newBreaks = activeRemoteSession.breaks.map(b => !b.endTime ? { ...b, endTime: endTimeStr } : b);
               
               const updatedSession: RemoteAttendance = { 
                    ...activeRemoteSession, 
                    status: 'COMPLETED', 
                    endTime: endTimeStr,
                    breaks: newBreaks,
                    terminationReason: 'MANUAL'
                };
                apiSaveRemoteAttendance(updatedSession);
                performLogout();
            }
        });
        return;
    }
    performLogout();
  };

  const performLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setCurrentView('dashboard');
    setAppMode('TASK_MANAGER');
    setIsSidebarOpen(false);
    if (idleAbortController.current) idleAbortController.current.abort();
    idleDetectorRef.current = null;
    setMonitoringType(undefined);
  };

  // --- Remote Attendance Handlers (Improved with Loading Lock & Optimistic Updates) ---
  
  const handleRemoteStart = async () => {
      if (!currentUser || isRemoteActionLoading) return;
      
      // Step 1: Explain monitoring to user and request interaction for permission
      const result = await Swal.fire({
          title: 'شروع دورکاری',
          text: 'برای ثبت دقیق ساعت کاری، نیاز به دسترسی بررسی فعالیت سیستم داریم. لطفاً در پیام بعدی مرورگر دکمه Allow را بزنید.',
          icon: 'info',
          showCancelButton: true,
          confirmButtonText: 'شروع و اعطای دسترسی',
          cancelButtonText: 'انصراف'
      });

      if (!result.isConfirmed) return;

      setIsRemoteActionLoading(true);

      try {
        let systemMode = false;
        
        // Step 2: Request Permission explicitly inside the user gesture handler
        if ('IdleDetector' in window) {
            try {
                const permissionState = await window.IdleDetector.requestPermission();
                if (permissionState === 'granted') {
                    systemMode = await startSystemIdleMonitoring();
                } else {
                    console.warn("User denied idle detection permission.");
                    setMonitoringType('BROWSER');
                    // Optional: Show toast warning
                    Swal.fire({
                        icon: 'warning',
                        title: 'دسترسی محدود',
                        text: 'به دلیل عدم دسترسی به فعالیت سیستم، فقط فعالیت داخل مرورگر محاسبه می‌شود.',
                        timer: 4000,
                        showConfirmButton: false,
                        toast: true,
                        position: 'top'
                    });
                }
            } catch (err) {
                console.error("Error requesting idle permission:", err);
                setMonitoringType('BROWSER');
            }
        } else {
            setMonitoringType('BROWSER');
        }

        const newSession: RemoteAttendance = {
            id: uuidv4(),
            userId: currentUser.id,
            startTime: new Date().toISOString(),
            status: 'WORKING',
            breaks: []
        };
        
        // Optimistic Update
        setRemoteAttendance(prev => [...prev, newSession]);
        
        await apiSaveRemoteAttendance(newSession); // API Wait
        
        setCurrentUserIsIdle(false);
        isIdleRef.current = false;
        lastActivityTime.current = Date.now();

        Swal.fire({ icon: 'success', title: 'شروع کار دورکاری ثبت شد', timer: 3000, showConfirmButton: false, toast: true, position: 'top' });
      } catch (error) {
          console.error(error);
          Swal.fire('خطا', 'عدم توانایی در ثبت شروع کار', 'error');
      } finally {
          setIsRemoteActionLoading(false);
      }
  };

  const handleRemoteBreak = async () => {
      if (!activeRemoteSession || isRemoteActionLoading) return;
      setIsRemoteActionLoading(true);

      try {
        const updatedSession: RemoteAttendance = { 
            ...activeRemoteSession, 
            status: 'BREAK',
            breaks: [...activeRemoteSession.breaks, { startTime: new Date().toISOString() }]
        };
        
        // Optimistic Update
        setRemoteAttendance(prev => prev.map(s => s.id === activeRemoteSession.id ? updatedSession : s));
        
        await apiSaveRemoteAttendance(updatedSession); // API
        
        setCurrentUserIsIdle(false);
        isIdleRef.current = false;
        Swal.fire({ icon: 'info', title: 'حالت استراحت فعال شد', timer: 2000, showConfirmButton: false, toast: true, position: 'top' });
      } finally {
          setIsRemoteActionLoading(false);
      }
  };

  const handleRemoteResume = async () => {
      if (!activeRemoteSession || isRemoteActionLoading) return;
      setIsRemoteActionLoading(true);

      try {
        const newBreaks = [...activeRemoteSession.breaks];
        if (newBreaks.length > 0 && !newBreaks[newBreaks.length - 1].endTime) {
            newBreaks[newBreaks.length - 1].endTime = new Date().toISOString();
        }
        const updatedSession: RemoteAttendance = { ...activeRemoteSession, status: 'WORKING', breaks: newBreaks };
        
        // Optimistic Update
        setRemoteAttendance(prev => prev.map(s => s.id === activeRemoteSession.id ? updatedSession : s));
        
        await apiSaveRemoteAttendance(updatedSession); // API

        setCurrentUserIsIdle(false);
        isIdleRef.current = false;
        lastActivityTime.current = Date.now();
        Swal.fire({ icon: 'success', title: 'خوش برگشتید!', timer: 2000, showConfirmButton: false, toast: true, position: 'top' });
      } finally {
          setIsRemoteActionLoading(false);
      }
  };

  const handleRemoteEnd = () => {
      if (!activeRemoteSession || isRemoteActionLoading) return;
      
      Swal.fire({
          title: 'پایان کار دورکاری',
          text: 'آیا از ثبت پایان کار اطمینان دارید؟',
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'بله، ثبت کن',
      }).then(async (result) => {
          if (result.isConfirmed) {
              setIsRemoteActionLoading(true);
              try {
                if (idleAbortController.current) {
                    idleAbortController.current.abort();
                    idleDetectorRef.current = null;
                }

                const newBreaks = [...activeRemoteSession.breaks];
                // Close any open breaks
                if (newBreaks.length > 0 && !newBreaks[newBreaks.length - 1].endTime) {
                    newBreaks[newBreaks.length - 1].endTime = new Date().toISOString();
                }
                const endTime = new Date().toISOString();
                const start = new Date(activeRemoteSession.startTime).getTime();
                let totalBreakTime = 0;
                newBreaks.forEach(b => { if (b.endTime) totalBreakTime += (new Date(b.endTime).getTime() - new Date(b.startTime).getTime()); });

                const updatedSession: RemoteAttendance = { 
                    ...activeRemoteSession, 
                    status: 'COMPLETED', 
                    endTime: endTime,
                    breaks: newBreaks,
                    totalDuration: Math.max(0, (new Date(endTime).getTime() - start) - totalBreakTime),
                    terminationReason: 'MANUAL'
                };

                // Optimistic Update: Immediately remove from active list or update status
                setRemoteAttendance(prev => prev.map(s => s.id === activeRemoteSession.id ? updatedSession : s));
                
                await apiSaveRemoteAttendance(updatedSession); // API

                setCurrentUserIsIdle(false);
                isIdleRef.current = false;
                setMonitoringType(undefined);
                Swal.fire('خسته نباشید', 'ساعت پایان کار ثبت شد.', 'success');
              } finally {
                  setIsRemoteActionLoading(false);
              }
          }
      });
  };

  // --- CRUD Handlers (Wrapped with API Calls) ---
  const handleAddTask = async (newTask: Task) => {
    setTasks(prev => [...prev, newTask]);
    await apiSaveTask(newTask); // API
    setIsTaskModalOpen(false);
    setCalendarSelectedDate(undefined);
  };

  const handleUpdateTask = async (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    
    // Update editingTask if active (keeps History Modal in sync)
    if (editingTask?.id === updatedTask.id) {
        setEditingTask(updatedTask);
    }

    await apiSaveTask(updatedTask); // API
    
    // Only close the Task Modal (Edit/Add Form) if it is open.
    // We do NOT want to close the History Modal (Chat) or clear editingTask if History is open.
    if (isTaskModalOpen) {
        setIsTaskModalOpen(false);
        setEditingTask(undefined);
    }
  };

  const handleDeleteTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    await apiDeleteTask(id); // API
  };

  const handleAddCorrespondence = async (item: Correspondence) => {
      setCorrespondenceList(prev => [...prev, item]);
      await apiSaveCorrespondence(item); // API
  };

  const handleUpdateCorrespondence = async (item: Correspondence) => {
      setCorrespondenceList(prev => prev.map(i => i.id === item.id ? item : i));
      await apiSaveCorrespondence(item); // API
  };

  const handleUpdatePersonalTasks = async (updatedUserTasks: PersonalTask[]) => {
      if (!currentUser) return;
      setPersonalTasks(prev => {
          const others = prev.filter(t => t.userId !== currentUser.id);
          return [...others, ...updatedUserTasks];
      });
      for (const task of updatedUserTasks) {
          await apiSavePersonalTask(task);
      }
  };

  const handleSavePersonalTask = async (task: PersonalTask) => {
      setPersonalTasks(prev => {
          const exists = prev.some(t => t.id === task.id);
          return exists ? prev.map(t => t.id === task.id ? task : t) : [task, ...prev];
      });
      await apiSavePersonalTask(task); // API
  };

  const handleAddComment = async (taskId: string, text: string) => {
      if (!currentUser) return;
      const newComment: Comment = { id: uuidv4(), userId: currentUser.id, text, createdAt: new Date().toISOString() };
      
      const targetTask = tasks.find(t => t.id === taskId);
      if (!targetTask) return;

      const involvedUserIds = new Set<string>();
      if (targetTask.assigneeType === AssigneeType.USER) involvedUserIds.add(targetTask.assigneeId);
      else if (targetTask.assigneeType === AssigneeType.DEPARTMENT) employees.filter(e => e.department === targetTask.assigneeId).forEach(e => involvedUserIds.add(e.id));
      targetTask.subTasks.forEach(st => st.assigneeIds.forEach(id => involvedUserIds.add(id)));
      if (targetTask.createdBy) involvedUserIds.add(targetTask.createdBy);
      employees.filter(e => e.role === Role.ADMIN).forEach(admin => involvedUserIds.add(admin.id));
      involvedUserIds.delete(currentUser.id);

      const updatedTask = {
          ...targetTask,
          comments: [...(targetTask.comments || []), newComment],
          unseenCommentsFor: Array.from(involvedUserIds)
      };

      handleUpdateTask(updatedTask); // Handles API call
  };

  const handleEditComment = (taskId: string, commentId: string, newText: string) => {
    const targetTask = tasks.find(t => t.id === taskId);
    if (!targetTask) return;
    const updatedTask = { ...targetTask, comments: targetTask.comments.map(c => c.id === commentId ? { ...c, text: newText } : c) };
    handleUpdateTask(updatedTask);
  };

  const handleDeleteComment = async (taskId: string, commentId: string) => {
    // 1. Optimistic Update (Immediate UI removal)
    setTasks(prev => prev.map(t => {
        if (t.id === taskId) {
            const updated = { ...t, comments: t.comments.filter(c => c.id !== commentId) };
            // Sync with modal if open
            if (editingTask?.id === taskId) setEditingTask(updated);
            return updated;
        }
        return t;
    }));

    // 2. Real API Delete
    await apiDeleteComment(commentId);
  };

  const handleSaveEvent = async (savedEvent: CalendarEvent) => {
    if (editingEvent) setEvents(prev => prev.map(e => e.id === savedEvent.id ? savedEvent : e));
    else setEvents(prev => [...prev, savedEvent]);
    
    await apiSaveEvent(savedEvent); // API

    setIsEventModalOpen(false);
    setEditingEvent(undefined);
    setCalendarSelectedDate(undefined);
    Swal.fire({ icon: 'success', title: 'رویداد ثبت شد', toast: true, position: 'top-end', timer: 3000, showConfirmButton: false });
  };

  const handleDeleteEvent = async (id: string) => {
      setEvents(prev => prev.filter(e => e.id !== id));
      await apiDeleteEvent(id); // API
      setIsEventModalOpen(false);
      setEditingEvent(undefined);
      Swal.fire({ icon: 'success', title: 'رویداد حذف شد', toast: true, position: 'top-end', timer: 3000, showConfirmButton: false });
  };

  // --- Handlers from UI ---
  const handleCalendarAddClick = (date: Date, type: 'TASK' | 'EVENT') => {
     setCalendarSelectedDate(date);
     if (type === 'TASK') { setEditingTask(undefined); setIsTaskModalOpen(true); } 
     else { setEditingEvent(undefined); setIsEventModalOpen(true); }
  };

  const handleCalendarTaskClick = (task: Task) => {
      setEditingTask(task);
      if (currentUser && task.unseenCommentsFor?.includes(currentUser.id)) {
           handleMarkNotificationAsRead(`comment-${task.id}`, 'NEW_COMMENT');
      }
      setIsHistoryModalOpen(true);
  };

  const handleCalendarEventClick = (event: CalendarEvent) => {
      if (currentUser?.role === Role.ADMIN) { setEditingEvent(event); setIsEventModalOpen(true); return; }
      const attendeeNames = employees.filter(e => event.attendeeIds.includes(e.id)).map(e => e.name).join('، ');
      Swal.fire({ title: event.title, html: `<div class="text-right text-sm space-y-2"><p><strong>تاریخ:</strong> ${toJalali(event.date)}</p><p><strong>زمان:</strong> ${event.time}</p><p><strong>توضیحات:</strong> ${event.description || '-'}</p><p><strong>دعوت‌شدگان:</strong> ${attendeeNames || 'هیچکس'}</p></div>`, icon: 'info' });
  };

  const handleCalendarPersonalTaskClick = (task: PersonalTask) => {
      setEditingPersonalTask(task);
      setIsPersonalTaskModalOpen(true);
  };

  const handleMarkNotificationAsRead = (id: string, type: string) => {
      if (!currentUser) return;
      if (type === 'CORRESPONDENCE_NEW') {
          const itemId = id.replace('corr-new-', '');
          const item = correspondenceList.find(c => c.id === itemId);
          if (item) handleUpdateCorrespondence({ ...item, viewedByAdmin: true });
      } else if (type === 'CORRESPONDENCE_UPDATE') {
          const itemId = id.replace('corr-upd-', '');
          const item = correspondenceList.find(c => c.id === itemId);
          if (item) handleUpdateCorrespondence({ ...item, viewedByUser: true });
      } else if (type === 'NEW_ASSIGNMENT') {
          const taskId = id.replace('new-', '');
          const task = tasks.find(t => t.id === taskId);
          if (task) handleUpdateTask({ ...task, viewedByAssignee: true });
      } else if (type === 'NEW_COMMENT') {
           const taskId = id.replace('comment-', '');
           setTasks(prev => prev.map(t => {
               if (t.id === taskId && t.unseenCommentsFor) {
                   return { ...t, unseenCommentsFor: t.unseenCommentsFor.filter(uid => uid !== currentUser.id) };
               }
               return t;
           }));
           // We need to persist this change to DB too ideally
           const task = tasks.find(t => t.id === taskId);
           if(task) {
               const updated = { ...task, unseenCommentsFor: task.unseenCommentsFor?.filter(uid => uid !== currentUser.id)};
               apiSaveTask(updated);
           }
      } else {
          setUserReadNotifications(prev => ({ ...prev, [currentUser.id]: [...(prev[currentUser.id] || []), id] }));
      }
  };

  if (isAppLoading) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
              <Loader2 className="animate-spin text-primary mb-4" size={48} />
              <p className="text-gray-600 font-bold">در حال بارگذاری اطلاعات...</p>
          </div>
      );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-gray-100">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary rounded-2xl mx-auto flex items-center justify-center mb-4 text-white text-3xl font-bold shadow-lg shadow-primary/30">T</div>
            <h1 className="text-2xl font-bold text-gray-800">ورود به سیستم</h1>
            <p className="text-gray-500 mt-2 text-sm">لطفا شماره موبایل خود را وارد کنید.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">شماره موبایل</label>
              <input type="text" value={mobileInput} onChange={(e) => setMobileInput(e.target.value)} placeholder="0912..." className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:outline-none text-left dir-ltr transition-all disabled:opacity-50" />
              {loginError && <p className="text-red-500 text-xs mt-2">{loginError}</p>}
            </div>
            <button type="submit" className="w-full bg-primary hover:bg-primary-hover text-white py-4 rounded-xl font-bold shadow-lg shadow-primary/30 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70">
              <LogIn size={20} /> ورود
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Filter Logic
  const myPersonalTasks = currentUser ? personalTasks.filter(t => t.userId === currentUser.id) : [];
  const calendarTasks = tasks.filter(task => {
    if (task.isDeleted) return false;
    if (task.archivedBy && currentUser && task.archivedBy.includes(currentUser.id)) return false;
    if (currentUser?.role === Role.ADMIN) return true;
    return (task.assigneeType === AssigneeType.USER && task.assigneeId === currentUser?.id) ||
           (task.assigneeType === AssigneeType.DEPARTMENT && task.assigneeId === currentUser?.department) ||
           (task.subTasks && task.subTasks.some(st => st.assigneeIds.includes(currentUser?.id || '')));
  });
  const calendarEvents = currentUser?.role === Role.ADMIN ? events : events.filter(e => e.attendeeIds.includes(currentUser?.id || '') || e.createdBy === currentUser?.id);
  const activeTasks = tasks.filter(t => !t.isDeleted && (!t.archivedBy || (currentUser && !t.archivedBy.includes(currentUser.id))));

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        appMode={appMode}
        setAppMode={setAppMode}
        userRole={currentUser!.role}
        currentUser={currentUser}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      
      <main className="flex-1 md:mr-64 p-4 md:p-8 min-h-screen overflow-y-auto w-full transition-all duration-300 relative">
        <div className="max-w-7xl mx-auto">
            <div className="flex md:hidden justify-between items-center mb-6 sticky top-0 bg-[#f8fafc] z-30 py-2">
                <div className="flex items-center gap-3">
                   <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:text-primary hover:border-primary transition-colors shadow-sm">
                      <Menu size={24} />
                   </button>
                   <h2 className="text-lg font-bold text-gray-800">{appMode === 'REMOTE_WORK' ? 'پنل دورکاری' : 'تسک منیجر'}</h2>
                </div>
            </div>

            {appMode === 'TASK_MANAGER' && (
                <>
                    {currentView === 'dashboard' && (
                        <Dashboard 
                            tasks={activeTasks} 
                            currentUser={currentUser} 
                            employees={employees}
                            onUpdateTask={handleUpdateTask}
                            isRemoteModuleActive={isRemoteModulePurchased}
                            remoteLogs={remoteLogs}
                            remoteAttendanceSession={activeRemoteSession}
                            allRemoteAttendance={remoteAttendance}
                            onRemoteAction={{
                                start: handleRemoteStart,
                                break: handleRemoteBreak,
                                resume: handleRemoteResume,
                                end: handleRemoteEnd
                            }}
                            remoteSettings={userRemoteSettings}
                            isIdle={currentUserIsIdle}
                            isRemoteActionLoading={isRemoteActionLoading}
                            monitoringType={monitoringType} // Pass monitoring type
                        />
                    )}
                    {currentView === 'tasks' && <Tasks tasks={activeTasks} employees={employees} currentUser={currentUser} onAddTask={handleAddTask} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} onAddComment={handleAddComment} onEditComment={handleEditComment} onDeleteComment={handleDeleteComment} />}
                    {currentView === 'correspondence' && currentUser && <CorrespondenceView items={correspondenceList} currentUser={currentUser} employees={employees} onAdd={handleAddCorrespondence} onUpdate={handleUpdateCorrespondence} />}
                    {currentView === 'personal-tasks' && currentUser && <PersonalTasks currentUser={currentUser} tasks={myPersonalTasks} onUpdateTasks={handleUpdatePersonalTasks} />}
                    {currentView === 'calendar' && <CalendarView tasks={calendarTasks} events={calendarEvents} personalTasks={myPersonalTasks} isAdmin={currentUser?.role === Role.ADMIN} onAddEvent={handleCalendarAddClick} onTaskClick={handleCalendarTaskClick} onEventClick={handleCalendarEventClick} onPersonalTaskClick={handleCalendarPersonalTaskClick} />}
                    {currentView === 'reports' && <Reports tasks={activeTasks} currentUser={currentUser} employees={employees} />}
                    {currentView === 'employees' && <Employees employees={employees} />}
                    {currentView === 'trash' && <RecycleBin tasks={tasks} onRestore={(task) => handleUpdateTask({...task, isDeleted: false})} onPermanentDelete={handleDeleteTask} />}
                    {currentView === 'archive' && currentUser && <TaskArchive tasks={tasks} currentUser={currentUser} onUnarchive={(task) => { const newArchivedBy = (task.archivedBy || []).filter(id => id !== currentUser.id); handleUpdateTask({...task, archivedBy: newArchivedBy}); }} />}
                </>
            )}

            {appMode === 'REMOTE_WORK' && currentUser?.role === Role.ADMIN && (
                <RemoteWork 
                    currentView={currentView}
                    employees={employees} 
                    logs={remoteLogs} 
                    activeSessions={remoteAttendance}
                    isPurchased={isRemoteModulePurchased} 
                    onPurchase={() => { setIsRemoteModulePurchased(true); saveRemoteModulePurchased(true); apiSaveAppSettings('remote_purchased', true); }}
                />
            )}
        </div>

        <div className="fixed bottom-6 left-6 z-[100]">
             <NotificationCenter 
                tasks={activeTasks}
                events={events}
                correspondence={correspondenceList}
                employees={employees}
                currentUser={currentUser} 
                readNotificationIds={currentUser ? (userReadNotifications[currentUser.id] || []) : []}
                remoteAttendance={remoteAttendance}
                onMarkAsRead={handleMarkNotificationAsRead}
                onOpenTask={(task) => {
                    if(appMode !== 'TASK_MANAGER') { setAppMode('TASK_MANAGER'); setCurrentView('tasks'); }
                    if (currentUser && task.unseenCommentsFor?.includes(currentUser.id)) handleMarkNotificationAsRead(`comment-${task.id}`, 'NEW_COMMENT');
                    setEditingTask(task);
                    setIsHistoryModalOpen(true);
                }}
                onOpenEvent={(event) => {
                     if(appMode !== 'TASK_MANAGER') { setAppMode('TASK_MANAGER'); setCurrentView('calendar'); }
                    handleCalendarEventClick(event);
                }}
                onOpenCorrespondence={(item) => {
                    if(appMode !== 'TASK_MANAGER') setAppMode('TASK_MANAGER');
                    setCurrentView('correspondence');
                    if (currentUser) {
                        if (currentUser.role === Role.ADMIN) handleMarkNotificationAsRead(`corr-new-${item.id}`, 'CORRESPONDENCE_NEW');
                        else handleMarkNotificationAsRead(`corr-upd-${item.id}`, 'CORRESPONDENCE_UPDATE');
                    }
                }}
             />
        </div>

        {isTaskModalOpen && (
            <TaskModal
                isOpen={isTaskModalOpen}
                onClose={() => { setIsTaskModalOpen(false); setEditingTask(undefined); setCalendarSelectedDate(undefined); }}
                onSave={(task) => { if (editingTask) handleUpdateTask(task); else handleAddTask(task); }}
                employees={employees}
                initialData={editingTask}
                initialDate={calendarSelectedDate}
                currentUser={currentUser}
            />
        )}
        
        {isEventModalOpen && (
            <EventModal
                isOpen={isEventModalOpen}
                onClose={() => { setIsEventModalOpen(false); setEditingEvent(undefined); setCalendarSelectedDate(undefined); }}
                onSave={handleSaveEvent}
                onDelete={handleDeleteEvent}
                employees={employees}
                initialDate={calendarSelectedDate}
                initialData={editingEvent}
            />
        )}

        {isHistoryModalOpen && editingTask && (
            <TaskHistoryModal
                isOpen={isHistoryModalOpen}
                onClose={() => { setIsHistoryModalOpen(false); setEditingTask(undefined); }}
                task={editingTask}
                employees={employees}
                currentUser={currentUser}
                onAddComment={handleAddComment}
                onEditComment={handleEditComment}
                onDeleteComment={handleDeleteComment}
            />
        )}

        {isPersonalTaskModalOpen && currentUser && (
             <PersonalTaskModal
                 isOpen={isPersonalTaskModalOpen}
                 onClose={() => { setIsPersonalTaskModalOpen(false); setEditingPersonalTask(undefined); }}
                 onSave={handleSavePersonalTask}
                 initialData={editingPersonalTask}
                 userId={currentUser.id}
             />
        )}
      </main>
    </div>
  );
};

export default App;
