
import React, { useState, useRef, useEffect } from 'react';
import { Task, Employee, TimeLog, TaskStatus } from '../types';
import { X, Calendar, Clock, User, FileText, CheckCircle2, History, MessageSquare, Send, Pencil, Trash2, Check, ListTodo, Coffee, Play, Square, CheckCheck, Timer } from 'lucide-react';
import { toJalali, toPersianDigits } from '../utils/dateUtils';
import UserAvatar from './UserAvatar';
import Swal from 'sweetalert2';

interface TaskHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
  employees: Employee[];
  currentUser?: Employee | null;
  onAddComment: (taskId: string, text: string) => void;
  onEditComment: (taskId: string, commentId: string, newText: string) => void;
  onDeleteComment: (taskId: string, commentId: string) => void;
}

const TaskHistoryModal: React.FC<TaskHistoryModalProps> = ({ isOpen, onClose, task, employees, currentUser, onAddComment, onEditComment, onDeleteComment }) => {
  const [activeTab, setActiveTab] = useState<'LOGS' | 'COMMENTS' | 'SUBTASKS'>('LOGS');
  const [commentText, setCommentText] = useState('');
  
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'COMMENTS' && !editingCommentId) {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTab, task.comments, editingCommentId]);

  if (!isOpen) return null;

  const sortedLogs = [...(task.timeLogs || [])].sort((a, b) => 
    new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  );

  const sortedComments = [...(task.comments || [])].sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const formatDuration = (start: string, end?: string) => {
    if (!end) return 'در حال محاسبه...';
    const durationMs = new Date(end).getTime() - new Date(start).getTime();
    const minutes = Math.floor(durationMs / (1000 * 60));
    if (minutes < 60) return `${toPersianDigits(minutes)} دقیقه`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${toPersianDigits(hours)} ساعت و ${toPersianDigits(mins)} دقیقه`;
  };

  const getEmployeeName = (id: string) => {
    const emp = employees.find(e => e.id === id);
    return emp ? emp.name : 'کاربر ناشناس';
  };

  const getEmployeeAvatar = (id: string) => {
    const emp = employees.find(e => e.id === id);
    return emp?.avatar;
  };

  const handleSendComment = () => {
      if (!commentText.trim()) return;
      onAddComment(task.id, commentText);
      setCommentText('');
  };

  const startEditing = (commentId: string, currentText: string) => {
      setEditingCommentId(commentId);
      setEditingText(currentText);
  };

  const cancelEditing = () => {
      setEditingCommentId(null);
      setEditingText('');
  };

  const saveEditing = (commentId: string) => {
      if (!editingText.trim()) return;
      onEditComment(task.id, commentId, editingText);
      setEditingCommentId(null);
      setEditingText('');
  };

  const handleDeleteClick = (commentId: string) => {
      Swal.fire({
          title: 'حذف نظر',
          text: "آیا از حذف این پیام اطمینان دارید؟",
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#ef4444',
          cancelButtonColor: '#d33',
          confirmButtonText: 'بله، حذف کن',
          cancelButtonText: 'انصراف'
      }).then((result) => {
          if (result.isConfirmed) {
              onDeleteComment(task.id, commentId);
          }
      });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendComment();
    }
  };

  const totalMs = sortedLogs.reduce((acc, log) => {
      const end = log.endTime ? new Date(log.endTime).getTime() : new Date().getTime();
      return acc + (end - new Date(log.startTime).getTime());
  }, 0);
  const totalHours = Math.floor(totalMs / (1000 * 60 * 60));
  const totalMinutes = Math.floor((totalMs / (1000 * 60)) % 60);

  const completedSubTasks = task.subTasks.filter(st => st.isCompleted).length;
  const totalSubTasks = task.subTasks.length;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-primary/10 text-primary rounded-lg">
                <History size={24} />
             </div>
             <div>
                <h3 className="text-lg font-bold text-gray-800 line-clamp-1">{task.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">تاریخچه فعالیت‌ها و گزارش کارکرد</p>
             </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg">
            <X size={24} />
          </button>
        </div>

        {/* Task Summary (Compact) */}
        <div className="bg-white border-b border-gray-100 p-4 shadow-sm flex-shrink-0 z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-xs text-gray-600">
                    <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                        <Calendar size={14} className="text-primary"/>
                        <span className="font-medium">سررسید: {toJalali(task.dueDate)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                            <Timer size={14} className="text-primary"/>
                            <span className="font-bold">کل کارکرد: {toPersianDigits(totalHours)}:{toPersianDigits(totalMinutes)}</span>
                    </div>
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${task.status === TaskStatus.COMPLETED ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                         {task.status === TaskStatus.COMPLETED ? <CheckCheck size={14}/> : <Clock size={14}/>}
                         <span className="font-bold">{task.status === TaskStatus.COMPLETED ? 'تکمیل شده' : 'در حال اجرا'}</span>
                    </div>
                </div>
                
                {totalSubTasks > 0 && (
                    <div className="flex items-center gap-2">
                        <div className="flex-1 w-24 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div 
                                className="bg-primary h-1.5 rounded-full transition-all duration-500"
                                style={{ width: `${(completedSubTasks / totalSubTasks) * 100}%` }}
                            ></div>
                        </div>
                        <span className="text-[10px] font-bold text-gray-500 whitespace-nowrap">
                            زیروظیفه: {toPersianDigits(completedSubTasks)} از {toPersianDigits(totalSubTasks)}
                        </span>
                    </div>
                )}
            </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-white flex-shrink-0">
            <button
                onClick={() => setActiveTab('LOGS')}
                className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all relative ${
                    activeTab === 'LOGS' ? 'text-primary' : 'text-gray-500 hover:bg-gray-50'
                }`}
            >
                <FileText size={16} />
                گزارش‌های زمانی
                {activeTab === 'LOGS' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary"></div>}
            </button>
            <button
                onClick={() => setActiveTab('SUBTASKS')}
                className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all relative ${
                    activeTab === 'SUBTASKS' ? 'text-primary' : 'text-gray-500 hover:bg-gray-50'
                }`}
            >
                <ListTodo size={16} />
                زیروظیفه‌ها
                {activeTab === 'SUBTASKS' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary"></div>}
            </button>
            <button
                onClick={() => setActiveTab('COMMENTS')}
                className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all relative ${
                    activeTab === 'COMMENTS' ? 'text-primary' : 'text-gray-500 hover:bg-gray-50'
                }`}
            >
                <MessageSquare size={16} />
                گفتگو
                {activeTab === 'COMMENTS' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary"></div>}
            </button>
        </div>

        {/* Body content based on Tab */}
        <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6 relative">
            
            {/* LOGS TAB - IMPROVED WITH TIMELINE STYLE */}
            {activeTab === 'LOGS' && (
                <div className="relative space-y-8 pr-8 before:content-[''] before:absolute before:right-3.5 before:top-0 before:bottom-0 before:w-0.5 before:bg-gray-200">
                    {sortedLogs.length > 0 ? (
                        sortedLogs.map((log, index) => {
                            const isCurrent = !log.endTime;
                            const isBreak = log.isBreakStart;
                            const isTaskCompleted = !isCurrent && !isBreak && task.status === TaskStatus.COMPLETED && index === 0;
                            
                            const avatar = getEmployeeAvatar(log.userId);
                            const name = getEmployeeName(log.userId);
                            const subTaskName = log.subTaskId ? task.subTasks.find(st => st.id === log.subTaskId)?.title : null;

                            // Dynamic Styling
                            let statusColor = "bg-gray-400";
                            let statusIcon = <Square size={14} className="fill-current" />;
                            let cardBorder = "border-gray-100";
                            let badgeLabel = "توقف کار";

                            if (isCurrent) {
                                statusColor = "bg-primary";
                                statusIcon = <Play size={14} className="fill-current ml-0.5" />;
                                cardBorder = "border-primary/30 shadow-md shadow-primary/5";
                                badgeLabel = "در حال کار";
                            } else if (isBreak) {
                                statusColor = "bg-amber-500";
                                statusIcon = <Coffee size={14} />;
                                cardBorder = "border-amber-200 shadow-sm";
                                badgeLabel = "استراحت";
                            } else if (isTaskCompleted) {
                                statusColor = "bg-emerald-500";
                                statusIcon = <CheckCircle2 size={16} />;
                                cardBorder = "border-emerald-200 shadow-md shadow-emerald-500/5";
                                badgeLabel = "تکمیل نهایی";
                            }

                            return (
                                <div key={log.id} className="relative">
                                    {/* Timeline Marker */}
                                    <div className={`absolute -right-[27px] top-1 w-7 h-7 rounded-full flex items-center justify-center text-white z-10 shadow-sm ${statusColor} ${isCurrent ? 'animate-pulse' : ''}`}>
                                        {statusIcon}
                                    </div>

                                    {/* Log Card */}
                                    <div className={`bg-white rounded-2xl border ${cardBorder} p-4 transition-all hover:translate-x-1`}>
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <UserAvatar 
                                                    src={avatar} 
                                                    name={name}
                                                    className="w-7 h-7 rounded-full border border-gray-100"
                                                    iconSize={14}
                                                />
                                                <span className="font-bold text-sm text-gray-800">{name}</span>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold text-white ${statusColor}`}>
                                                    {badgeLabel}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium">
                                                <Calendar size={12}/>
                                                <span>{toJalali(log.startTime)}</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-3">
                                            <div className="bg-gray-50 p-2 rounded-xl flex flex-col">
                                                <span className="text-[9px] text-gray-400 mb-1">شروع فعالیت</span>
                                                <span className="text-xs font-bold text-gray-700 dir-ltr text-right">
                                                    {toPersianDigits(new Date(log.startTime).toLocaleTimeString('fa-IR', {hour: '2-digit', minute:'2-digit'}))}
                                                </span>
                                            </div>
                                            <div className="bg-gray-50 p-2 rounded-xl flex flex-col">
                                                <span className="text-[9px] text-gray-400 mb-1">{isBreak ? 'شروع استراحت' : 'پایان فعالیت'}</span>
                                                <span className="text-xs font-bold text-gray-700 dir-ltr text-right">
                                                    {log.endTime ? toPersianDigits(new Date(log.endTime).toLocaleTimeString('fa-IR', {hour: '2-digit', minute:'2-digit'})) : '---'}
                                                </span>
                                            </div>
                                            <div className="bg-primary/5 p-2 rounded-xl flex flex-col col-span-2 sm:col-span-1">
                                                <span className="text-[9px] text-primary mb-1">مدت فعالیت</span>
                                                <span className="text-xs font-black text-primary dir-ltr text-right">
                                                    {isCurrent ? 'فعال...' : formatDuration(log.startTime, log.endTime)}
                                                </span>
                                            </div>
                                        </div>

                                        {subTaskName && (
                                            <div className="flex items-center gap-2 p-2 mb-2 bg-blue-50/50 rounded-lg border border-blue-100/50">
                                                <ListTodo size={14} className="text-blue-500"/>
                                                <span className="text-[11px] text-gray-500">تمرکز روی:</span>
                                                <span className="text-[11px] font-bold text-blue-600">{subTaskName}</span>
                                            </div>
                                        )}

                                        {log.description && (
                                            <div className="relative p-3 bg-gray-50 rounded-xl text-xs text-gray-700 leading-relaxed border-r-4 border-gray-200">
                                                <p className="font-medium">{log.description}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-16 flex flex-col items-center">
                             <History size={48} className="text-gray-200 mb-4"/>
                            <p className="text-gray-400 font-bold">هنوز هیچ فعالیتی ثبت نشده است.</p>
                            <p className="text-gray-300 text-xs mt-1">با شروع تایمر، گزارش‌های زمانی در اینجا لیست می‌شوند.</p>
                        </div>
                    )}
                </div>
            )}

            {/* SUBTASKS TAB */}
            {activeTab === 'SUBTASKS' && (
                <div className="space-y-3">
                    {task.subTasks.length > 0 ? (
                        task.subTasks.map((st) => (
                            <div key={st.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${st.isCompleted ? 'bg-emerald-50 border-emerald-100 shadow-sm' : 'bg-white border-gray-100 hover:shadow-md'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center border-2 transition-all ${st.isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-gray-50 border-gray-200 text-gray-300'}`}>
                                        {st.isCompleted ? <CheckCheck size={18} strokeWidth={3} /> : <div className="w-2 h-2 rounded-full bg-gray-200" />}
                                    </div>
                                    <div>
                                        <p className={`font-bold text-sm ${st.isCompleted ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                                            {st.title}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            {st.assigneeIds.map(uid => (
                                                <div key={uid} className="flex items-center gap-1 bg-white/50 px-1.5 py-0.5 rounded border border-gray-100">
                                                    <UserAvatar 
                                                        src={getEmployeeAvatar(uid)} 
                                                        name={getEmployeeName(uid)}
                                                        className="w-4 h-4 rounded-full"
                                                        iconSize={8}
                                                    />
                                                    <span className="text-[10px] text-gray-500 font-medium">{getEmployeeName(uid)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                {st.isCompleted && (
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] font-bold text-emerald-600 px-2 py-1 rounded-full bg-emerald-100/50">تکمیل شده</span>
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-20 text-gray-400">
                             <ListTodo size={48} className="mx-auto mb-4 opacity-20" />
                             <p className="font-bold">زیروظیفه تعریف نشده است</p>
                        </div>
                    )}
                </div>
            )}

            {/* COMMENTS TAB */}
            {activeTab === 'COMMENTS' && (
                <div className="space-y-4 pb-2">
                    {sortedComments.length > 0 ? (
                        sortedComments.map((comment) => {
                            const isMe = currentUser?.id === comment.userId;
                            const isEditing = editingCommentId === comment.id;
                            const avatar = getEmployeeAvatar(comment.userId);
                            const name = getEmployeeName(comment.userId);

                            return (
                                <div key={comment.id} className={`flex gap-3 group ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                    <div className="flex-shrink-0">
                                         <UserAvatar 
                                            src={avatar} 
                                            name={name}
                                            className="w-9 h-9 rounded-full border-2 border-white shadow-sm"
                                            iconSize={18}
                                         />
                                    </div>
                                    <div className={`max-w-[85%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                        
                                        {isEditing ? (
                                            <div className="w-full min-w-[220px] flex flex-col gap-2 bg-white p-2 rounded-2xl border-2 border-primary/30 shadow-xl">
                                                <textarea 
                                                    value={editingText}
                                                    onChange={(e) => setEditingText(e.target.value)}
                                                    className="w-full text-sm p-3 focus:outline-none bg-gray-50 rounded-xl resize-none"
                                                    rows={2}
                                                />
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={cancelEditing} className="px-3 py-1 text-xs text-red-500 hover:bg-red-50 rounded-lg font-bold">لغو</button>
                                                    <button onClick={() => saveEditing(comment.id)} className="px-3 py-1 text-xs bg-primary text-white rounded-lg font-bold shadow-md shadow-primary/20">بروزرسانی</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="relative group/bubble">
                                                <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm min-w-[140px] ${
                                                    isMe 
                                                        ? 'bg-primary text-white rounded-tr-none' 
                                                        : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
                                                }`}>
                                                    <p className="font-medium">{comment.text}</p>
                                                </div>

                                                {/* Action Buttons */}
                                                {isMe && (
                                                    <div className="absolute top-0 -right-16 h-full flex items-center gap-1 opacity-0 group-hover/bubble:opacity-100 transition-opacity px-2">
                                                        <button 
                                                            onClick={() => startEditing(comment.id, comment.text)}
                                                            className="p-1.5 bg-white text-gray-400 hover:text-blue-500 rounded-full shadow-md border border-gray-100 transition-all"
                                                        >
                                                            <Pencil size={12} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteClick(comment.id)}
                                                            className="p-1.5 bg-white text-gray-400 hover:text-red-500 rounded-full shadow-md border border-gray-100 transition-all"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="flex items-center gap-2 mt-1.5 px-1">
                                            {!isMe && <span className="text-[10px] font-bold text-gray-600">{name}</span>}
                                            <span className="text-[9px] text-gray-400 dir-ltr">
                                                {toJalali(comment.createdAt)} {toPersianDigits(new Date(comment.createdAt).toLocaleTimeString('fa-IR', {hour: '2-digit', minute:'2-digit'}))}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-20 flex flex-col items-center justify-center opacity-60">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <MessageSquare size={32} className="text-gray-300"/>
                            </div>
                            <p className="text-gray-500 font-bold">هنوز پیامی ارسال نشده است</p>
                        </div>
                    )}
                    <div ref={commentsEndRef} />
                </div>
            )}
        </div>

        {/* Input Area (Only for Comments Tab) */}
        {activeTab === 'COMMENTS' && (
            <div className="p-4 bg-white border-t border-gray-100 flex items-end gap-2 flex-shrink-0">
                <div className="relative flex-1">
                    <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="پیام خود را بنویسید..."
                        rows={1}
                        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary/40 focus:outline-none resize-none max-h-32 min-h-[52px] text-sm"
                        style={{height: 'auto', minHeight: '52px'}}
                    />
                </div>
                <button 
                    onClick={handleSendComment}
                    disabled={!commentText.trim()}
                    className="p-3.5 bg-primary text-white rounded-2xl hover:bg-primary-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/30 flex-shrink-0 active:scale-95"
                >
                    <Send size={22} className={commentText.trim() ? "rotate-180" : "rotate-180 opacity-50"} />
                </button>
            </div>
        )}
        
        {/* Footer for non-comment Tabs */}
        {activeTab !== 'COMMENTS' && (
             <div className="p-4 border-t border-gray-100 bg-white flex-shrink-0">
                <button 
                    onClick={onClose}
                    className="w-full py-3.5 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-colors"
                >
                    بستن تاریخچه
                </button>
            </div>
        )}

      </div>
    </div>
  );
};

export default TaskHistoryModal;
