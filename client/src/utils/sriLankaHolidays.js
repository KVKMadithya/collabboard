// Sri Lankan National Holidays & Poya Days Dataset
export const SRI_LANKA_HOLIDAYS = [
  { date: '2026-01-03', title: 'Duruthu Full Moon Poya Day', category: 'holiday' },
  { date: '2026-01-14', title: 'Tamil Thai Pongal Day', category: 'holiday' },
  { date: '2026-02-01', title: 'Navam Full Moon Poya Day', category: 'holiday' },
  { date: '2026-02-04', title: 'National Independence Day', category: 'holiday' },
  { date: '2026-03-02', title: 'Medin Full Moon Poya Day', category: 'holiday' },
  { date: '2026-04-01', title: 'Bak Full Moon Poya Day', category: 'holiday' },
  { date: '2026-04-13', title: 'Day prior to Sinhala & Tamil New Year', category: 'holiday' },
  { date: '2026-04-14', title: 'Sinhala & Tamil New Year Day', category: 'holiday' },
  { date: '2026-05-01', title: 'May Day', category: 'holiday' },
  { date: '2026-05-15', title: 'Vesak Full Moon Poya Day', category: 'holiday' },
  { date: '2026-05-16', title: 'Day after Vesak Full Moon Poya Day', category: 'holiday' },
  { date: '2026-06-13', title: 'Poson Full Moon Poya Day', category: 'holiday' },
  { date: '2026-07-13', title: 'Esala Full Moon Poya Day', category: 'holiday' },
  { date: '2026-08-11', title: 'Nikini Full Moon Poya Day', category: 'holiday' },
  { date: '2026-09-10', title: 'Binara Full Moon Poya Day', category: 'holiday' },
  { date: '2026-10-10', title: 'Vap Full Moon Poya Day', category: 'holiday' },
  { date: '2026-11-08', title: 'Il Full Moon Poya Day', category: 'holiday' },
  { date: '2026-12-08', title: 'Unduvap Full Moon Poya Day', category: 'holiday' },
  { date: '2026-12-25', title: 'Christmas Day', category: 'holiday' },
];

export const getHolidaysForDate = (dateStr) => {
  return SRI_LANKA_HOLIDAYS.filter(h => h.date === dateStr);
};