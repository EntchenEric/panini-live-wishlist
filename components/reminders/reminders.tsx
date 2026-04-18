'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNotification } from '../notification-provider';
import { RemindersContext, useRemindersContext, Reminder, ReminderType } from './context';
import {
  Clock,
  X,
} from 'lucide-react';

const REMINDERS_STORAGE_KEY = 'panini-reminders';
const INTERVAL_DURATIONS: Record<string, number> = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
  yearly: 365 * 24 * 60 * 60 * 1000,
  always: 6 * 60 * 60 * 1000,
} as const;
const DEFAULT_INTERVAL = 6 * 60 * 60 * 1000;

function validateReminders(data: unknown): Reminder[] {
  if (!Array.isArray(data)) return [];
  return data.filter((item): item is Reminder => {
    if (!item || typeof item !== 'object') return false;
    const r = item as Record<string, unknown>;
    return typeof r.id === 'string' && typeof r.name === 'string' && typeof r.type === 'string';
  });
}

export function RemindersProvider({ children }: { children: React.ReactNode }) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const { notify } = useNotification();
  const timersRef = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    const saved = localStorage.getItem(REMINDERS_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setReminders(validateReminders(parsed));
      } catch (e) {
        console.error('Failed to load reminders:', e);
        localStorage.removeItem(REMINDERS_STORAGE_KEY);
      }
    }
  }, []);

  const saveReminders = useCallback((updated: Reminder[]) => {
    setReminders(updated);
    localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(updated));
  }, []);

  useEffect(() => {
    const timers = timersRef.current;
    reminders.forEach((reminder) => {
      if (reminder.isActive && reminder.schedule && reminder.schedule.length > 0) {
        const interval = INTERVAL_DURATIONS[reminder.schedule[0]] ?? DEFAULT_INTERVAL;
        const timerId = `timer-${reminder.id}`;
        if (!timers[timerId]) {
          timers[timerId] = setInterval(() => {
            notify({
              title: 'Wishlist Reminder',
              message: getReminderMessage(reminder.type),
              type: 'info',
              autoDismiss: true,
            });
            saveReminders(reminders.map((r) =>
              r.id === reminder.id ? { ...r, lastTriggered: new Date() } : r
            ));
          }, interval);
        }
      }
    });

    return () => {
      Object.values(timers).forEach((timer) => clearInterval(timer));
    };
  }, [reminders, notify, saveReminders]);

  const addReminder = useCallback(async (reminder: Omit<Reminder, 'id' | 'createdAt'>) => {
    const newReminder: Reminder = {
      ...reminder,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      isActive: true,
    };

    const updated = [...reminders, newReminder];
    saveReminders(updated);
    notify({
      title: 'Reminder Created',
      message: `You'll be notified when ${reminder.name.toLowerCase()}`,
      type: 'success',
      autoDismiss: true,
    });
  }, [reminders, saveReminders, notify]);

  const updateReminder = useCallback(async (id: string, updates: Partial<Reminder>) => {
    const updated = reminders.map((r) => (r.id === id ? { ...r, ...updates } : r));
    saveReminders(updated);
  }, [reminders, saveReminders]);

  const deleteReminder = useCallback(async (id: string) => {
    const timerId = `timer-${id}`;
    if (timersRef.current[timerId]) {
      clearInterval(timersRef.current[timerId]);
      delete timersRef.current[timerId];
    }

    const updated = reminders.filter((r) => r.id !== id);
    saveReminders(updated);
    notify({
      title: 'Reminder Deleted',
      message: 'This reminder has been removed.',
      type: 'info',
      autoDismiss: true,
    });
  }, [reminders, saveReminders, notify]);

  const toggleReminder = useCallback(async (id: string) => {
    const updated = reminders.map((r) =>
      r.id === id ? { ...r, isActive: !r.isActive } : r
    );
    saveReminders(updated);
  }, [reminders, saveReminders]);

  const scheduleReminder = useCallback(
    (_interval: string | number, _handler: () => void) => {
      // Scheduling is handled by the effect above
    },
    []
  );

  return (
    <RemindersContext.Provider value={{ reminders, addReminder, updateReminder, deleteReminder, toggleReminder, scheduleReminder }}>
      {children}
      <RemindersManager />
    </RemindersContext.Provider>
  );
}

export function RemindersManager() {
  const { reminders, deleteReminder, toggleReminder } =
    useRemindersContext();

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <RemindersCountBadge count={reminders.filter((r) => r.isActive).length} />
      <div className="flex items-center gap-1">
        {reminders.slice(-5).reverse().map((reminder) => (
          <ReminderStatusBadge key={reminder.id} reminder={reminder} onToggle={toggleReminder} onDelete={deleteReminder} />
        ))}
      </div>
    </div>
  );
}

function getReminderMessage(type: ReminderType) {
  switch (type) {
    case 'birthday':
      return 'Happy Birthday! Time to celebrate!';
    case 'holiday':
      return 'Happy Holiday! Check your wishlist.';
    case 'sale':
      return 'Great deals found on your wishlist items!';
    case 'availability':
      return 'Great news! An item on your wishlist is now available!';
    case 'general':
    default:
      return 'Reminder for your wishlist!';
  }
}

function ReminderStatusBadge({
  reminder,
  onToggle,
  onDelete,
}: {
  reminder: Reminder;
  onToggle: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  return (
    <div className="relative group flex items-center gap-1.5" onClick={() => onToggle(reminder.id)}>
      <button
        className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-all ${
          reminder.isActive
            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
            : 'bg-muted text-muted-foreground hover:bg-muted/80'
        }`}
        style={{ cursor: 'pointer' }}
        aria-label={`${reminder.type} reminder${reminder.isActive ? ' (active)' : ' (inactive)'}`}
      >
        <Clock className="h-3.5 w-3.5" />
        {reminder.type.charAt(0).toUpperCase() + reminder.type.slice(1)}
      </button>
      <button
        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/20 rounded"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(reminder.id);
        }}
        aria-label={`Delete ${reminder.type} reminder`}
      >
        <X className="h-3 w-3 text-destructive" />
      </button>
    </div>
  );
}

function RemindersCountBadge({ count }: { count: number }) {
  if (count === 0) return null;

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Clock className="h-3.5 w-3.5" />
      <span>{count} active reminder{count !== 1 ? 's' : ''}</span>
    </div>
  );
}