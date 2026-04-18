'use client';

import { createContext, useContext } from 'react';

export interface Reminder {
  id: string;
  name: string;
  type: ReminderType;
  itemIds: string[];
  schedule?: string[];
  conditions?: Record<string, string | number | boolean>;
  isActive: boolean;
  createdAt: Date;
  lastTriggered?: Date;
}

export type ReminderType = 'birthday' | 'holiday' | 'sale' | 'availability' | 'general';

export interface RemindersContextType {
  reminders: Reminder[];
  addReminder: (reminder: Omit<Reminder, 'id' | 'createdAt'>) => Promise<void>;
  updateReminder: (id: string, updates: Partial<Reminder>) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  toggleReminder: (id: string) => Promise<void>;
  scheduleReminder: (schedule: string | number, handler: () => void) => void;
}

export const RemindersContext = createContext<RemindersContextType | null>(null);

export function useRemindersContext() {
  const context = useContext(RemindersContext);
  if (!context) {
    throw new Error('useRemindersContext must be used within a RemindersProvider');
  }
  return context;
}
