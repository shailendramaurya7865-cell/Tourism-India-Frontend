
import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { TouristPlace } from '../../core/models/tourist-place.model';
import { State } from '../../core/models/state.model';
import { City } from '../../core/models/city.model';

import { CategoryExplorationService } from '../../core/services/category-exploration.service';
import { StateService } from '../../core/services/state.services';
import { CityService } from '../../core/services/city.services';

@Component({
  selector: 'app-explore-category',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './explore-category.component.html',
  styleUrl: './explore-category.component.css'
})
export class ExploreCategoryComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly categoryService = inject(CategoryExplorationService);
  private readonly stateService = inject(StateService);
  private readonly cityService = inject(CityService);
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly destroy$ = new Subject<void>();
  private requestCount = 0;

  categorySlug = '';
  categoryName = 'Explore Places';
  categoryImage = 'assets/images/categories/default.jpg';

  touristPlaces: TouristPlace[] = [];
  states: State[] = [];
  cities: City[] = [];

  selectedStateId: number | null = null;
  selectedCityId: number | null = null;

  loading = false;
  loadingStates = false;
  loadingCities = false;
  errorMessage = '';

  private readonly categoryImages: Record<string, string> = {
    historical: 'assets/images/categories/historical.jpg',
    religious: 'assets/images/categories/religious.jpg',
    beaches: 'assets/images/categories/beaches.jpg',
    wildlife: 'assets/images/categories/wildlife.jpg',
    mountains: 'assets/images/categories/mountains.jpg',
    adventure: 'assets/images/categories/adventure.jpg',
    museums: 'assets/images/categories/museums.jpg',
    waterfalls: 'assets/images/categories/waterfalls.jpg',
    lakes: 'assets/images/categories/lakes.jpg',
    culture: 'assets/images/categories/culture.jpg'
  };

  ngOnInit(): void {
    this.loadStates();

    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const slug = params.get('slug');

        if (!slug) {
          return;
        }

        this.categorySlug = slug;
        this.categoryName = this.formatCategoryName(slug);
        this.categoryImage =
          this.categoryImages[slug.toLowerCase()] ??
          'assets/images/categories/default.jpg';

        this.selectedStateId = null;
        this.selectedCityId = null;
        this.cities = [];

        this.loadTouristPlaces();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private formatCategoryName(slug: string): string {
    return slug
      .split('-')
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  loadStates(): void {
    this.loadingStates = true;

    this.stateService
      .getStates()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: states => {
          this.states = states ?? [];
          this.loadingStates = false;
          this.cdr.detectChanges();
        },
        error: error => {
          console.error('Unable to load states', error);
          this.states = [];
          this.loadingStates = false;
          this.cdr.detectChanges();
        }
      });
  }

  onStateChange(): void {
    this.selectedCityId = null;
    this.cities = [];

    if (this.selectedStateId === null) {
      this.loadTouristPlaces();
      return;
    }

    this.loadingCities = true;

    this.cityService
      .getCitiesByStateId(this.selectedStateId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: cities => {
          this.cities = cities ?? [];
          this.loadingCities = false;
          this.cdr.detectChanges();

          // Fetch places for the selected state.
          this.loadTouristPlaces();
        },
        error: error => {
          console.error('Unable to load cities for selected state', error);
          this.cities = [];
          this.loadingCities = false;
          this.cdr.detectChanges();

          // Still fetch places filtered by state.
          this.loadTouristPlaces();
        }
      });
  }

  onCityChange(): void {
    this.loadTouristPlaces();
  }

  clearFilters(): void {
    this.selectedStateId = null;
    this.selectedCityId = null;
    this.cities = [];

    this.loadTouristPlaces();
  }

  loadTouristPlaces(): void {
    if (!this.categorySlug) {
      return;
    }

    const requestId = ++this.requestCount;

    this.loading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.categoryService
      .getTouristPlacesByCategory(this.categorySlug, {
        stateId: this.selectedStateId,
        cityId: this.selectedCityId
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: places => {
          // Ignore older responses if a newer request has started.
          if (requestId !== this.requestCount) {
            return;
          }

          this.touristPlaces = places ?? [];
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: error => {
          if (requestId !== this.requestCount) {
            return;
          }

          console.error(
            'Unable to load category tourist places',
            error
          );

          this.touristPlaces = [];
          this.loading = false;
          this.errorMessage =
            'Unable to load tourist places. Please try again.';

          this.cdr.detectChanges();
        }
      });
  }

  retry(): void {
    this.loadTouristPlaces();
  }

  getTouristPlacesInitials(name: string): string {
    return (name || '')
      .split(' ')
      .filter(Boolean)
      .map(word => word.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  trackByPlaceId(index: number, place: TouristPlace): number {
    return place.id;
  }
}
