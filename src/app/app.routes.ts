import { type Routes } from '@angular/router';
import { AppShell } from './core/layout/app-shell';

export const routes: Routes = [
  {
    path: '',
    component: AppShell,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'today' },
      {
        path: 'today',
        title: 'Hôm nay · Event Reminder',
        loadComponent: () => import('./features/today/today.page').then((m) => m.TodayPage),
      },
      {
        path: 'calendar',
        title: 'Lịch · Event Reminder',
        loadComponent: () => import('./features/calendar/calendar.page').then((m) => m.CalendarPage),
      },
      {
        path: 'contacts',
        title: 'Danh bạ · Event Reminder',
        loadComponent: () => import('./features/contacts/contacts.page').then((m) => m.ContactsPage),
      },
      {
        path: 'settings',
        title: 'Cài đặt · Event Reminder',
        loadComponent: () => import('./features/settings/settings.page').then((m) => m.SettingsPage),
      },
      {
        path: 'events/new',
        title: 'Tạo sự kiện · Event Reminder',
        loadComponent: () => import('./features/events/event-create.page').then((m) => m.EventCreatePage),
      },
      {
        path: 'events/:id',
        title: 'Chi tiết sự kiện · Event Reminder',
        loadComponent: () => import('./features/events/event-detail.page').then((m) => m.EventDetailPage),
      },
    ],
  },
  { path: '**', redirectTo: 'today' },
];
