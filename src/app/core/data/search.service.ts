import { inject, Injectable } from '@angular/core';

import type { AppEvent, Contact } from '../domain/models';
import { ContactRepository, normalize } from './contact.repository';
import { EventRepository } from './event.repository';

export interface SearchResults {
  events: AppEvent[];
  contacts: Contact[];
}

const LIMIT = 6;

/** Tìm nhanh trong sự kiện đang hoạt động và danh bạ (không phân biệt dấu). */
@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly events = inject(EventRepository);
  private readonly contacts = inject(ContactRepository);

  async search(query: string): Promise<SearchResults> {
    const q = normalize(query);
    if (!q) return { events: [], contacts: [] };

    const [events, contacts] = await Promise.all([this.events.listActive(), this.contacts.search(query)]);
    return {
      events: events
        .filter((event) =>
          [event.title, event.location, event.description].some((value) => value && normalize(value).includes(q)),
        )
        .sort((a, b) => a.startDate.localeCompare(b.startDate) || (a.startTime ?? '').localeCompare(b.startTime ?? ''))
        .slice(0, LIMIT),
      contacts: contacts.slice(0, LIMIT),
    };
  }
}
