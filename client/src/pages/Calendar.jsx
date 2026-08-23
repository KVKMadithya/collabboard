import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Bell, Plus, Clock, Tag } from 'lucide-react';
import { SRI_LANKA_HOLIDAYS } from '../utils/sriLankaHolidays';

const CATEGORIES = {
  Meeting: { color: 'bg-purple-500', text: 'text-purple-400', border: 'border-purple-500' },
  'Task due': { color: 'bg-orange-500', text: 'text-orange-400', border: 'border-orange-500' },
  Urgent: { color: 'bg-red-500', text: 'text-red-400', border: 'border-red-500' },
  Report: { color: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-500' },
  holiday: { color: 'bg-emerald-500', text: 'text-emerald-400', border: 'border-emerald-500' }
};

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 4, 1)); // May 2026
  const [selectedDate, setSelectedDate] = useState(new Date(2026, 4, 16)); // 16 May 2026

  // Sample default events matching your design
  const [reminders, setReminders] = useState([
    { id: 1, date: '2026-05-15', title: 'Fix authentication bug', time: '5:00 PM', category: 'Urgent', note: 'Due 5,00 PM Urgent Task' },
    { id: 2, date: '2026-05-16', title: 'Team meeting', time: '9:00 AM', category: 'Meeting', note: 'Weekly sync' },
    { id: 3, date: '2026-05-16', title: 'Review roadmap', time: '11:00 AM', category: 'Task due', note: 'Q3 feature planning' },
    { id: 4, date: '2026-05-25', title: 'Submit quarterly report', time: '2:00 PM', category: 'Report', note: 'Send to lead' }
  ]);

  // Form Inputs
  const [title, setTitle] = useState('');
  const [linkedTask, setLinkedTask] = useState('Select a task..');
  const [reminderTime, setReminderTime] = useState('05:00 PM');
  const [category, setCategory] = useState('Meeting');
  const [repeat, setRepeat] = useState('Never');

  // Month navigation helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

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

  // Combine user events and Sri Lankan holidays
  const getEventsForDate = (dateKey) => {
    const userEvents = reminders.filter((r) => r.date === dateKey);
    const holidays = SRI_LANKA_HOLIDAYS.filter((h) => h.date === dateKey).map((h) => ({
      id: `hol-${h.date}`,
      date: h.date,
      title: h.title,
      time: 'All Day',
      category: 'holiday'
    }));
    return [...userEvents, ...holidays];
  };

  const handleAddReminder = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newReminder = {
      id: Date.now(),
      date: selectedDateKey,
      title: title.trim(),
      time: reminderTime,
      category,
      note: linkedTask !== 'Select a task..' ? linkedTask : ''
    };

    setReminders((prev) => [...prev, newReminder]);
    setTitle('');
  };

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-[calc(100vh-80px)] bg-[#0A0B14] text-white p-6 gap-6 overflow-y-auto">
      
      {/* LEFT SECTION: CALENDAR GRID */}
      <div className="flex-1 flex flex-col justify-between bg-[#060813] border border-white/10 rounded-2xl p-6 shadow-xl">
        
        {/* Calendar Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Calendar</h1>
          <p className="text-sm text-gray-400 mt-1">Select a date to view or add reminders for tasks and notes</p>
        </div>

        {/* Month & Year Navigation */}
        <div className="flex items-center justify-between mb-8 px-4">
          <h2 className="text-xl font-bold tracking-wide">
            {monthNames[month]} {year}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-xl bg-[#121629] hover:bg-white/10 text-gray-300 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-2 rounded-xl bg-[#121629] hover:bg-white/10 text-gray-300 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Weekday Labels */}
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-gray-400 mb-3">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="py-1">{day}</div>
          ))}
        </div>

        {/* Calendar Days Grid */}
        <div className="grid grid-cols-7 gap-3 text-center flex-1">
          {/* Empty cells before month starts */}
          {Array.from({ length: firstDayIndex }).map((_, i) => (
            <div key={`empty-${i}`} className="p-3"></div>
          ))}

          {/* Month Days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const thisDate = new Date(year, month, dayNum);
            const dateKey = formatDateKey(thisDate);
            const dayEvents = getEventsForDate(dateKey);
            const isSelected = selectedDateKey === dateKey;

            return (
              <button
                key={dayNum}
                onClick={() => setSelectedDate(thisDate)}
                className={`relative flex flex-col items-center justify-center p-3 rounded-2xl min-h-[58px] transition-all duration-200 ${
                  isSelected
                    ? 'bg-gradient-to-br from-[#FF2D88] to-[#D81B69] text-white shadow-lg shadow-[#FF2D88]/40 scale-105 font-bold z-10'
                    : 'bg-[#121629]/40 hover:bg-[#121629] text-gray-200 border border-white/5'
                }`}
              >
                <span className="text-base">{dayNum}</span>

                {/* Event Color Dots below Day Number */}
                {dayEvents.length > 0 && (
                  <div className="flex items-center gap-1 mt-1.5">
                    {dayEvents.slice(0, 3).map((evt, idx) => (
                      <span
                        key={idx}
                        className={`w-1.5 h-1.5 rounded-full ${
                          CATEGORIES[evt.category]?.color || 'bg-gray-400'
                        } ${isSelected ? 'ring-1 ring-white' : ''}`}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend Footer */}
        <div className="flex flex-wrap items-center justify-center gap-6 mt-8 pt-6 border-t border-white/10 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
            <span>Meeting</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
            <span>Task due</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
            <span>Urgent</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <span>Report</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>SL Holiday / Poya</span>
          </div>
        </div>

      </div>

      {/* RIGHT SECTION: ADD REMINDER & UPCOMING LIST */}
      <div className="w-full lg:w-96 flex flex-col gap-6">
        
        {/* Add Reminder Card */}
        <div className="bg-[#121629] border border-white/10 rounded-2xl p-5 shadow-xl">
          <h2 className="text-base font-bold text-white">Add Reminder</h2>
          <p className="text-xs text-[#FF2D88] font-medium mt-0.5 mb-4">
            For {selectedDate.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' })}, {reminderTime}
          </p>

          <form onSubmit={handleAddReminder} className="space-y-3">
            {/* Task or Note selector */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">Link to task or note</label>
              <select
                value={linkedTask}
                onChange={(e) => setLinkedTask(e.target.value)}
                className="w-full bg-[#0A0B14] border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-[#FF2D88]"
              >
                <option>Select a task..</option>
                <option>Fix authentication bug</option>
                <option>Review roadmap</option>
                <option>Submit quarterly report</option>
              </select>
            </div>

            {/* Reminder Title Input */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">Reminder Title</label>
              <input
                type="text"
                placeholder="e.g Submit report"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#0A0B14] border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#FF2D88]"
              />
            </div>

            {/* Time & Repeat Selectors */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Time</label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="w-full bg-[#0A0B14] border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-[#FF2D88]"
                  />
                  <Clock size={14} className="absolute right-2.5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Repeat</label>
                <select
                  value={repeat}
                  onChange={(e) => setRepeat(e.target.value)}
                  className="w-full bg-[#0A0B14] border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-[#FF2D88]"
                >
                  <option>Never</option>
                  <option>Daily</option>
                  <option>Weekly</option>
                  <option>Monthly</option>
                </select>
              </div>
            </div>

            {/* Category Select */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#0A0B14] border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-[#FF2D88]"
              >
                <option value="Meeting">Meeting</option>
                <option value="Task due">Task due</option>
                <option value="Urgent">Urgent</option>
                <option value="Report">Report</option>
              </select>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full mt-2 bg-[#FF2D88] hover:bg-[#FF2D88]/80 text-white text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Plus size={16} />
              <span>Add Reminder</span>
            </button>
          </form>
        </div>

        {/* Upcoming Reminders Feed */}
        <div className="flex-1 bg-[#121629] border border-white/10 rounded-2xl p-5 shadow-xl flex flex-col min-h-0">
          <h2 className="text-base font-bold text-white mb-3">Upcoming Reminders</h2>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Selected Day Events */}
            <div>
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-2">
                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' })} - Selected
              </span>

              {getEventsForDate(selectedDateKey).length === 0 ? (
                <p className="text-xs text-gray-500 italic py-2">No events scheduled for this day.</p>
              ) : (
                <div className="space-y-2">
                  {getEventsForDate(selectedDateKey).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-[#0A0B14] border border-white/5"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`w-2 h-2 rounded-full ${CATEGORIES[item.category]?.color || 'bg-gray-400'}`} />
                        <div>
                          <p className="text-xs font-medium text-white">{item.title}</p>
                          <p className="text-[10px] text-gray-400">{item.time}</p>
                        </div>
                      </div>
                      <Bell size={14} className="text-gray-400" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* All Upcoming Events */}
            <div className="pt-2 border-t border-white/5">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-2">
                All Scheduled
              </span>
              <div className="space-y-2">
                {reminders
                  .filter((r) => r.date !== selectedDateKey)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-[#0A0B14] border border-white/5"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`w-2 h-2 rounded-full ${CATEGORIES[item.category]?.color || 'bg-gray-400'}`} />
                        <div>
                          <p className="text-xs font-medium text-white">{item.title}</p>
                          <p className="text-[10px] text-gray-400">
                            {item.date} • {item.time}
                          </p>
                        </div>
                      </div>
                      <Bell size={14} className="text-gray-400" />
                    </div>
                  ))}
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}