


import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Task, CalendarEvent, TaskStatus, Role, Employee, Correspondence, CorrespondenceStatus, RemoteAttendance } from '../types';
import { Bell, Clock, AlertCircle, Calendar, X, Check, Briefcase, PlayCircle, StopCircle, CheckCircle2, MessageSquare, UserPlus, Mail, XCircle, Coffee, Monitor, Power, Radio, WifiOff } from 'lucide-react';
import { isNearDeadline, isOverdue, toPersianDigits, toJalali } from '../utils/dateUtils';
import { playNotificationSound } from '../utils/audio';

interface NotificationCenterProps {
  tasks: Task[];
  events: CalendarEvent[];
  correspondence?: Correspondence[]; 
  employees?: Employee[];
  currentUser?: Employee | null;
  readNotificationIds: string[];
  remoteAttendance?: RemoteAttendance[]; // New Prop
  onMarkAsRead: (id: string, type: string) => void;
  onOpenTask: (task: Task) => void;
  onOpenEvent: (event: CalendarEvent) => void;
  onOpenCorrespondence?: (item: Correspondence) => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ 
    tasks, 
    events, 
    correspondence = [],
    employees = [],
    currentUser, 
    readNotificationIds, 
    remoteAttendance = [],
    onMarkAsRead,
    onOpenTask,
    onOpenEvent,
    onOpenCorrespondence
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Refs to track notification state for sound
  const prevCountRef = useRef(0);
  const isFirstMount = useRef(true);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filter notifications logic
  const notifications = useMemo(() => {
    const list: Array<{
        id: string;
        type: 'TASK_DUE' | 'TASK_OVERDUE' | 'EVENT_SOON' | 'NEW_ASSIGNMENT' | 'ADMIN_LOG_START' | 'ADMIN_LOG_STOP' | 'ADMIN_BREAK_START' | 'ADMIN_TASK_COMPLETED' | 'NEW_COMMENT' | 'EVENT_INVITED' | 'CORRESPONDENCE_NEW' | 'CORRESPONDENCE_UPDATE' | 'ADMIN_REMOTE_START' | 'ADMIN_REMOTE_BREAK' | 'ADMIN_REMOTE_END';
        title: string;
        time: string;
        priority: 'HIGH' | 'MEDIUM' | 'NORMAL';
        data: any;
        actorName?: string;
        description?: string;
        timestamp: number;
    }> = [];

    const now = new Date();
    const isAdmin = currentUser?.role === Role.ADMIN;
    
    // --- Correspondence Notifications ---
    correspondence.forEach(item => {
        // 1. New Request for Admin
        if (isAdmin && !item.viewedByAdmin) {
             const requester = employees.find(e => e.id === item.requesterId)?.name || 'کاربر';
             list.push({
                 id: `corr-new-${item.id}`,
                 type: 'CORRESPONDENCE_NEW',
                 title: 'درخواست جدید در کارتابل',
                 time: toPersianDigits(new Date(item.createdAt).toLocaleTimeString('fa-IR', {hour: '2-digit', minute:'2-digit'})),
                 priority: 'HIGH',
                 data: item,
                 actorName: requester,
                 description: `موضوع: ${item.title}`,
                 timestamp: new Date(item.createdAt).getTime()
             });
        }
        // 2. Response for User
        if (!isAdmin && item.requesterId === currentUser?.id && !item.viewedByUser && item.status !== CorrespondenceStatus.PENDING) {
             list.push({
                 id: `corr-upd-${item.id}`,
                 type: 'CORRESPONDENCE_UPDATE',
                 title: item.status === CorrespondenceStatus.APPROVED ? 'درخواست تایید شد' : 'درخواست رد شد',
                 time: 'هم اکنون',
                 priority: 'HIGH',
                 data: item,
                 actorName: 'مدیریت',
                 description: `موضوع: ${item.title}`,
                 timestamp: new Date(item.createdAt).getTime()
             });
        }
    });

    // --- Remote Attendance Notifications (Admin Only) ---
    if (isAdmin && remoteAttendance.length > 0) {
        remoteAttendance.forEach(session => {
            // Do not show notifications for myself if I am the admin working remotely (optional)
            if (session.userId === currentUser?.id) return;
            
            const actor = employees.find(e => e.id === session.userId);
            const actorName = actor ? actor.name : 'کارمند';
            const startTime = new Date(session.startTime).getTime();
            
            // 1. Remote Start (Recent 24h)
            if (now.getTime() - startTime < 24 * 3600 * 1000) {
                 const notifId = `rem-start-${session.id}`;
                 if (!readNotificationIds.includes(notifId)) {
                     list.push({
                         id: notifId,
                         type: 'ADMIN_REMOTE_START',
                         title: `شروع دورکاری: ${actorName}`,
                         time: toPersianDigits(new Date(session.startTime).toLocaleTimeString('fa-IR', {hour: '2-digit', minute:'2-digit'})),
                         priority: 'NORMAL',
                         data: session,
                         actorName: actorName,
                         description: 'شروع فعالیت دورکاری',
                         timestamp: startTime
                     });
                 }
            }

            // 2. Remote Breaks (Recent 24h)
            session.breaks.forEach((brk, idx) => {
                 const bTime = new Date(brk.startTime).getTime();
                 if (now.getTime() - bTime < 24 * 3600 * 1000) {
                     const notifId = `rem-break-${session.id}-${idx}`;
                     if (!readNotificationIds.includes(notifId)) {
                         list.push({
                             id: notifId,
                             type: 'ADMIN_REMOTE_BREAK',
                             title: `استراحت دورکاری: ${actorName}`,
                             time: toPersianDigits(new Date(brk.startTime).toLocaleTimeString('fa-IR', {hour: '2-digit', minute:'2-digit'})),
                             priority: 'NORMAL',
                             data: session,
                             actorName: actorName,
                             description: 'ورود به حالت استراحت',
                             timestamp: bTime
                         });
                     }
                 }
            });

            // 3. Remote End (Recent 24h)
            if (session.endTime) {
                 const eTime = new Date(session.endTime).getTime();
                 if (now.getTime() - eTime < 24 * 3600 * 1000) {
                     const notifId = `rem-end-${session.id}`;
                     const isAutoClose = session.terminationReason === 'AUTO_CLOSE';
                     
                     if (!readNotificationIds.includes(notifId)) {
                         list.push({
                             id: notifId,
                             type: 'ADMIN_REMOTE_END',
                             title: isAutoClose ? `خروج با بستن تب: ${actorName}` : `پایان دورکاری: ${actorName}`,
                             time: toPersianDigits(new Date(session.endTime).toLocaleTimeString('fa-IR', {hour: '2-digit', minute:'2-digit'})),
                             priority: isAutoClose ? 'HIGH' : 'NORMAL',
                             data: session,
                             actorName: actorName,
                             description: isAutoClose ? 'بستن تب مرورگر (خروج ناگهانی)' : 'ثبت ساعت پایان کار',
                             timestamp: eTime
                         });
                     }
                 }
            }
        });
    }

    // Check Tasks
    tasks.forEach(task => {
        // --- Employee Notifications ---
        const isMainAssignee = task.assigneeId === currentUser?.id;
        const isSubTaskAssignee = task.subTasks.some(st => st.assigneeIds.includes(currentUser?.id || ''));
        const isAssignee = isMainAssignee || isSubTaskAssignee;
        
        // 1. New Assignment Notification (Only for Assignee)
        if (isAssignee && task.viewedByAssignee === false && task.status !== TaskStatus.COMPLETED) {
             list.push({
                 id: `new-${task.id}`,
                 type: 'NEW_ASSIGNMENT',
                 title: task.title,
                 time: 'هم اکنون',
                 priority: 'HIGH',
                 data: task,
                 timestamp: new Date(task.createdAt).getTime()
             });
        }

        // 2. New Comment Notification
        if (currentUser && task.unseenCommentsFor?.includes(currentUser.id)) {
            const lastComment = task.comments[task.comments.length - 1];
            const author = lastComment ? employees.find(e => e.id === lastComment.userId)?.name : 'کاربر';

            list.push({
                id: `comment-${task.id}`,
                type: 'NEW_COMMENT',
                title: `نظر جدید در: ${task.title}`,
                time: lastComment ? toPersianDigits(new Date(lastComment.createdAt).toLocaleTimeString('fa-IR', {hour: '2-digit', minute:'2-digit'})) : 'هم اکنون',
                priority: 'MEDIUM',
                data: task,
                actorName: author,
                description: lastComment ? `"${lastComment.text}"` : undefined,
                timestamp: lastComment ? new Date(lastComment.createdAt).getTime() : new Date().getTime()
            });
        }

        // 3. Overdue Notification
        if ((isAssignee || isAdmin) && isOverdue(task.dueDate) && task.status !== TaskStatus.COMPLETED) {
             const notifId = `overdue-${task.id}`;
             if (!readNotificationIds.includes(notifId)) {
                list.push({
                    id: notifId,
                    type: 'TASK_OVERDUE',
                    title: task.title,
                    time: toJalali(task.dueDate),
                    priority: 'HIGH',
                    data: task,
                    timestamp: new Date(task.dueDate).getTime()
                });
             }
        } 
        // 4. Near Deadline Notification
        else if ((isAssignee || isAdmin) && isNearDeadline(task.dueDate) && task.status !== TaskStatus.COMPLETED) {
             const notifId = `near-${task.id}`;
             if (!readNotificationIds.includes(notifId)) {
                 list.push({
                     id: notifId,
                     type: 'TASK_DUE',
                     title: task.title,
                     time: toJalali(task.dueDate),
                     priority: 'MEDIUM',
                     data: task,
                     timestamp: new Date(task.dueDate).getTime()
                 });
             }
        }

        // --- Admin Notifications ---
        if (isAdmin) {
             if (task.status === TaskStatus.COMPLETED) {
                 const notifId = `admin-complete-${task.id}`;
                 const lastLog = task.timeLogs[task.timeLogs.length - 1];
                 const completerId = lastLog?.userId || task.assigneeId; 

                 if (completerId !== currentUser?.id && !readNotificationIds.includes(notifId)) {
                      const actor = employees.find(e => e.id === completerId);
                      list.push({
                          id: notifId,
                          type: 'ADMIN_TASK_COMPLETED',
                          title: `تکمیل تسک: ${task.title}`,
                          time: 'تکمیل شده',
                          priority: 'NORMAL',
                          data: task,
                          actorName: actor ? actor.name : 'کارمند',
                          timestamp: lastLog?.endTime ? new Date(lastLog.endTime).getTime() : new Date().getTime()
                      });
                 }
             }

             task.timeLogs?.forEach(log => {
                 if (log.userId === currentUser?.id) return;
                 const logStart = new Date(log.startTime);
                 const diffHours = (now.getTime() - logStart.getTime()) / (1000 * 60 * 60);
                 
                 if (diffHours < 24) {
                     const actor = employees.find(e => e.id === log.userId);
                     const actorName = actor ? actor.name : 'کارمند';
                     const subTask = log.subTaskId ? task.subTasks.find(st => st.id === log.subTaskId) : undefined;
                     const taskContextTitle = subTask ? `${task.title} > ${subTask.title}` : task.title;

                     if (!log.endTime) {
                         const notifId = `admin-start-${log.id}`;
                         if (!readNotificationIds.includes(notifId)) {
                             list.push({
                                 id: notifId,
                                 type: 'ADMIN_LOG_START',
                                 title: `شروع کار روی: ${taskContextTitle}`,
                                 time: toPersianDigits(logStart.toLocaleTimeString('fa-IR', {hour: '2-digit', minute:'2-digit'})),
                                 priority: 'NORMAL',
                                 data: task,
                                 actorName,
                                 description: log.isBreakStart ? 'شروع استراحت' : 'شروع فعالیت',
                                 timestamp: new Date(log.startTime).getTime()
                             });
                         }
                     } 
                     else {
                         const notifId = `admin-stop-${log.id}`;
                         if (!readNotificationIds.includes(notifId)) {
                              const isBreak = log.isBreakStart;
                              list.push({
                                 id: notifId,
                                 type: isBreak ? 'ADMIN_BREAK_START' : 'ADMIN_LOG_STOP',
                                 title: isBreak ? `شروع استراحت در: ${taskContextTitle}` : `توقف کار روی: ${taskContextTitle}`,
                                 time: toPersianDigits(new Date(log.endTime).toLocaleTimeString('fa-IR', {hour: '2-digit', minute:'2-digit'})),
                                 priority: 'NORMAL',
                                 data: task,
                                 actorName,
                                 description: log.description ? `گزارش: ${log.description}` : (isBreak ? 'ورود به استراحت' : 'توقف کار'),
                                 timestamp: new Date(log.endTime).getTime()
                             });
                         }
                     }
                 }
             });
        }
    });

    // Check Events
    events.forEach(event => {
        const eventDate = new Date(`${event.date.split('T')[0]}T${event.time}:00`);
        const diffHours = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        const isInvited = event.attendeeIds.includes(currentUser?.id || '');
        const isCreator = event.createdBy === currentUser?.id;
        const isAdmin = currentUser?.role === Role.ADMIN;
        const shouldSee = isInvited || event.createdBy === 'ADMIN' || isAdmin;

        // 7. New Event Invitation (Only for Attendees who aren't creators)
        if (isInvited && !isCreator) {
             const inviteNotifId = `invite-${event.id}`;
             if (!readNotificationIds.includes(inviteNotifId)) {
                 list.push({
                     id: inviteNotifId,
                     type: 'EVENT_INVITED',
                     title: `دعوت به رویداد جدید: ${event.title}`,
                     time: 'جدید',
                     priority: 'HIGH',
                     data: event,
                     description: `شما به رویداد «${event.title}» دعوت شده‌اید.`,
                     timestamp: new Date().getTime() // Alert is NOW
                 });
             }
        }

        // 8. Event Soon Notification
        if (shouldSee && diffHours > -1 && diffHours < 24) {
             const notifId = `event-${event.id}`;
             if (!readNotificationIds.includes(notifId)) {
                 list.push({
                     id: notifId,
                     type: 'EVENT_SOON',
                     title: event.title,
                     time: `${toJalali(event.date)} - ساعت ${toPersianDigits(event.time)}`,
                     priority: 'HIGH',
                     data: event,
                     timestamp: eventDate.getTime()
                 });
             }
        }
    });

    // Sort by timestamp descending (Newest to Oldest)
    return list.sort((a, b) => b.timestamp - a.timestamp);
  }, [tasks, events, correspondence, currentUser, readNotificationIds, employees, remoteAttendance]);

  useEffect(() => {
    if (isFirstMount.current) {
        isFirstMount.current = false;
        prevCountRef.current = notifications.length;
        return;
    }
    if (notifications.length > prevCountRef.current) {
        playNotificationSound();
    }
    prevCountRef.current = notifications.length;
  }, [notifications.length]);

  const hasNotifications = notifications.length > 0;

  const handleItemClick = (notif: any) => {
      setIsOpen(false);
      // Determine what to open based on type
      if (notif.type.startsWith('ADMIN_REMOTE')) {
          // Just mark read for now, no detail view for remote logs from notification yet
          onMarkAsRead(notif.id, notif.type);
      } else if (notif.type === 'EVENT_SOON' || notif.type === 'EVENT_INVITED') {
          onOpenEvent(notif.data);
      } else if (notif.type === 'CORRESPONDENCE_NEW' || notif.type === 'CORRESPONDENCE_UPDATE') {
          if (onOpenCorrespondence) onOpenCorrespondence(notif.data);
      } else {
          onOpenTask(notif.data);
      }
  };

  const handleMarkRead = (e: React.MouseEvent, notif: any) => {
      e.stopPropagation();
      onMarkAsRead(notif.id, notif.type);
  };

  const getIcon = (type: string, data?: any) => {
      switch(type) {
          case 'NEW_ASSIGNMENT': return <Briefcase size={16}/>;
          case 'NEW_COMMENT': return <MessageSquare size={16}/>;
          case 'EVENT_INVITED': return <UserPlus size={16}/>;
          case 'EVENT_SOON': return <Calendar size={16}/>;
          case 'TASK_OVERDUE': return <AlertCircle size={16}/>;
          case 'ADMIN_LOG_START': return <PlayCircle size={16}/>;
          case 'ADMIN_LOG_STOP': return <StopCircle size={16}/>;
          case 'ADMIN_BREAK_START': return <Coffee size={16}/>;
          case 'ADMIN_TASK_COMPLETED': return <CheckCircle2 size={16}/>;
          case 'CORRESPONDENCE_NEW': return <Mail size={16}/>;
          case 'CORRESPONDENCE_UPDATE': return <CheckCircle2 size={16}/>;
          case 'ADMIN_REMOTE_START': return <Power size={16}/>;
          case 'ADMIN_REMOTE_BREAK': return <Coffee size={16}/>;
          case 'ADMIN_REMOTE_END': 
            // Check data for termination reason if available, or assume normal stop
            if (data?.terminationReason === 'AUTO_CLOSE') return <WifiOff size={16} />;
            return <StopCircle size={16}/>;
          default: return <Clock size={16}/>;
      }
  };

  const getColorClass = (type: string, data?: any) => {
      switch(type) {
          case 'NEW_ASSIGNMENT': return 'bg-blue-100 text-blue-600';
          case 'NEW_COMMENT': return 'bg-pink-100 text-pink-600';
          case 'EVENT_INVITED': return 'bg-indigo-100 text-indigo-600';
          case 'EVENT_SOON': return 'bg-purple-100 text-purple-600';
          case 'TASK_OVERDUE': return 'bg-red-100 text-red-600';
          case 'ADMIN_LOG_START': return 'bg-emerald-100 text-emerald-600';
          case 'ADMIN_LOG_STOP': return 'bg-gray-100 text-gray-600';
          case 'ADMIN_BREAK_START': return 'bg-amber-100 text-amber-600';
          case 'ADMIN_TASK_COMPLETED': return 'bg-green-100 text-green-600';
          case 'CORRESPONDENCE_NEW': return 'bg-orange-100 text-orange-600';
          case 'CORRESPONDENCE_UPDATE': return 'bg-teal-100 text-teal-600';
          case 'ADMIN_REMOTE_START': return 'bg-indigo-100 text-indigo-600';
          case 'ADMIN_REMOTE_BREAK': return 'bg-orange-100 text-orange-600';
          case 'ADMIN_REMOTE_END': 
             if (data?.terminationReason === 'AUTO_CLOSE') return 'bg-red-100 text-red-600';
             return 'bg-rose-100 text-rose-600';
          default: return 'bg-amber-100 text-amber-600';
      }
  };

  const getDescription = (notif: any) => {
      if (notif.description) return notif.description;
      if (notif.actorName) return `${notif.actorName}`;
      
      switch(notif.type) {
          case 'NEW_ASSIGNMENT': return 'تسک/زیروظیفه جدید برای شما';
          case 'NEW_COMMENT': return 'نظر جدید ثبت شده است';
          case 'EVENT_INVITED': return 'شما به این رویداد دعوت شده‌اید';
          case 'EVENT_SOON': return 'یادآوری رویداد';
          case 'TASK_OVERDUE': return 'موعد انجام گذشته';
          case 'TASK_DUE': return 'نزدیک به موعد';
          case 'CORRESPONDENCE_NEW': return 'درخواست جدید';
          case 'CORRESPONDENCE_UPDATE': return 'پاسخ به درخواست';
          case 'ADMIN_REMOTE_START': return 'شروع دورکاری';
          case 'ADMIN_REMOTE_BREAK': return 'استراحت دورکاری';
          case 'ADMIN_REMOTE_END': return 'پایان دورکاری';
          default: return '';
      }
  };

  return (
    <div className="relative" ref={containerRef}>
      {isOpen && (
        <div className="absolute bottom-16 left-0 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in slide-in-from-bottom-5 zoom-in-95 origin-bottom-left">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <h3 className="font-bold text-gray-800">اعلانات</h3>
                <div className="flex items-center gap-2">
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">{toPersianDigits(notifications.length)}</span>
                    <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-red-500">
                        <X size={18} />
                    </button>
                </div>
            </div>
            
            <div className="max-h-80 overflow-y-auto">
                {notifications.length > 0 ? (
                    notifications.map(notif => (
                        <div 
                            key={notif.id} 
                            onClick={() => handleItemClick(notif)}
                            className="relative p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors flex gap-3 group cursor-pointer"
                        >
                            <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${getColorClass(notif.type, notif.data)}`}>
                                {getIcon(notif.type, notif.data)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-bold text-gray-800 line-clamp-1">{notif.title}</h4>
                                <div className="flex flex-col mt-1">
                                    {notif.actorName && (
                                        <span className="text-[10px] font-bold text-gray-600 mb-0.5">{notif.actorName}</span>
                                    )}
                                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                                        {getDescription(notif)}
                                    </p>
                                </div>
                                <span className="text-[10px] text-gray-400 mt-1 block dir-rtl text-right font-medium">{notif.time}</span>
                            </div>
                            
                            <button 
                                onClick={(e) => handleMarkRead(e, notif)}
                                className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-2 bg-white shadow-md border border-gray-100 rounded-full text-gray-400 hover:text-green-500 hover:border-green-200 transition-all z-10"
                                title="نشان کردن به عنوان خوانده شده"
                            >
                                <Check size={16} />
                            </button>
                        </div>
                    ))
                ) : (
                    <div className="p-8 text-center text-gray-400 text-sm">
                        <Bell size={32} className="mx-auto mb-2 opacity-20" />
                        <p>اعلان جدیدی وجود ندارد</p>
                    </div>
                )}
            </div>
        </div>
      )}

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`
            relative w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300
            ${isOpen ? 'bg-gray-800 text-white rotate-90' : 'bg-white text-gray-600 hover:scale-110 hover:shadow-xl hover:shadow-primary/20'}
            ${hasNotifications && !isOpen ? 'animate-bell-ring' : ''}
        `}
      >
        <Bell size={24} className={hasNotifications && !isOpen ? 'text-primary' : ''} />
        {hasNotifications && (
            <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-sm flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            </span>
        )}
      </button>
    </div>
  );
};

export default NotificationCenter;