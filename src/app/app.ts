import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { SplashService } from './core/layout/splash.service';
import { ThemeService } from './core/theme/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<router-outlet />',
})
export class App {
  constructor() {
    inject(ThemeService); // khởi tạo sớm để áp theme ngay lần render đầu
    void inject(SplashService).dismissWhenReady(); // ẩn splash tĩnh khi app sẵn sàng
  }
}
