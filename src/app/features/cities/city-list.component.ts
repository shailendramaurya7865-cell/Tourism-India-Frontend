import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { CityService } from '../../core/services/city.services';
import { City } from '../../core/models/city.model';

@Component({
    selector: 'app-cities-list',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './city-list.component.html',
    styleUrl: './city-list.component.css'
})
export class CitiesListComponent implements OnInit {
    private requestCount = 0;
    private readonly cityService = inject(CityService);
    private readonly cdr = inject(ChangeDetectorRef);
    cities: City[] = [];
    loading = false;
    errorMessage = '';
    instanceId = Math.random();
    ngOnInit(): void {
        console.log('INIT', this.instanceId);
        this.loadCities();
    }
    loadCities(): void {
        const requestId = ++this.requestCount;
        console.log(`[Cities ${requestId}] Starting`);
        this.loading = true;
        this.errorMessage = '';
        this.cdr.detectChanges();
        this.cityService.getCities()
            .subscribe({
                next: (cities) => {
                    console.log(`[Cities ${requestId}] Response`, cities);
                    this.cities = cities ?? [];
                    this.loading = false;
                    this.cdr.detectChanges();
                    console.log(`[Cities ${requestId}] Data assigned`, {
                        loading: this.loading,
                        states: this.cities.length
                    });
                    console.log('UI updated');
                },

                error: (error) => {
                    console.error(`[States ${requestId}] Error`, error);
                    this.loading = false;
                    this.errorMessage =
                        'Unable to load states. Please try again.';
                    this.cdr.detectChanges();
                },

                complete: () => {
                    console.log(`[States ${requestId}] Completed`);
                    this.loading = false;
                    this.cdr.detectChanges();
                }
            });
    }

    retry(): void {
        this.loadCities();
    }

    getCityInitials(name: string): string {
        return name
            .split(' ')
            .filter(Boolean)
            .map(word => word.charAt(0))
            .slice(0, 2)
            .join('')
            .toUpperCase();
    }

    getCityDescription(city: City): string {
        return city.shortDescription ||
            `Discover the culture, heritage, landscapes and remarkable destinations of ${city.name}.`;
    }
}
