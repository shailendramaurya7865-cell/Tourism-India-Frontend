import {
  Component,
  OnInit,
  ChangeDetectorRef,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  Validators
} from '@angular/forms';

import { StateService } from '../../../core/services/state.services';

import {
  AdminState,
  AdminStateDetail,
  StateStats,
  StateRequest
} from '../../../features/admin/models/admin-state.model';

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
  private readonly cdr = inject(ChangeDetectorRef);

  states: AdminState[] = [];
  filteredStates: AdminState[] = [];

  stats: StateStats = {
    totalStates: 0,
    activeStates: 0,
    inactiveStates: 0,
    featuredStates: 0
  };

  loading = false;
  saving = false;
  detailLoading = false;

  errorMessage = '';
  successMessage = '';

  searchTerm = '';

  showForm = false;

  // Full details are stored here after the detail API call.
  editingState: AdminStateDetail | null = null;

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

  // ================= LOAD DATA =================

  loadStates(): void {
    this.loading = true;
    this.errorMessage = '';

    this.stateService.getAdminStates().subscribe({
      next: (states) => {
        this.states = states ?? [];
        this.applySearch();

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.loading = false;

        this.errorMessage =
          error.error?.message || 'Unable to load states. Please try again.';

        console.error('Load admin states failed:', error);
        this.cdr.detectChanges();
      }
    });
  }

  loadStateStats(): void {
    this.stateService.getStateStats().subscribe({
      next: (stats) => {
        this.stats = stats;

        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Load state statistics failed:', error);
        this.cdr.detectChanges();
      }
    });
  }

  // ================= SEARCH =================

  applySearch(): void {
    const term = this.searchTerm.trim().toLowerCase();

    this.filteredStates = this.states.filter(state =>
      state.name.toLowerCase().includes(term) ||
      (state.tagline ?? '').toLowerCase().includes(term)
    );
  }

  // ================= ADD STATE =================

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

    this.cdr.detectChanges();
  }

  // ================= EDIT STATE =================

  openEditForm(state: AdminState): void {

    if (this.detailLoading || this.saving) {
      return;
    }

    this.clearMessages();

    this.detailLoading = true;
    this.showForm = false;
    this.editingState = null;

    // Clear previous form values while fetching details.
    this.stateForm.reset();

    this.stateService.getAdminStateById(state.id).subscribe({
      next: (details) => {

        this.editingState = details;

        this.stateForm.patchValue({
          name: details.name,
          code: details.code,
          slug: details.slug ?? '',
          tagline: details.tagline ?? '',
          description: details.description ?? '',
          imageUrl: details.imageUrl ?? '',
          isFeatured: details.isFeatured,
          isActive: details.isActive
        });

        this.detailLoading = false;
        this.showForm = true;

        this.cdr.detectChanges();
      },
      error: (error) => {

        this.detailLoading = false;

        this.errorMessage =
          error.error?.message ||
          'Unable to load state details. Please try again.';

        console.error('Load state details failed:', error);

        this.cdr.detectChanges();
      }
    });
  }

  // ================= CLOSE FORM =================

  closeForm(): void {

    if (this.saving || this.detailLoading) {
      return;
    }

    this.showForm = false;
    this.editingState = null;

    this.stateForm.reset();

    this.cdr.detectChanges();
  }

  // ================= SAVE STATE =================

  saveState(): void {

    if (this.stateForm.invalid || this.saving) {
      this.stateForm.markAllAsTouched();
      return;
    }

    const formValue = this.stateForm.getRawValue();

    const payload: StateRequest = {
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

        this.cdr.detectChanges();
      },
      error: (error) => {

        this.saving = false;

        this.errorMessage =
          error.error?.message || 'Unable to save state. Please try again.';

        console.error('Save state failed:', error);

        this.cdr.detectChanges();
      }
    });
  }

  // ================= TOGGLE ACTIVE STATUS =================

  toggleActive(state: AdminState): void {

    if (this.saving || this.detailLoading) {
      return;
    }

    this.clearMessages();
    this.detailLoading = true;

    // Fetch complete details before sending an update.
    this.stateService.getAdminStateById(state.id).subscribe({
      next: (details) => {

        const payload: StateRequest = {
          name: details.name,
          code: details.code,
          slug: details.slug,
          tagline: details.tagline,
          description: details.description,
          imageUrl: details.imageUrl,
          isFeatured: details.isFeatured,
          isActive: !details.isActive,
          config: details.config ?? {}
        };

        this.stateService.updateState(state.id, payload).subscribe({
          next: () => {

            this.detailLoading = false;

            this.successMessage =
              `${state.name} ${payload.isActive ? 'activated' : 'deactivated'} successfully.`;

            this.refreshData();

            this.cdr.detectChanges();
          },
          error: (error) => {

            this.detailLoading = false;

            this.errorMessage =
              error.error?.message || 'Unable to update state status.';

            console.error('Update state status failed:', error);

            this.cdr.detectChanges();
          }
        });
      },
      error: (error) => {

        this.detailLoading = false;

        this.errorMessage =
          error.error?.message || 'Unable to load state details.';

        console.error('Load state for status update failed:', error);

        this.cdr.detectChanges();
      }
    });
  }

  // ================= DELETE STATE =================

  deleteState(state: AdminState): void {

    const confirmed = window.confirm(
      `Are you sure you want to delete ${state.name}? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    this.stateService.deleteState(state.id).subscribe({
      next: () => {

        this.successMessage = `${state.name} deleted successfully.`;

        this.refreshData();

        this.cdr.detectChanges();
      },
      error: (error) => {

        this.errorMessage =
          error.error?.message || 'Unable to delete state.';

        console.error('Delete state failed:', error);

        this.cdr.detectChanges();
      }
    });
  }

  // ================= REFRESH =================

  private refreshData(): void {
    this.loadStates();
    this.loadStateStats();
  }

  // ================= MESSAGES =================

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  // ================= STATISTICS =================

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

  // ================= FORM CONTROLS =================

  get nameControl() {
    return this.stateForm.controls.name;
  }

  get codeControl() {
    return this.stateForm.controls.code;
  }
}