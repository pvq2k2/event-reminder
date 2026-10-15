import { Injectable, signal } from '@angular/core';

export type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

@Injectable({ providedIn: 'root' })
export class NotificationPermissionService {
  readonly state = signal<PermissionState>(this.read());

  private read(): PermissionState {
    return typeof Notification === 'undefined' ? 'unsupported' : (Notification.permission as PermissionState);
  }

  refresh(): void {
    this.state.set(this.read());
  }

  async request(): Promise<PermissionState> {
    if (typeof Notification === 'undefined') return 'unsupported';
    const result = await Notification.requestPermission();
    this.state.set(result as PermissionState);
    return result as PermissionState;
  }
}
