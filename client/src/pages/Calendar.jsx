import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, ChevronRight, Plus, Clock, 
  Calendar as CalendarIcon, Trash2, ArrowRight, MapPin
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { SRI_LANKA_HOLIDAYS } from '../utils/sriLankaHolidays';
import { apiFetch } from '../utils/api'; // 👈 Centralized API utility

const CATEGORIES = {
  Meeting: { color: 'bg-purple-500', text: 'text-purple-600 dark:text-purple-400' },
  'Task due': { color: 'bg-orange-500', text: 'text-orange-600 dark:text-orange-400' },
  Urgent: { color: 'bg-red-500', text: 'text-red-600 dark:text-red-400' },
  'Task start': { color: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400' },
  holiday: { color: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' }, 
  poya: { color: 'bg-yellow-500', text: 'text-yellow-600 dark:text-yellow-400' },      
  'Unscheduled': { color: 'bg-gray-400', text: 'text-gray-600 dark:text-gray-400' }
};

export default function Calendar() {
  const { activeProject } = useProject();
  const navigate = useNavigate();

  const [currentDate, setCurrentDate] = useState(new Date()); 
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [projectTasks, setProjectTasks] = useState([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [reminders, setReminders] = useState([]);

  const [title, setTitle] = useState('');
  const [linkedTaskId, setLinkedTaskId] = useState('');
  const [reminderTime, setReminderTime] = useState('05:00 PM');
  const [category, setCategory] = useState('Meeting');

  // Fetch real project tasks using apiFetch
  useEffect(() => {
    if (activeProject) {
      fetchTasks();
    } else {
      setProjectTasks([]);
    }
  }, [activeProject]);

  const fetchTasks = async () => {
    setIsLoadingTasks(true);
    try {
      const data = await apiFetch(`/api/tasks?projectId=${activeProject._id}`);
      setProjectTasks(data || []);
    } catch (err) {
      console.error("Failed to load tasks for calendar", err);
    } finally {
      setIsLoadingTasks(false);
    }
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const handleTodayJump = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(now);
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const formatDateKey = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const selectedDateKey = formatDateKey(selectedDate);
  const realTodayKey = formatDateKey(new Date());

  const getEventsForDate = (dateKey) => {
    const userReminders = reminders.filter((r) => r.date === dateKey);

    const taskEvents = [];
    projectTasks.forEach((t) => {
      const sDate = t.startDate ? t.startDate.split('T')[0] : null;
      const dDate = t.dueDate ? t.dueDate.split('T')[0] : null;
      const cDate = t.createdAt ? t.createdAt.split('T')[0] : null;

      let hasScheduledDate = false;

      if (sDate === dateKey) {
        taskEvents.push({
          id: `start-${t._id}`,
          date: dateKey,
          title: `Start: ${t.title}`,
          time: 'Project Start',
          category: 'Task start',
          isTask: true,
          taskId: t._id
        });
        hasScheduledDate = true;
      }

      if (dDate === dateKey && dDate !== sDate) {
        taskEvents.push({
          id: `due-${t._id}`,
          date: dateKey,
          title: `Due: ${t.title}`,
          time: 'Deadline',
          category: t.priority === 'High' ? 'Urgent' : 'Task due', 
          isTask: true,
          taskId: t._id
        });
        hasScheduledDate = true;
      }

      if (!hasScheduledDate && !sDate && !dDate && cDate === dateKey) {
        taskEvents.push({
          id: `created-${t._id}`,
          date: dateKey,
          title: `Created: ${t.title}`,
          time: 'Unscheduled',
          category: 'Unscheduled',
          isTask: true,
          taskId: t._id
        });
      }
    });

    const holidays = (SRI_LANKA_HOLIDAYS || [])
      .filter((h) => h.date === dateKey)
      .map((h) => {
        const isPoya = h.title.toLowerCase().includes('poya');
        return {
          id: `hol-${h.date}-${h.title}`,
          date: h.date,
          title: h.title,
          time: 'All Day',
          category: isPoya ? 'poya' : 'holiday',
          isHoliday: true
        };
      });

    return [...holidays, ...taskEvents, ...userReminders]; 
  };

  const handleAddReminder = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const linkedTaskObj = projectTasks.find(t => t._id === linkedTaskId);

    const newReminder = {
      id: Date.now(),
      date: selectedDateKey,
      title: title.trim(),
      time: reminderTime,
      category,
      note: linkedTaskObj ? `Linked to: ${linkedTaskObj.title}` : ''
    };

    setReminders((prev) => [newReminder, ...prev]);
    setTitle('');
    setLinkedTaskId('');
  };

  const handleDeleteReminder = (id) => {
    setReminders(prev => prev.filter(r => r.id !== id));
  };

  if (!activeProject && !isLoadingTasks) {
    return (
      <div className="flex-1 w-full flex items-center justify-center animate-fade-in p-8">
        <div className="max-w-md w-full bg-white dark:bg-[#121629] p-8 rounded-[2rem] border border-gray-200 dark:border-white/10 shadow-2xl text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-[#3B28CC] to-[#FF2D88] rounded-full mx-auto flex items-center justify-center mb-6 shadow-lg shadow-[#FF2D88]/20">
            <CalendarIcon size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No Workspace Active</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Please select a project from the top menu or create a new workspace to sync its schedule to the calendar.
          </p>
          <button 
            onClick={() => navigate('/members')}
            className="w-full bg-gradient-to-r from-[#FF2D88] to-[#D91E6D] hover:opacity-90 text-white py-3.5 rounded-xl text-sm font-bold transition-all shadow-[0_4px_14px_rgba(255,45,136,0.3)]"
          >
            Go to Workspaces
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)] text-gray-900 dark:text-white gap-6 animate-fade-in p-4 lg:p-8 max-w-[1600px] mx-auto w-full">
      
      <style dangerouslySetInnerHTML={{__html: `
        .cal-scroll::-webkit-scrollbar { width: 6px; }
        .cal-scroll::-webkit-scrollbar-track { background: transparent; }
        .cal-scroll::-webkit-scrollbar-thumb { background: rgba(255, 45, 136, 0.2); border-radius: 10px; }
        .cal-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255, 45, 136, 0.5); }
      `}} />

      <div className="flex-1 flex flex-col bg-white dark:bg-[#060813] border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm min-h-0 overflow-y-auto cal-scroll pr-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {activeProject ? `${activeProject.name} Schedule` : 'Calendar'}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Live schedule synced with project deadlines & national holidays
            </p>
          </div>

          <button 
            onClick={handleTodayJump}
            className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-bold hover:border-[#FF2D88] hover:text-[#FF2D88] transition-colors self-start sm:self-auto bg-gray-50 dark:bg-white/5 shadow-sm"
          >
            Today
          </button>
        </div>

        <div className="flex items-center justify-between mb-6 px-2 flex-shrink-0">
          <h2 className="text-xl font-bold tracking-wide text-gray-800 dark:text-white">
            {monthNames[month]} {year}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-xl bg-gray-100 dark:bg-[#121629] hover:bg-gray-200 dark:hover:bg-[#1a1f36] text-gray-600 dark:text-gray-300 transition-colors border border-gray-200 dark:border-white/5"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-2 rounded-xl bg-gray-100 dark:bg-[#121629] hover:bg-gray-200 dark:hover:bg-[#1a1f36] text-gray-600 dark:text-gray-300 transition-colors border border-gray-200 dark:border-white/5"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 flex-shrink-0">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="py-1">{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2 text-center flex-1">
          {Array.from({ length: firstDayIndex }).map((_, i) => (
            <div key={`empty-${i}`} className="p-2 opacity-0 pointer-events-none"></div>
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const thisDate = new Date(year, month, dayNum);
            const dateKey = formatDateKey(thisDate);
            const dayEvents = getEventsForDate(dateKey);
            const isSelected = selectedDateKey === dateKey;
            const isRealToday = realTodayKey === dateKey;

            return (
              <button
                key={dayNum}
                onClick={() => setSelectedDate(thisDate)}
                className={`relative flex flex-col items-center justify-between p-2 rounded-2xl min-h-[70px] transition-all duration-200 ${
                  isSelected
                    ? 'bg-gradient-to-br from-[#FF2D88] to-[#D81B69] text-white shadow-lg shadow-[#FF2D88]/30 font-bold scale-[1.05] z-10 border-transparent'
                    : isRealToday
                    ? 'bg-pink-50 dark:bg-[#FF2D88]/10 text-[#FF2D88] border border-[#FF2D88]/40 font-bold'
                    : 'bg-gray-50 dark:bg-[#121629]/40 hover:bg-gray-100 dark:hover:bg-[#1a1f36] text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-white/5'
                }`}
              >
                <span className="text-sm mt-1">{dayNum}</span>

                <div className="flex items-center gap-1 mt-1 mb-1 flex-wrap justify-center max-w-full px-1">
                  {dayEvents.slice(0, 3).map((evt, idx) => (
                    <span
                      key={idx}
                      className={`w-2 h-2 rounded-full ${CATEGORIES[evt.category]?.color || 'bg-gray-400'} ${isSelected ? 'ring-1 ring-white' : 'shadow-[0_0_5px_currentColor] opacity-80'}`}
                      title={evt.title}
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-[9px] opacity-90 font-bold leading-none">+{dayEvents.length - 3}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-5 mt-8 pt-4 border-t border-gray-100 dark:border-white/10 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex-shrink-0">
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></span><span>Task Start</span></div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]"></span><span>Task Due</span></div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></span><span>Urgent Task</span></div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]"></span><span>Reminder</span></div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span><span>Public Holiday</span></div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]"></span><span>Poya Day</span></div>
        </div>

      </div>

      <div className="w-full lg:w-[420px] flex flex-col gap-6 min-h-0 overflow-y-auto cal-scroll pr-2 pb-6">
        
        <div className="bg-white dark:bg-[#121629] border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm flex-shrink-0">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Add Reminder</h2>
          <p className="text-xs text-[#FF2D88] font-bold mt-1 mb-5 uppercase tracking-wider">
            For {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
          </p>

          <form onSubmit={handleAddReminder} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Link to Task</label>
              <select
                value={linkedTaskId}
                onChange={(e) => {
                  setLinkedTaskId(e.target.value);
                  const found = projectTasks.find(t => t._id === e.target.value);
                  if (found && !title) setTitle(found.title);
                }}
                className="w-full bg-gray-50 dark:bg-[#0A0D14] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-[#FF2D88] cursor-pointer transition-colors"
              >
                <option value="">No task linked (General reminder)</option>
                {projectTasks.map(t => (
                  <option key={t._id} value={t._id}>{t.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Title *</label>
              <input
                type="text"
                placeholder="e.g. Design review with team"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full bg-gray-50 dark:bg-[#0A0D14] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:border-[#FF2D88] transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Time</label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-[#0A0D14] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-[#FF2D88] transition-colors"
                  />
                  <Clock size={14} className="absolute right-3 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-[#0A0D14] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-[#FF2D88] cursor-pointer transition-colors"
                >
                  <option value="Meeting">Meeting</option>
                  <option value="Task due">Task due</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 bg-gradient-to-r from-[#FF2D88] to-[#D91E6D] hover:opacity-90 text-white text-sm font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(255,45,136,0.3)] hover:-translate-y-0.5"
            >
              <Plus size={16} />
              <span>Add Reminder</span>
            </button>
          </form>
        </div>

        <div className="bg-white dark:bg-[#121629] border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm flex flex-col flex-shrink-0">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-4">
            Schedule for {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </h2>

          <div className="space-y-3">
            {getEventsForDate(selectedDateKey).length === 0 ? (
              <p className="text-xs text-gray-500 font-medium py-6 text-center border border-dashed border-gray-200 dark:border-white/10 rounded-xl">No tasks or events on this date.</p>
            ) : (
              getEventsForDate(selectedDateKey).map((item) => (
                <div
                  key={item.id}
                  onClick={() => item.isTask && navigate(`/tasks/${item.taskId}`)}
                  className={`flex items-start justify-between p-4 rounded-xl bg-gray-50 dark:bg-[#0A0D14] border border-gray-200 dark:border-white/5 transition-all ${item.isTask ? 'cursor-pointer hover:border-[#FF2D88]/40 hover:shadow-md hover:-translate-y-0.5 group' : ''}`}
                >
                  <div className="flex items-start gap-3 min-w-0 pr-2">
                    <span className={`w-3 h-3 mt-1 rounded-full flex-shrink-0 ${CATEGORIES[item.category]?.color || 'bg-gray-400'} shadow-[0_0_8px_currentColor] opacity-80`} />
                    <div className="min-w-0 flex flex-col items-start">
                      <p className={`text-sm font-bold text-gray-900 dark:text-white leading-tight ${item.isTask ? 'group-hover:text-[#FF2D88] transition-colors' : ''}`}>
                        {item.title}
                      </p>
                      
                      {item.isHoliday && (
                        <span className={`mt-2 px-2.5 py-1 text-[9px] uppercase tracking-wider font-bold rounded-md border ${
                          item.category === 'poya' 
                          ? 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/30' 
                          : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                        }`}>
                          {item.category === 'poya' ? 'Poya Day' : 'Public Holiday'}
                        </span>
                      )}

                      {!item.isHoliday && (
                        <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mt-1">{item.time}</p>
                      )}
                    </div>
                  </div>

                  {item.isTask ? (
                    <div className="mt-1">
                      <ArrowRight size={16} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </div>
                  ) : item.isHoliday ? (
                    <div className="mt-1">
                      <MapPin size={16} className={`${item.category === 'poya' ? 'text-yellow-500/60' : 'text-emerald-500/60'} flex-shrink-0`} />
                    </div>
                  ) : (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteReminder(item.id); }}
                      className="text-gray-400 hover:text-red-500 bg-white dark:bg-white/5 p-2 rounded-lg transition-colors flex-shrink-0 hover:bg-red-50 dark:hover:bg-red-500/10"
                      title="Delete Reminder"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}