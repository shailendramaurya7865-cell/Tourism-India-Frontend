import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';

import { TouristPlaceDetailService } from '../../core/services/tourist-place-detail.service';
import {
  TouristPlaceDetail,
  NearbyPlace
} from '../../core/models/tourist-place-detail.model';

@Component({
  selector: 'app-tourist-place-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './tourist-place-detail.component.html',
  styleUrl: './tourist-place-detail.component.css'
})
export class TouristPlaceDetailComponent implements OnInit {

  private readonly route = inject(ActivatedRoute);
  private readonly touristPlaceDetailService =
    inject(TouristPlaceDetailService);

  place: TouristPlaceDetail | null = null;
  nearbyPlaces: NearbyPlace[] = [];

  loading = false;
  errorMessage = '';
  hasPlaceData = false;

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));

      if (!Number.isInteger(id) || id <= 0) {
        this.place = null;
        this.nearbyPlaces = [];
        this.hasPlaceData = false;
        this.loading = false;
        this.errorMessage = 'Invalid tourist place ID.';
        return;
      }

      this.loadTouristPlaceDetail(id);
    });
  }

  loadTouristPlaceDetail(placeId: number): void {
    this.loading = true;
    this.errorMessage = '';
    this.hasPlaceData = false;
    this.place = null;
    this.nearbyPlaces = [];

    this.touristPlaceDetailService
      .getTouristPlaceDetail(placeId)
      .pipe(
        finalize(() => {
          this.loading = false;
          console.log('Loading finished:', this.loading);
        })
      )
      .subscribe({
        next: (response) => {
          console.log('Tourist place response:', response);

          const data = response?.data;

          // The API returns the tourist-place object directly in data.
          if (response?.success && data?.id != null) {
            this.place = data;
            this.nearbyPlaces = data.nearByPlace ?? [];
            this.hasPlaceData = true;
            this.errorMessage = '';

            console.log('Tourist place loaded:', this.place);
            console.log('Nearby places:', this.nearbyPlaces);
          } else {
            this.errorMessage =
              response?.message ||
              'Tourist place details could not be found.';
          }

          console.log('Component state:', {
            loading: this.loading,
            hasPlaceData: this.hasPlaceData,
            hasPlace: !!this.place,
            errorMessage: this.errorMessage
          });
        },

        error: (error) => {
          console.error(
            'Error loading tourist place details:',
            error
          );

          this.errorMessage =
            'Unable to load tourist place details. Please try again.';
        }
      });
  }

  retry(): void {
    const id = this.place?.id ??
      Number(this.route.snapshot.paramMap.get('id'));

    if (Number.isInteger(id) && id > 0) {
      this.loadTouristPlaceDetail(id);
    } else {
      this.loading = false;
      this.errorMessage = 'Invalid tourist place ID.';
    }
  }

  formatReviewCount(count?: number | null): string {
    return (count ?? 0).toLocaleString('en-IN');
  }
}