import { Injectable } from '@angular/core';

import { epochMsToVnLocal, type ISODate } from '../domain/date';

/** Tách thời gian khỏi code nghiệp vụ để test được. Luôn tính theo giờ Việt Nam. */
@Injectable({ providedIn: 'root' })
export class Clock {
  now(): number {
    return Date.now();
  }
  todayIso(): ISODate {
    return epochMsToVnLocal(this.now()).date;
  }
  nowTime(): string {
    return epochMsToVnLocal(this.now()).time;
  }
}
