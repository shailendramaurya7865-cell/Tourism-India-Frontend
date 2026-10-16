import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { CityDetailService } from '../../core/services/city-detail.service';
import { CityDetailCity, NearbyCity, CityDetailData } from '../../core/models/city-detail-response.model';
import { TouristPlace } from '../../core/models/tourist-place.model';

@Component({
  selector: 'app-city-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './city-detail.component.html',
  styleUrl: './city-detail.component.css'
})
export class CityDetailComponent implements OnInit {

  private readonly route = inject(ActivatedRoute);
  private readonly cityDetailService = inject(CityDetailService);

  city: CityDetailCity | null = null;
  touristPlaces: TouristPlace[] = [];
  nearbyPlaces: NearbyCity[] = [];
  activities: string[] = [];

  loading = false;
  errorMessage = '';
  hasCityData = false;

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));

      if (!Number.isInteger(id) || id <= 0) {
        this.errorMessage = 'Invalid city ID.';
        this.hasCityData = false;
        this.loading = false;
        return;
      }

      this.loadCityDetail(id);
    });
  }

  loadCityDetail(cityId: number): void {
    this.loading = true;
    this.errorMessage = '';
    this.hasCityData = false;

    this.city = null;
    this.touristPlaces = [];
    this.nearbyPlaces = [];
    this.activities = [];

    this.cityDetailService.getCityDetail(cityId).subscribe({
      next: (response) => {
        const data: CityDetailData | undefined = response.data;

        if (response.success && data?.city) {
          this.city = data.city;
          this.touristPlaces = data.topTouristPlaces ?? [];
          this.nearbyPlaces = data.nearByCities ?? [];

          // Activities are not included in the current API model.
          this.activities = [];

          this.hasCityData = true;
        } else {
          this.errorMessage = 'City details could not be found.';
        }

        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading city details:', error);

        this.errorMessage =
          'Unable to load city details. Please try again.';

        this.loading = false;
      }
    });
  }

  retry(): void {
    if (this.city?.id) {
      this.loadCityDetail(this.city.id);
      return;
    }

    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (Number.isInteger(id) && id > 0) {
      this.loadCityDetail(id);
    } else {
      this.errorMessage = 'Invalid city ID.';
    }
  }

  formatReviewCount(count?: number): string {
    return (count ?? 0).toLocaleString('en-IN');
  }
}