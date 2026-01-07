



import { Employee, Role, Task, TaskStatus, AssigneeType, TaskPriority } from './types';

export const DEPARTMENTS = ['فنی', 'فروش', 'مارکتینگ', 'منابع انسانی', 'پشتیبانی'];

export const MOCK_EMPLOYEES: Employee[] = [
  {
    id: '1',
    name: 'علی مدیرزاده',
    mobile: '989122204008', // Updated to match Real Admin ID with 98 prefix
    role: Role.ADMIN,
    department: 'مدیریت',
    avatar: 'https://picsum.photos/100/100?random=1',
  },
  {
    id: '2',
    name: 'سارا کارمند',
    mobile: '989120000002',
    role: Role.EMPLOYEE,
    department: 'فنی',
    avatar: 'https://picsum.photos/100/100?random=2',
  },
  {
    id: '3',
    name: 'رضا طراح',
    mobile: '989120000003',
    role: Role.EMPLOYEE,
    department: 'مارکتینگ',
    avatar: 'https://picsum.photos/100/100?random=3',
  },
  {
    id: '4',
    name: 'مریم فروشنده',
    mobile: '989120000004',
    role: Role.EMPLOYEE,
    department: 'فروش',
    avatar: 'https://picsum.photos/100/100?random=4',
  },
];

const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
const nextWeek = new Date(today);
nextWeek.setDate(nextWeek.getDate() + 7);
const lastWeek = new Date(today);
lastWeek.setDate(lastWeek.getDate() - 7);

export const MOCK_TASKS: Task[] = [
  {
    id: 't1',
    title: 'طراحی صفحه اصلی سایت',
    description: 'بازطراحی کامل صفحه اصلی با توجه به گایدلاین جدید برند.',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.HIGH,
    startDate: yesterday.toISOString(),
    dueDate: nextWeek.toISOString(),
    createdAt: yesterday.toISOString(),
    assigneeType: AssigneeType.USER,
    assigneeId: '2', // Sara
    createdBy: '1',
    comments: [],
    subTasks: [
      { id: 'st1', title: 'طراحی هدر', isCompleted: true, assigneeIds: ['2'] },
      { id: 'st2', title: 'طراحی فوتر', isCompleted: false, assigneeIds: [] },
    ],
    timeLogs: [],
    archivedBy: [],
  },
  {
    id: 't2',
    title: 'تهیه گزارش ماهانه فروش',
    description: 'جمع‌آوری داده‌های فروش ماه گذشته و تحلیل آن.',
    status: TaskStatus.COMPLETED,
    priority: TaskPriority.MEDIUM,
    startDate: lastWeek.toISOString(),
    dueDate: yesterday.toISOString(),
    createdAt: new Date(today.getTime() - 86400000 * 5).toISOString(),
    assigneeType: AssigneeType.DEPARTMENT,
    assigneeId: 'فروش',
    createdBy: '1',
    comments: [],
    subTasks: [],
    timeLogs: [],
    archivedBy: [],
  },
  {
    id: 't3',
    title: 'بررسی باگ لاگین',
    description: 'کاربران در هنگام ورود با خطای ۵۰۰ مواجه می‌شوند.',
    status: TaskStatus.OVERDUE,
    priority: TaskPriority.URGENT,
    startDate: new Date(today.getTime() - 86400000 * 4).toISOString(),
    dueDate: yesterday.toISOString(),
    createdAt: new Date(today.getTime() - 86400000 * 3).toISOString(),
    assigneeType: AssigneeType.USER,
    assigneeId: '2',
    createdBy: '1',
    comments: [],
    subTasks: [],
    timeLogs: [],
    archivedBy: [],
  },
  {
    id: 't4',
    title: 'جلسه هماهنگی کمپین نوروزی',
    description: 'بررسی ایده‌های اولیه برای کمپین.',
    status: TaskStatus.TODO,
    priority: TaskPriority.LOW,
    startDate: today.toISOString(),
    dueDate: tomorrow.toISOString(),
    createdAt: today.toISOString(),
    assigneeType: AssigneeType.DEPARTMENT,
    assigneeId: 'مارکتینگ',
    createdBy: '1',
    comments: [],
    subTasks: [],
    timeLogs: [],
    archivedBy: [],
  },
];