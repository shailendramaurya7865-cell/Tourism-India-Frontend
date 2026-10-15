import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { StateDetailService } from '../../core/services/state-detail.service';
import { TouristPlace } from '../../core/models/tourist-place.model';
import { StateDetailState, PopularCity } from '../../core/models/state-detail-response.model';

@Component({
    selector: 'app-state-detail',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './state-detail.component.html',
    styleUrl: './state-detail.component.css'
})
export class StateDetailComponent implements OnInit {
    private requestCount = 0;
    private readonly route = inject(ActivatedRoute);
    private readonly stateDetailService = inject(StateDetailService);
    private readonly cdr = inject(ChangeDetectorRef);

    state: StateDetailState | null = null;
    popularCities: PopularCity[] = [];
    topTouristPlaces: TouristPlace[] = [];

    loading = false;
    errorMessage = '';

    ngOnInit(): void {
        console.log('[State Detail] Component initialized');

        this.route.paramMap.subscribe(params => {
            const stateId = Number(params.get('id'));

            if (!Number.isInteger(stateId) || stateId <= 0) {
                this.loading = false;
                this.errorMessage = 'Invalid state ID.';
                this.cdr.detectChanges();
                return;
            }

            this.loadStateDetail(stateId);
        });
    }

    loadStateDetail(stateId: number): void {

        const requestId = ++this.requestCount;

        console.log(`[State Detail ${requestId}] Starting`, {
            stateId
        });

        this.loading = true;
        this.errorMessage = '';

        this.stateDetailService.getStateDetail(stateId)
            .subscribe({
                next: response => {

                    console.log(
                        `[State Detail ${requestId}] Response`,
                        response
                    );

                    if (!response.success || !response.data?.state) {
                        this.errorMessage =
                            'Unable to load state information. Please try again.';

                        this.state = null;
                        this.popularCities = [];
                        this.topTouristPlaces = [];
                        this.loading = false;
                        this.cdr.detectChanges();
                        return;
                    }

                    this.state = response.data.state;
                    this.popularCities =
                        response.data.popularCities ?? [];

                    this.topTouristPlaces =
                        response.data.topTouristPlaces ?? [];

                    this.loading = false;

                    this.cdr.detectChanges();

                    console.log(`[State Detail ${requestId}] Data assigned`, {
                        state: this.state?.name,
                        cities: this.popularCities.length,
                        touristPlaces: this.topTouristPlaces.length,
                        loading: this.loading
                    });
                },

                error: error => {

                    console.error(
                        `[State Detail ${requestId}] Error`,
                        error
                    );

                    this.loading = false;
                    this.errorMessage =
                        'Unable to load state information. Please try again.';

                    this.cdr.detectChanges();
                },

                complete: () => {
                    console.log(`[State Detail ${requestId}] Completed`);
                }
            });
    }

    retry(): void {
        const stateId = Number(this.route.snapshot.paramMap.get('id'));

        if (Number.isInteger(stateId) && stateId > 0) {
            this.loadStateDetail(stateId);
        }
    }

    get hasStateData(): boolean {
        return this.state !== null;
    }

    formatReviewCount(count: number | undefined): string {
        const reviews = count ?? 0;
        if (reviews >= 1000) {
            return `${(reviews / 1000).toFixed(1).replace(/\.0$/, '')}K`;
        }

        return String(reviews);
    }
}