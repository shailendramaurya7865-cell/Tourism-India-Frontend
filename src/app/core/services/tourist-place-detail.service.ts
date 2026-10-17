import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environments';
import { ApiResponse } from '../models/api-response.model';
import { CityDetailData } from '../models/city-detail-response.model';
import { TouristPlaceDetail } from '../models/tourist-place-detail.model';

@Injectable({
    providedIn: 'root'
})
export class TouristPlaceDetailService {

    private readonly http = inject(HttpClient);
    private readonly apiUrl = environment.apiUrl;

    getTouristPlaceDetail(touristPlaceDetailId: number): Observable<ApiResponse<TouristPlaceDetail>> {
        const url = `${this.apiUrl}/tourist-places/${touristPlaceDetailId}`;
        console.log('Tourist Place Detail API URL:', url);
        return this.http
            .get<ApiResponse<TouristPlaceDetail>>(url)
            .pipe(
                tap({
                    next: response => {
                        console.log(response);
                    },
                    error: error => {
                        console.error('Error loading city detail:', error);
                    }
                })
            );
    }
}