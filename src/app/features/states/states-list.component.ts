import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { StateService } from '../../core/services/state.services';
import { State } from '../../core/models/state.model';

@Component({
    selector: 'app-states-list',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './states-list.component.html',
    styleUrl: './states-list.component.css'
})
export class StatesListComponent implements OnInit {
    private requestCount = 0;
    private readonly stateService = inject(StateService);
    private readonly cdr = inject(ChangeDetectorRef);
    states: State[] = [];
    loading = false;
    errorMessage = '';
    instanceId = Math.random();
    ngOnInit(): void {
        console.log('INIT', this.instanceId);
        this.loadStates();
    }
    loadStates(): void {
        const requestId = ++this.requestCount;
        console.log(`[States ${requestId}] Starting`);
        this.loading = true;
        this.errorMessage = '';
        this.cdr.detectChanges();
        this.stateService.getStates()
            .subscribe({
                next: (states) => {
                    console.log(`[States ${requestId}] Response`, states);
                    this.states = states ?? [];
                    this.loading = false;
                    this.cdr.detectChanges();
                    console.log(`[States ${requestId}] Data assigned`, {
                        loading: this.loading,
                        states: this.states.length
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
        this.loadStates();
    }

    getStateInitials(name: string): string {
        return name
            .split(' ')
            .filter(Boolean)
            .map(word => word.charAt(0))
            .slice(0, 2)
            .join('')
            .toUpperCase();
    }

    getStateDescription(state: State): string {
        return state.description ||
            `Discover the culture, heritage, landscapes and remarkable destinations of ${state.name}.`;
    }
}
