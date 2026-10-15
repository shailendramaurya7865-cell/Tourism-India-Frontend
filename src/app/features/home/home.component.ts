import {
  Component,
  OnInit,
  inject,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs';

import { HomeService } from '../../core/services/home.service';
import { TouristPlace } from '../../core/models/tourist-place.model';
import { Category } from '../../core/models/category.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {

  private requestCount = 0;

  private readonly homeService = inject(HomeService);
  private readonly cdr = inject(ChangeDetectorRef);

  featuredDestinations: TouristPlace[] = [];
  categories: Category[] = [];

  loading = false;
  errorMessage = '';

  instanceId = Math.random();

  ngOnInit(): void {
    console.log('INIT', this.instanceId);
    this.loadHomeData();
  }

  loadHomeData(): void {

    const requestId = ++this.requestCount;

    console.log(`[Home ${requestId}] Starting`);

    this.loading = true;
    this.errorMessage = '';

    this.homeService.getHomeData()
      .subscribe({
        next: (response) => {

          console.log(`[Home ${requestId}] Response`, response);

          this.featuredDestinations =
            response.data?.featuredDestinations ?? [];

          this.categories =
            response.data?.categories ?? [];

          this.loading = false;

          this.cdr.detectChanges();

          console.log(`[Home ${requestId}] Data assigned`, {
            loading: this.loading,
            places: this.featuredDestinations.length,
            categories: this.categories.length
          });

          console.log('UI updated');
        },

        error: (error) => {

          console.error(`[Home ${requestId}] Error`, error);

          this.loading = false;

          this.errorMessage =
            'Unable to load homepage data. Please try again.';

          this.cdr.detectChanges();
        },

        complete: () => {

          console.log(`[Home ${requestId}] Completed`);

          this.loading = false;

          this.cdr.detectChanges();
        }
      });
  }

  retry(): void {
    this.loadHomeData();
  }

  getCategoryIcon(name: string): string {
    const icons: Record<string, string> = {
      Historical: '🏛️',
      Religious: '🛕',
      Beach: '🏖️',
      Adventure: '🧗',
      Wildlife: '🐅',
      'Hill Station': '⛰️',
      Nature: '🌿'
    };

    return icons[name] ?? '✨';
  }
}