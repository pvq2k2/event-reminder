import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { SplashService } from './splash.service';

describe('SplashService', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('không làm gì khi không có phần tử splash', async () => {
    TestBed.configureTestingModule({});
    await expect(TestBed.inject(SplashService).dismissWhenReady()).resolves.toBeUndefined();
  });

  it('ẩn rồi gỡ phần tử splash khi app sẵn sàng', async () => {
    const el = document.createElement('div');
    el.id = 'er-splash';
    document.body.appendChild(el);

    TestBed.configureTestingModule({});
    vi.spyOn(TestBed.inject(ApplicationRef), 'isStable', 'get').mockReturnValue(of(true));

    vi.useFakeTimers();
    const done = TestBed.inject(SplashService).dismissWhenReady();
    await vi.advanceTimersByTimeAsync(1500);
    await done;
    vi.useRealTimers();

    expect(document.getElementById('er-splash')).toBeNull();
  });
});
