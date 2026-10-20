import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ZardCardImports } from '@shared/components/card';
import { cn } from '@shared/utils/cn';

export interface TodayWeekDay {
  date: string;
  day: number;
  label: string;
  isToday: boolean;
  dotClass: string | null;
}

@Component({
  selector: 'app-today-week-strip',
  imports: [ZardCardImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block md:hidden' },
  template: `
    <z-card class="py-2.5">
      <z-card-content class="px-2">
        <nav aria-label="Tuần này">
          <ol class="grid grid-cols-7">
            @for (d of days(); track d.date) {
              <li class="flex flex-col items-center gap-1">
                <span class="text-xs text-muted-foreground">{{ d.label }}</span>
                <span
                  [class]="
                    cn(
                      'grid size-9 place-items-center rounded-md text-sm font-semibold',
                      d.isToday && 'bg-primary text-primary-foreground'
                    )
                  "
                  [attr.aria-current]="d.isToday ? 'date' : null"
                >
                  {{ d.day }}
                </span>
                <span [class]="cn('size-1.5 rounded-full', d.dotClass ?? 'bg-transparent')" aria-hidden="true"></span>
              </li>
            }
          </ol>
        </nav>
      </z-card-content>
    </z-card>
  `,
})
export class TodayWeekStrip {
  readonly days = input.required<TodayWeekDay[]>();
  protected readonly cn = cn;
}
