import { Component, OnInit, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subject, of, catchError, distinctUntilChanged, finalize, map, switchMap, takeUntil, tap } from 'rxjs';

import { TouristPlaceDetailService } from '../../core/services/tourist-place-detail.service';
import { TouristPlaceDetail, NearbyPlace } from '../../core/models/tourist-place-detail.model';

@Component({
  selector: 'app-tourist-place-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './tourist-place-detail.component.html',
  styleUrl: './tourist-place-detail.component.css'
})
export class TouristPlaceDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly touristPlaceDetailService = inject(TouristPlaceDetailService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  place: TouristPlaceDetail | null = null;
  nearbyPlaces: NearbyPlace[] = [];
  loading = false;
  errorMessage = '';
  hasPlaceData = false;

  ngOnInit(): void {
    this.route.paramMap.pipe(
      map(params => Number(params.get('id'))),
      distinctUntilChanged(),
      tap(() => {
        this.loading = true;
        this.errorMessage = '';
        this.hasPlaceData = false;
        this.place = null;
        this.nearbyPlaces = [];
        this.cdr.detectChanges();
      }),

      switchMap(placeId => {
        if (
          !Number.isInteger(placeId) ||
          placeId <= 0
        ) {
          return of({
            success: false,
            message: 'Invalid tourist place ID.',
            data: null
          });
        }

        return this.touristPlaceDetailService
          .getTouristPlaceDetail(placeId)
          .pipe(
            catchError(error => {
              console.error(
                'Tourist place API error:',
                error
              );

              return of({
                success: false,
                message:
                  'Unable to load tourist place details. Please try again.',
                data: null
              });
            })
          );
      }),

      takeUntil(this.destroy$),

      finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      })
    )
      .subscribe(response => {
        const data = response?.data;

        if (response?.success && data?.id != null) {
          this.place = data;

          // Accept either nearby-place property spelling.
          const detail = data as TouristPlaceDetail & {
            nearbyPlaces?: NearbyPlace[];
          };

          this.nearbyPlaces =
            detail.nearByPlace ??
            detail.nearbyPlaces ??
            [];

          this.hasPlaceData = true;
          this.errorMessage = '';
        } else {
          this.place = null;
          this.nearbyPlaces = [];
          this.hasPlaceData = false;

          this.errorMessage =
            response?.message ||
            'Tourist place details could not be found.';
        }

        this.loading = false;
        this.cdr.detectChanges();

        console.log('Tourist place component state:', {
          loading: this.loading,
          hasPlaceData: this.hasPlaceData,
          place: this.place,
          nearbyPlaces: this.nearbyPlaces,
          errorMessage: this.errorMessage
        });
      });
  }

  loadTouristPlaceDetail(placeId: number): void {
    if (
      !Number.isInteger(placeId) ||
      placeId <= 0
    ) {
      this.loading = false;
      this.place = null;
      this.nearbyPlaces = [];
      this.hasPlaceData = false;
      this.errorMessage = 'Invalid tourist place ID.';
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.hasPlaceData = false;
    this.place = null;
    this.nearbyPlaces = [];

    this.touristPlaceDetailService
      .getTouristPlaceDetail(placeId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: response => {
          const data = response?.data;

          if (response?.success && data?.id != null) {
            this.place = data;

            const detail = data as TouristPlaceDetail & {
              nearbyPlaces?: NearbyPlace[];
            };

            this.nearbyPlaces =
              detail.nearByPlace ??
              detail.nearbyPlaces ??
              [];

            this.hasPlaceData = true;
            this.errorMessage = '';
          } else {
            this.place = null;
            this.nearbyPlaces = [];
            this.hasPlaceData = false;

            this.errorMessage =
              response?.message ||
              'Tourist place details could not be found.';
          }

          this.cdr.detectChanges();
        },

        error: error => {
          console.error(
            'Error loading tourist place details:',
            error
          );

          this.place = null;
          this.nearbyPlaces = [];
          this.hasPlaceData = false;

          this.errorMessage =
            'Unable to load tourist place details. Please try again.';

          this.cdr.detectChanges();
        }
      });
  }

  retry(): void {
    const placeId = Number(
      this.route.snapshot.paramMap.get('id')
    );

    this.loadTouristPlaceDetail(placeId);
  }

  formatReviewCount(
    count?: number | null
  ): string {
    return (count ?? 0).toLocaleString('en-IN');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
