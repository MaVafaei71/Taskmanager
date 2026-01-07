
import React from 'react';
import { LayoutDashboard, CheckSquare, Users, BarChart3, LogOut, X, Calendar as CalendarIcon, ListTodo, Trash2, Archive, MessageSquareText, Monitor, Settings2, LayoutGrid, List, ArrowLeftRight, Briefcase } from 'lucide-react';
import { Role, Employee, AppMode } from '../types';
import UserAvatar from './UserAvatar';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;
  userRole: Role;
  currentUser: Employee | null;
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  setCurrentView, 
  appMode, 
  setAppMode, 
  userRole, 
  currentUser, 
  onLogout, 
  isOpen, 
  onClose 
}) => {
  
  // Menus for Task Manager Mode
  const taskMenuItems = [
    { id: 'dashboard', label: 'داشبورد', icon: LayoutDashboard, roles: [Role.ADMIN, Role.EMPLOYEE] },
    { id: 'tasks', label: 'وظایف تیمی', icon: CheckSquare, roles: [Role.ADMIN, Role.EMPLOYEE] },
    { id: 'correspondence', label: 'کارتابل ارتباط', icon: MessageSquareText, roles: [Role.ADMIN, Role.EMPLOYEE] },
    { id: 'personal-tasks', label: 'وظایف شخصی', icon: ListTodo, roles: [Role.ADMIN, Role.EMPLOYEE] },
    { id: 'calendar', label: 'تقویم', icon: CalendarIcon, roles: [Role.ADMIN, Role.EMPLOYEE] },
    { id: 'reports', label: 'گزارش‌ها', icon: BarChart3, roles: [Role.ADMIN, Role.EMPLOYEE] },
    { id: 'archive', label: 'آرشیو', icon: Archive, roles: [Role.ADMIN, Role.EMPLOYEE] },
    { id: 'trash', label: 'وظایف حذف شده', icon: Trash2, roles: [Role.ADMIN] }, // Admin Only
    { id: 'employees', label: 'کارمندان', icon: Users, roles: [Role.ADMIN] },
  ];

  // Menus for Remote Work Mode
  const remoteMenuItems = [
    { id: 'remote-dashboard', label: 'داشبورد دورکاری', icon: LayoutDashboard, roles: [Role.ADMIN] },
    { id: 'remote-monitoring', label: 'مانیتورینگ زنده', icon: LayoutGrid, roles: [Role.ADMIN] },
    { id: 'remote-settings', label: 'تنظیمات و دسترسی', icon: Settings2, roles: [Role.ADMIN] },
    { id: 'remote-reports', label: 'گزارشات فعالیت', icon: List, roles: [Role.ADMIN] },
  ];

  const activeMenu = appMode === 'TASK_MANAGER' ? taskMenuItems : remoteMenuItems;
  const filteredMenu = activeMenu.filter(item => item.roles.includes(userRole));

  const handleItemClick = (id: string) => {
    setCurrentView(id);
    onClose(); // Close sidebar on mobile when item is clicked
  };

  const toggleMode = () => {
      if (appMode === 'TASK_MANAGER') {
          setAppMode('REMOTE_WORK');
          setCurrentView('remote-dashboard');
      } else {
          setAppMode('TASK_MANAGER');
          setCurrentView('dashboard');
      }
      onClose();
  };

  const isRemoteMode = appMode === 'REMOTE_WORK';

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <div className={`fixed right-0 top-0 h-full w-64 bg-white border-l border-gray-200 shadow-2xl md:shadow-lg flex flex-col z-50 transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
      }`}>
        <div className={`p-6 border-b border-gray-100 flex items-center justify-between transition-colors ${isRemoteMode ? 'bg-gray-800 text-white' : ''}`}>
          <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${isRemoteMode ? 'bg-primary text-white' : 'bg-primary text-white'}`}>
                  {isRemoteMode ? <Monitor size={18}/> : 'T'}
              </div>
              <h1 className="text-lg font-bold tracking-tight">
                  {isRemoteMode ? 'پنل دورکاری' : 'تسک منیجر'}
              </h1>
          </div>
          {/* Close Button for Mobile */}
          <button onClick={onClose} className="md:hidden text-gray-500 hover:text-red-500 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Profile Section in Sidebar */}
        {currentUser && (
            <div className="p-6 flex flex-col items-center border-b border-gray-100 bg-gray-50/30">
                <div className="w-20 h-20 rounded-full p-1 bg-white border border-gray-200 shadow-sm mb-3 relative">
                    <UserAvatar 
                        src={currentUser.avatar} 
                        name={currentUser.name} 
                        className="w-full h-full rounded-full"
                        iconSize={32}
                    />
                    <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full" title="آنلاین"></div>
                </div>
                <h2 className="font-bold text-gray-800 text-lg text-center truncate w-full">{currentUser.name}</h2>
                <div className="flex items-center gap-1 mt-1">
                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${isRemoteMode ? 'bg-gray-800 text-white' : 'bg-primary/10 text-primary'}`}>
                        {currentUser.role === Role.ADMIN ? 'مدیر سیستم' : 'کارمند'}
                    </span>
                    {currentUser.department && currentUser.department !== 'نامشخص' && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                            {currentUser.department}
                        </span>
                    )}
                </div>
            </div>
        )}

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {filteredMenu.map((item) => (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                currentView === item.id
                  ? isRemoteMode 
                        ? 'bg-gray-800 text-white shadow-md shadow-gray-400/30' 
                        : 'bg-primary text-white shadow-md shadow-primary/30'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100 space-y-3">
          {/* Switch Mode Button (Admin Only) */}
          {userRole === Role.ADMIN && (
              <button
                onClick={toggleMode}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-300 ${
                    isRemoteMode 
                        ? 'bg-white border-primary text-primary hover:bg-primary/5' 
                        : 'bg-gray-800 text-white border-transparent hover:bg-gray-700 shadow-lg shadow-gray-500/20'
                }`}
              >
                <div className="flex items-center gap-2">
                    {isRemoteMode ? <Briefcase size={18} /> : <Monitor size={18} />}
                    <span className="font-bold text-sm">
                        {isRemoteMode ? 'مدیریت تسک‌ها' : 'پنل دورکاری'}
                    </span>
                </div>
                <ArrowLeftRight size={16} />
              </button>
          )}

          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">خروج</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
