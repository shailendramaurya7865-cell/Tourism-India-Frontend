
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  Validators
} from '@angular/forms';

import { StateService } from '../../../core/services/state.services';
import { State, StateStats } from '../../../core/models/state.model';

@Component({
  selector: 'app-state-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './state-management.component.html',
  styleUrl: './state-management.component.css'
})
export class StateManagementComponent implements OnInit {

  private readonly stateService = inject(StateService);
  private readonly fb = inject(FormBuilder);

  states: State[] = [];
  filteredStates: State[] = [];

  stats: StateStats = {
    totalStates: 0,
    activeStates: 0,
    inactiveStates: 0,
    featuredStates: 0
  };

  loading = false;
  saving = false;

  errorMessage = '';
  successMessage = '';

  searchTerm = '';
  showForm = false;
  editingState: State | null = null;

  stateForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    code: ['', [Validators.required, Validators.maxLength(255)]],
    slug: [''],
    tagline: ['', Validators.maxLength(255)],
    description: [''],
    imageUrl: [''],
    isFeatured: [false],
    isActive: [true]
  });

  ngOnInit(): void {
    this.loadStates();
    this.loadStateStats();
  }

  // Load states
  loadStates(): void {
    this.loading = true;
    this.errorMessage = '';

    this.stateService.getStates().subscribe({
      next: (states) => {
        this.states = states;
        this.applySearch();
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage =
          error.error?.message || 'Unable to load states. Please try again.';

        console.error('Load states failed:', error);
      }
    });
  }

  // Load statistics from API
  loadStateStats(): void {
    this.stateService.getStateStats().subscribe({
      next: (stats) => {
        this.stats = stats;
      },
      error: (error) => {
        console.error('Load state statistics failed:', error);
      }
    });
  }

  // Search states
  applySearch(): void {
    const term = this.searchTerm.trim().toLowerCase();

    this.filteredStates = this.states.filter(state =>
      state.name.toLowerCase().includes(term) ||
      (state.slug ?? '').toLowerCase().includes(term)
    );
  }

  // Open add form
  openAddForm(): void {
    this.editingState = null;

    this.stateForm.reset({
      name: '',
      code: '',
      slug: '',
      tagline: '',
      description: '',
      imageUrl: '',
      isFeatured: false,
      isActive: true
    });

    this.clearMessages();
    this.showForm = true;
  }

  // Open edit form
  openEditForm(state: State): void {
    this.editingState = state;

    this.stateForm.patchValue({
      name: state.name,
      code: state.code,
      tagline: state.tagline ?? '',
      description: state.description ?? '',
      imageUrl: state.imageUrl ?? '',
    });

    this.clearMessages();
    this.showForm = true;
  }

  // Close form
  closeForm(): void {
    if (this.saving) return;

    this.showForm = false;
    this.editingState = null;
    this.stateForm.reset();
  }

  // Save state (Create / Update)
  saveState(): void {
    if (this.stateForm.invalid || this.saving) {
      this.stateForm.markAllAsTouched();
      return;
    }

    const formValue = this.stateForm.getRawValue();

    const payload: Partial<State> = {
      name: formValue.name?.trim() ?? '',
      code: formValue.code?.trim().toUpperCase() ?? '',
      slug: formValue.slug?.trim() || null,
      tagline: formValue.tagline?.trim() || null,
      description: formValue.description?.trim() || null,
      imageUrl: formValue.imageUrl?.trim() || null,
      isFeatured: formValue.isFeatured ?? false,
      isActive: formValue.isActive ?? true,
      config: this.editingState?.config ?? {}
    };

    this.saving = true;
    this.clearMessages();

    const isEditing = !!this.editingState;

    const request = isEditing
      ? this.stateService.updateState(this.editingState!.id, payload)
      : this.stateService.createState(payload);

    request.subscribe({
      next: () => {
        this.saving = false;
        this.showForm = false;
        this.editingState = null;

        this.successMessage = isEditing
          ? 'State updated successfully.'
          : 'State added successfully.';

        this.stateForm.reset();

        this.refreshData();
      },
      error: (error) => {
        this.saving = false;

        this.errorMessage =
          error.error?.message || 'Unable to save state. Please try again.';

        console.error('Save state failed:', error);
      }
    });
  }

  // Toggle active status
  toggleActive(state: State): void {
    const payload: Partial<State> = {
      name: state.name,
      code: state.code,
      slug: state.slug,
      description: state.description,
      tagline: state.tagline,
      imageUrl: state.imageUrl,
      isFeatured: state.isFeatured,
      isActive: !state.isActive,
      config: state.config ?? {}
    };

    this.stateService.updateState(state.id, payload).subscribe({
      next: () => {
        this.successMessage =
          `${state.name} ${payload.isActive ? 'activated' : 'deactivated'} successfully.`;

        this.refreshData();
      },
      error: (error) => {
        this.errorMessage =
          error.error?.message || 'Unable to update state status.';

        console.error('Update state status failed:', error);
      }
    });
  }

  // Delete state
  deleteState(state: State): void {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${state.name}? This action cannot be undone.`
    );

    if (!confirmed) return;

    this.stateService.deleteState(state.id).subscribe({
      next: () => {
        this.successMessage = `${state.name} deleted successfully.`;
        this.refreshData();
      },
      error: (error) => {
        this.errorMessage =
          error.error?.message || 'Unable to delete state.';

        console.error('Delete state failed:', error);
      }
    });
  }

  // Refresh states and statistics
  private refreshData(): void {
    this.loadStates();
    this.loadStateStats();
  }

  // Clear messages
  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  // Statistics from API
  get activeCount(): number {
    return this.stats.activeStates;
  }

  get featuredCount(): number {
    return this.stats.featuredStates;
  }

  get inactiveCount(): number {
    return this.stats.inactiveStates;
  }

  get totalCount(): number {
    return this.stats.totalStates;
  }

  // Form controls
  get nameControl() {
    return this.stateForm.controls.name;
  }

  get codeControl() {
    return this.stateForm.controls.code;
  }
}
