import { addDays, parseDateStr, todayStr, dayOfWeek } from '../utils/dates.js';
import { DEFAULT_PREFS, DEFAULT_DASHBOARD } from './defaults.js';
import { initialTimer } from '../utils/timer.js';

/**
 * Realistic first-run data.
 *
 * Everything date-based is generated *relative to today* so the app always
 * opens with plausible overdue / upcoming records and fresh charts. IDs are
 * stable, readable constants so repeated resets produce identical records.
 * Sample data is only ever installed on first launch or via the explicit
 * "Reset to Sample Data" action — never on every start.
 */

/** Epoch ms at `HH:MM` on the given date string (local time). */
function at(dateStr, hour, minute = 0) {
  const d = parseDateStr(dateStr);
  if (!d) return Date.now();
  d.setHours(hour, minute, 0, 0);
  return d.getTime();
}

/** `{date: 'YYYY-MM-DD', hour}` shortcut. */
function day(offset) {
  return addDays(todayStr(), -offset);
}

const NOW = Date.now;

export function createSampleData() {
  const today = todayStr();

  /* ----------------------------- tasks ----------------------------- */
  const mkTask = (id, over) => ({
    id,
    title: 'Untitled',
    description: '',
    priority: 'Medium',
    dueDate: null,
    dueTime: null,
    category: 'Personal',
    estimateMin: 30,
    status: 'To Do',
    createdAt: NOW(),
    completedAt: null,
    ...over,
  });

  const tasks = [
    mkTask('task-sample-01', {
      title: 'Send weekly progress report to mentor',
      description: 'Summarise this week\'s work on the research prototype.',
      priority: 'High',
      category: 'Work',
      dueDate: today,
      dueTime: '17:00',
      status: 'Completed',
      estimateMin: 30,
      completedAt: at(today, 11, 20),
      createdAt: at(addDays(today, -6), 9, 0),
    }),
    mkTask('task-sample-02', {
      title: 'Review lecture notes for database exam',
      description: 'Chapters 4–7, focus on normalisation exercises.',
      priority: 'Medium',
      category: 'Study',
      dueDate: today,
      status: 'Completed',
      estimateMin: 60,
      completedAt: at(today, 14, 5),
      createdAt: at(addDays(today, -4), 18, 0),
    }),
    mkTask('task-sample-03', {
      title: 'Pay electricity bill',
      description: 'Due before the late-fee window closes.',
      priority: 'Urgent',
      category: 'Finance',
      dueDate: day(3),
      status: 'To Do',
      estimateMin: 10,
      createdAt: at(day(8), 8, 30),
    }),
    mkTask('task-sample-04', {
      title: 'Submit assignment draft',
      description: 'First draft of the human-computer interaction case study.',
      priority: 'High',
      category: 'Study',
      dueDate: day(1),
      dueTime: '23:59',
      status: 'In Progress',
      estimateMin: 120,
      createdAt: at(day(10), 10, 0),
    }),
    mkTask('task-sample-05', {
      title: 'Renew library book',
      priority: 'Low',
      category: 'Personal',
      dueDate: day(5),
      status: 'To Do',
      estimateMin: 15,
      createdAt: at(day(12), 16, 0),
    }),
    mkTask('task-sample-06', {
      title: 'Prepare materials for team standup',
      description: 'Blockers, wins, and the demo plan for Friday.',
      priority: 'Medium',
      category: 'Work',
      dueDate: today,
      dueTime: '09:30',
      status: 'In Progress',
      estimateMin: 20,
      createdAt: at(day(1), 8, 0),
    }),
    mkTask('task-sample-07', {
      title: 'Buy groceries for the week',
      priority: 'Low',
      category: 'Personal',
      dueDate: today,
      status: 'To Do',
      estimateMin: 45,
      createdAt: at(day(2), 19, 0),
    }),
    mkTask('task-sample-08', {
      title: 'Plan next week\'s study schedule',
      priority: 'Medium',
      category: 'Study',
      dueDate: day(-1),
      status: 'To Do',
      estimateMin: 25,
      createdAt: at(day(3), 20, 0),
    }),
    mkTask('task-sample-09', {
      title: 'Dentist appointment — check-up',
      priority: 'High',
      category: 'Health',
      dueDate: day(-2),
      dueTime: '15:00',
      status: 'To Do',
      estimateMin: 60,
      createdAt: at(day(14), 12, 0),
    }),
    mkTask('task-sample-10', {
      title: 'Finish project proposal',
      description: 'Scope, timeline and risk section for the LifeOS write-up.',
      priority: 'Urgent',
      category: 'Work',
      dueDate: day(-4),
      dueTime: '12:00',
      status: 'In Progress',
      estimateMin: 180,
      createdAt: at(day(9), 9, 15),
    }),
    mkTask('task-sample-11', {
      title: 'Call parents',
      priority: 'Low',
      category: 'Personal',
      dueDate: day(-1),
      dueTime: '20:00',
      status: 'To Do',
      estimateMin: 30,
      createdAt: at(day(5), 21, 0),
    }),
    mkTask('task-sample-12', {
      title: 'Research internship applications',
      description: 'Shortlist 8 companies and note their deadlines.',
      priority: 'Medium',
      category: 'Career',
      dueDate: day(-6),
      status: 'To Do',
      estimateMin: 90,
      createdAt: at(day(20), 11, 0),
    }),
    mkTask('task-sample-13', {
      title: 'Archive old project files',
      priority: 'Low',
      category: 'Work',
      status: 'Completed',
      estimateMin: 20,
      completedAt: at(day(2), 16, 40),
      createdAt: at(day(7), 9, 0),
    }),
    mkTask('task-sample-14', {
      title: 'Finish statistics problem set',
      priority: 'High',
      category: 'Study',
      dueDate: day(4),
      dueTime: '18:00',
      status: 'Completed',
      estimateMin: 75,
      completedAt: at(day(4), 15, 10),
      createdAt: at(day(9), 13, 0),
    }),
    mkTask('task-sample-15', {
      title: 'Update portfolio with new case study',
      priority: 'Medium',
      category: 'Career',
      dueDate: day(6),
      status: 'Completed',
      estimateMin: 120,
      completedAt: at(day(6), 19, 25),
      createdAt: at(day(15), 10, 0),
    }),
    mkTask('task-sample-16', {
      title: 'Book train tickets for the holidays',
      priority: 'Medium',
      category: 'Personal',
      dueDate: day(-9),
      status: 'Completed',
      estimateMin: 15,
      completedAt: at(day(9), 12, 5),
      createdAt: at(day(13), 8, 0),
    }),
    mkTask('task-sample-17', {
      title: 'Water the plants',
      priority: 'Low',
      category: 'Personal',
      dueDate: day(-11),
      status: 'Completed',
      estimateMin: 10,
      completedAt: at(day(11), 18, 30),
      createdAt: at(day(12), 8, 0),
    }),
  ];

  /* ----------------------------- habits ---------------------------- */
  const mkHabit = (id, over) => ({
    id,
    name: 'Habit',
    description: '',
    icon: 'circle',
    category: 'Wellbeing',
    schedule: 'daily',
    createdAt: day(30),
    target: '',
    reminder: null,
    archived: false,
    ...over,
  });

  const habits = [
    mkHabit('habit-sample-run', {
      name: 'Morning run',
      description: 'Easy 3 km to start the day.',
      icon: 'footprints',
      category: 'Health',
      target: '3 km',
      reminder: '06:30',
      createdAt: day(30),
    }),
    mkHabit('habit-sample-read', {
      name: 'Read 20 pages',
      description: 'Fiction or non-fiction — no screens.',
      icon: 'book-open',
      category: 'Growth',
      schedule: [1, 2, 3, 4, 5], // Mon–Fri, weekends are rest days
      target: '20 pages',
      reminder: '21:00',
      createdAt: day(28),
    }),
    mkHabit('habit-sample-meditate', {
      name: 'Meditate',
      description: 'Ten quiet minutes before breakfast.',
      icon: 'leaf',
      category: 'Wellbeing',
      target: '10 min',
      createdAt: day(30),
    }),
    mkHabit('habit-sample-water', {
      name: 'Drink 2L of water',
      icon: 'droplets',
      category: 'Health',
      target: '2 L',
      createdAt: day(30),
    }),
    mkHabit('habit-sample-weekend', {
      name: 'Weekend long walk',
      description: 'Two hours outdoors, Saturday and Sunday.',
      icon: 'mountain',
      category: 'Health',
      schedule: [0, 6],
      createdAt: day(28),
    }),
    mkHabit('habit-sample-journal', {
      name: 'Evening journaling',
      description: 'Archived after switching to weekly reviews.',
      icon: 'pen-line',
      category: 'Reflection',
      createdAt: day(45),
      archived: true,
    }),
  ];

  /* -------------------------- habit logs --------------------------- */
  const habitLogs = [];
  let logSeq = 1;
  const addLog = (habitId, date) => {
    habitLogs.push({
      id: `hlog-sample-${String(logSeq++).padStart(3, '0')}`,
      habitId,
      date,
    });
  };

  const genLogs = (habitId, historyDays, { skipOffsets = [], includeToday = true, createdAtOffset = 30 }) => {
    for (let d = createdAtOffset; d >= 0; d -= 1) {
      if (!includeToday && d === 0) continue;
      if (skipOffsets.includes(d)) continue;
      const date = day(d);
      const habit = habits.find((h) => h.id === habitId);
      const days = habit.schedule === 'daily' ? null : habit.schedule;
      if (days && !days.includes(dayOfWeek(date))) continue; // rest day → no record
      if (d > historyDays) continue;
      addLog(habitId, date);
    }
  };

  // Morning run: steady daily habit — broke a 12-day streak by missing two days.
  genLogs('habit-sample-run', 30, { skipOffsets: [12, 11], createdAtOffset: 30 });
  // Reading: weekdays only, missed one scheduled day last week.
  genLogs('habit-sample-read', 28, { skipOffsets: [6], createdAtOffset: 28 });
  // Meditation: missed *yesterday* and not logged yet today → streak is 0.
  genLogs('habit-sample-meditate', 30, { skipOffsets: [1, 15, 14, 13], includeToday: false, createdAtOffset: 30 });
  // Water: perfect for the last 10 days.
  genLogs('habit-sample-water', 30, { skipOffsets: [4, 5, 6], createdAtOffset: 30 });
  // Weekend walk: only Sat/Sun records exist.
  genLogs('habit-sample-weekend', 27, { skipOffsets: [8], createdAtOffset: 28 });
  // Archived journaling habit with older history only.
  for (let d = 45; d >= 40; d -= 1) addLog('habit-sample-journal', day(d));

  /* ---------------------------- events ----------------------------- */
  const mkEvent = (id, dateOffset, over) => ({
    id,
    title: 'Event',
    description: '',
    date: addDays(today, dateOffset),
    start: '09:00',
    end: '10:00',
    category: 'Work',
    ...over,
  });

  const events = [
    mkEvent('event-sample-01', -2, {
      title: 'Weekly planning review',
      description: 'Review goals and lock the plan for the week.',
      start: '17:00',
      end: '18:00',
      category: 'Work',
    }),
    mkEvent('event-sample-02', -1, {
      title: 'Yoga class',
      start: '07:00',
      end: '08:00',
      category: 'Health',
    }),
    mkEvent('event-sample-03', 0, {
      title: 'Deep work — LifeOS report',
      description: 'Writing block, notifications off.',
      start: '09:00',
      end: '10:30',
      category: 'Work',
    }),
    mkEvent('event-sample-04', 0, {
      title: 'Lunch with Sam',
      start: '12:30',
      end: '13:30',
      category: 'Personal',
    }),
    mkEvent('event-sample-05', 0, {
      title: 'Team standup',
      description: 'Daily sync with the product team.',
      start: '15:00',
      end: '15:30',
      category: 'Meeting',
    }),
    mkEvent('event-sample-06', 1, {
      title: 'Project sync',
      description: 'Milestone check-in and blockers.',
      start: '10:00',
      end: '11:00',
      category: 'Meeting',
    }),
    mkEvent('event-sample-07', 1, {
      title: 'Gym session',
      start: '18:00',
      end: '19:00',
      category: 'Health',
    }),
    mkEvent('event-sample-08', 2, {
      title: 'Study group — algorithms',
      description: 'Chapter 12 problem set walkthrough.',
      start: '16:00',
      end: '17:30',
      category: 'Study',
    }),
    mkEvent('event-sample-09', 3, {
      title: 'Doctor visit',
      start: '11:00',
      end: '11:45',
      category: 'Health',
    }),
    mkEvent('event-sample-10', 5, {
      title: 'Birthday dinner',
      description: 'Reservation for six.',
      start: '19:00',
      end: '21:00',
      category: 'Personal',
    }),
  ];

  /* --------------------------- sessions ---------------------------- */
  const mkSession = (id, offset, minutes, hour, taskId = null) => ({
    id,
    type: 'focus',
    date: day(offset),
    startedAt: at(day(offset), hour, 0),
    endedAt: at(day(offset), hour, 0) + minutes * 60000,
    minutes,
    taskId,
  });

  const sessions = [
    mkSession('session-sample-01', 0, 50, 9, 'task-sample-10'),
    mkSession('session-sample-02', 0, 25, 14, 'task-sample-06'),
    mkSession('session-sample-03', 1, 100, 9, 'task-sample-10'),
    mkSession('session-sample-04', 2, 75, 10, 'task-sample-04'),
    mkSession('session-sample-05', 3, 120, 8, 'task-sample-04'),
    mkSession('session-sample-06', 4, 40, 16, null),
    mkSession('session-sample-07', 5, 90, 9, 'task-sample-14'),
    mkSession('session-sample-08', 6, 25, 20, 'task-sample-12'),
    mkSession('session-sample-09', 8, 60, 11, null),
    mkSession('session-sample-10', 10, 100, 9, 'task-sample-15'),
    mkSession('session-sample-11', 12, 45, 15, null),
    mkSession('session-sample-12', 14, 80, 10, 'task-sample-16'),
  ];

  /* ---------------------------- goals ------------------------------ */
  const ms = (id, title, done, description = '') => ({ id, title, description, done });

  const goals = [
    {
      id: 'goal-sample-portfolio',
      title: 'Ship personal portfolio website',
      description: 'A clean portfolio with three case studies, live by the end of the month.',
      targetDate: addDays(today, 21),
      category: 'Career',
      createdAt: at(day(24), 20, 0),
      milestones: [
        ms('ms-portfolio-01', 'Wireframe the layout', true),
        ms('ms-portfolio-02', 'Build the design system', true),
        ms('ms-portfolio-03', 'Write case study one', true),
        ms('ms-portfolio-04', 'Write case studies two and three', false),
        ms('ms-portfolio-05', 'Deploy and share with reviewers', false),
      ],
    },
    {
      id: 'goal-sample-10k',
      title: 'Run a 10K',
      description: 'Follow the 12-week plan without missing a long run.',
      targetDate: addDays(today, 35),
      category: 'Health',
      createdAt: at(day(28), 7, 0),
      milestones: [
        ms('ms-10k-01', 'Run 5K comfortably', true),
        ms('ms-10k-02', 'Complete an 8K long run', false),
        ms('ms-10k-03', 'Race-pace 10K rehearsal', false),
        ms('ms-10k-04', 'Finish the 10K race', false),
      ],
    },
    {
      id: 'goal-sample-course',
      title: 'Complete the React deep-dive course',
      description: 'Finish all modules and the final assessment.',
      targetDate: day(2),
      category: 'Study',
      createdAt: at(day(40), 21, 0),
      milestones: [
        ms('ms-course-01', 'Modules 1–3', true),
        ms('ms-course-02', 'Module 4: hooks in depth', true),
        ms('ms-course-03', 'Module 5: performance', true),
        ms('ms-course-04', 'Module 6: testing', true),
        ms('ms-course-05', 'Module 7: architecture', false),
        ms('ms-course-06', 'Final assessment', false),
      ],
    },
    {
      id: 'goal-sample-reading',
      title: 'Read 12 books this year',
      description: 'One book a month, alternating fiction and non-fiction.',
      targetDate: addDays(today, 60),
      category: 'Growth',
      createdAt: at(day(120), 22, 0),
      milestones: [
        ms('ms-reading-01', 'Q1 — four books', true),
        ms('ms-reading-02', 'Q2 — four books', true),
        ms('ms-reading-03', 'Q3 — four books', true),
        ms('ms-reading-04', 'Q4 — four books', true),
      ],
    },
    {
      id: 'goal-sample-surf',
      title: 'Learn to surf',
      description: 'No milestones yet — add some to start tracking progress.',
      targetDate: addDays(today, 90),
      category: 'Personal',
      createdAt: at(day(5), 12, 0),
      milestones: [],
    },
  ];

  return {
    tasks,
    habits,
    habitLogs,
    events,
    sessions,
    goals,
    prefs: { ...DEFAULT_PREFS },
    timer: initialTimer(),
    dashboard: { order: [...DEFAULT_DASHBOARD.order], hidden: [] },
    seededAt: NOW(),
  };
}
