import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environments';
import { ApiResponse } from '../models/api-response.model';
import { CityDetailData } from '../models/city-detail-response.model';

@Injectable({
    providedIn: 'root'
})
export class CityDetailService {

    private readonly http = inject(HttpClient);
    private readonly apiUrl = environment.apiUrl;

    getCityDetail(cityId: number): Observable<ApiResponse<CityDetailData>> {
        const url = `${this.apiUrl}/cities/${cityId}`;
        console.log('City Detail API URL:', url);
        return this.http
            .get<ApiResponse<CityDetailData>>(url)
            .pipe(
                tap({
                    next: response => {
                        console.log('City Detail API Response:', response);
                        console.log('City:', response.data?.city);
                        console.log(
                            'Tourist Places:',
                            response.data?.topTouristPlaces
                        );
                    
                        console.log(
                            'Nearby Places:',
                            response.data?.nearByCities
                        );
                    },
                    error: error => {
                        console.error('Error loading city detail:', error);
                    }
                })
            );
    }
}