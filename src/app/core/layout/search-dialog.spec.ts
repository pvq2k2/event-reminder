import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SearchService } from '@core/data/search.service';
import type { AppEvent, Contact } from '@core/domain/models';
import { describe, expect, it, vi } from 'vitest';

import { SearchDialog } from './search-dialog';

const event: AppEvent = {
  id: 'e1',
  title: 'Họp nhóm',
  startDate: '2026-10-24',
  startTime: '09:00',
  timezone: 'Asia/Ho_Chi_Minh',
  isAllDay: false,
  calendarSystem: 'gregorian',
  category: 'work',
  status: 'active',
  rule: { kind: 'none' },
  reminders: [],
  exceptions: [],
  contactIds: [],
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
};

const contact: Contact = {
  id: 'c1',
  displayName: 'Nguyễn Văn An',
  phone: '0901234567',
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
};

const searchStub = vi.fn().mockResolvedValue({ events: [event], contacts: [contact] });

describe('SearchDialog', () => {
  async function setup(open = true) {
    await TestBed.configureTestingModule({
      imports: [SearchDialog],
      providers: [provideRouter([]), { provide: SearchService, useValue: { search: searchStub } }],
    }).compileComponents();

    const fixture = TestBed.createComponent(SearchDialog);
    fixture.componentRef.setInput('open', open);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  }

  it('mở overlay bằng z-dialog khi open=true', async () => {
    const fixture = await setup(false);
    expect(document.querySelector('z-dialog-panel')).toBeNull();

    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(document.querySelector('z-dialog-panel')).not.toBeNull();
    fixture.destroy();
  });

  it('hiển thị kết quả sự kiện và liên hệ sau khi gõ', async () => {
    const fixture = await setup();
    const input = document.querySelector('#global-search') as HTMLInputElement | null;
    if (!input) throw new Error('Không tìm thấy ô tìm kiếm');

    input.value = 'an';
    input.dispatchEvent(new Event('input'));
    await new Promise((resolve) => setTimeout(resolve, 160));
    fixture.detectChanges();

    const links = [...document.querySelectorAll<HTMLAnchorElement>('z-dialog-panel a')];
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/events/e1', '/contacts']);

    fixture.destroy();
  });
});
