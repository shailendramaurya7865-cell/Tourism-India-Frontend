import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { State } from '../../core/models/state.model';
import { TouristPlaceService } from '../../core/services/tourist-place.service';
import { TouristPlace } from '../../core/models/tourist-place.model';

@Component({
    selector: 'app-toursit-place-list',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './tourist-place-list.component.html',
    styleUrl: './tourist-place-list.component.css'
})
export class TouristPlacesListComponent implements OnInit {
    private requestCount = 0;
    private readonly touristPlaceService = inject(TouristPlaceService);
    private readonly cdr = inject(ChangeDetectorRef);
    touristPlaces: TouristPlace[] = [];
    loading = false;
    errorMessage = '';
    instanceId = Math.random();
    ngOnInit(): void {
        console.log('INIT', this.instanceId);
        this.loadTouristPlaces();
    }
    loadTouristPlaces(): void {
        const requestId = ++this.requestCount;
        console.log(`[States ${requestId}] Starting`);
        this.loading = true;
        this.errorMessage = '';
        this.cdr.detectChanges();
        this.touristPlaceService.getTouristPlaces()
            .subscribe({
                next: (touristPlaces) => {
                    this.touristPlaces = touristPlaces ?? [];
                    this.loading = false;
                    this.cdr.detectChanges();
                    console.log('UI updated');
                },

                error: (error) => {
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
        this.loadTouristPlaces();
    }

    getTouristPlacesInitials(name: string): string {
        return name
            .split(' ')
            .filter(Boolean)
            .map(word => word.charAt(0))
            .slice(0, 2)
            .join('')
            .toUpperCase();
    }

    getTouristPlaceDescription(state: State): string {
        return state.description ||
            `Discover the culture, heritage, landscapes and remarkable destinations of ${state.name}.`;
    }
}
