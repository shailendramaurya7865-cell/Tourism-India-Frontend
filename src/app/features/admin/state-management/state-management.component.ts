
import {
  Component,
  OnInit,
  OnDestroy,
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
import { Observable, finalize, map, of, switchMap } from 'rxjs';

import { StateService } from '../../../core/services/state.services';
import { MediaService } from '../../../core/services/media.service';
import { MediaFolder } from '../../../shared/models/media-folder.model';

import {
  AdminState,
  AdminStateDetail,
  StateStats,
  StateRequest
} from '../../../features/admin/models/admin-state.model';

@Component({
  selector: 'app-state-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule
  ],
  templateUrl: './state-management.component.html',
  styleUrl: './state-management.component.css'
})
export class StateManagementComponent implements OnInit, OnDestroy {

  private readonly stateService = inject(StateService);
  private readonly mediaService = inject(MediaService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly mediaFolder: MediaFolder = 'STATES';

  readonly maxImageSize = 5 * 1024 * 1024;
  readonly allowedImageTypes = ['image/png', 'image/jpeg', 'image/webp'];
  selectedImageFile: File | null = null;
  imagePreviewUrl: string | null = null;
  private previewObjectUrl: string | null = null;

  // ================= DATA =================

  states: AdminState[] = [];

  private pageStates: AdminState[] = [];

  stats: StateStats = {
    totalStates: 0,
    activeStates: 0,
    inactiveStates: 0,
    featuredStates: 0
  };

  // ================= PAGINATION =================

  currentPage = 0;
  pageSize = 10;

  totalPages = 0;
  totalElements = 0;

  pageSizeOptions = [5, 10, 20, 50];

  readonly Math = Math;

  get pages(): number[] {
    return Array.from(
      { length: this.totalPages },
      (_, index) => index
    );
  }

  // ================= LOADING STATES =================

  loading = false;
  saving = false;
  detailLoading = false;
  viewLoading = false;
  deleting = false;

  get isLoading(): boolean {
    return this.loading;
  }

  get isSaving(): boolean {
    return this.saving;
  }

  get isViewLoading(): boolean {
    return this.viewLoading;
  }

  // ================= MESSAGES =================

  errorMessage = '';
  successMessage = '';

  // ================= SEARCH =================

  searchTerm = '';

  // ================= MODALS =================

  showForm = false;

  editingState: AdminStateDetail | null = null;

  viewingState: AdminStateDetail | null = null;

  get showFormModal(): boolean {
    return this.showForm;
  }

  get showViewModal(): boolean {
    return this.viewLoading || this.viewingState !== null;
  }

  get isEditMode(): boolean {
    return this.editingState !== null;
  }

  get selectedState(): AdminStateDetail | null {
    return this.viewingState;
  }

  // ================= FORM =================

  stateForm = this.fb.group({

    name: ['', [
      Validators.required,
      Validators.maxLength(255)
    ]],

    code: ['', [
      Validators.required,
      Validators.maxLength(255)
    ]],

    slug: ['', Validators.maxLength(150)],

    tagline: ['', Validators.maxLength(255)],

    description: [''],

    imageUrl: ['', Validators.maxLength(1000)],

    isFeatured: [false],

    isActive: [true]

  });

  // ================= INITIALIZATION =================

  ngOnInit(): void {
    this.loadStates();
    this.loadStateStats();
  }

  ngOnDestroy(): void {
    this.clearImagePreview();
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.clearMessages();

    if (!this.allowedImageTypes.includes(file.type)) {
      this.errorMessage = 'Please select a PNG, JPG or WebP image.';
      input.value = '';
      this.cdr.detectChanges();
      return;
    }

    if (file.size > this.maxImageSize) {
      this.errorMessage = 'Image size must not exceed 5 MB.';
      input.value = '';
      this.cdr.detectChanges();
      return;
    }

    this.clearImagePreview();
    this.selectedImageFile = file;
    this.previewObjectUrl = URL.createObjectURL(file);
    this.imagePreviewUrl = this.previewObjectUrl;
    this.cdr.detectChanges();
  }

  removeSelectedImage(): void {
    this.selectedImageFile = null;
    this.clearImagePreview();
    this.stateForm.patchValue({ imageUrl: '' });
    this.resetFileInput();
    this.cdr.detectChanges();
  }

  private clearImagePreview(): void {
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
    }
    this.previewObjectUrl = null;
    this.imagePreviewUrl = null;
  }

  private resetImageSelection(): void {
    this.selectedImageFile = null;
    this.clearImagePreview();
    this.resetFileInput();
  }

  private resetFileInput(): void {
    const input = document.getElementById('stateImage') as HTMLInputElement | null;
    if (input) input.value = '';
  }

  private uploadImageIfSelected(): Observable<string | null> {
    if (!this.selectedImageFile) {
      return of(this.stateForm.get('imageUrl')?.value?.trim() || null);
    }

    return this.mediaService.uploadImage(this.selectedImageFile, this.mediaFolder)
      .pipe(
        map(response => {
          if (!response.success || !response.data?.url) {
            throw new Error(response.message || 'Image upload failed.');
          }
          return response.data.url;
        })
      );
  }

  // ================= LOAD STATES =================

  loadStates(): void {

    if (this.loading) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.stateService
      .getAdminStates(this.currentPage, this.pageSize)
      .subscribe({

        next: (response) => {

          this.pageStates = response.content ?? [];

          this.totalElements = response.totalElements ?? 0;
          this.totalPages = response.totalPages ?? 0;

          // Protect against an invalid page after deletion.
          if (
            this.totalPages > 0 &&
            this.currentPage >= this.totalPages
          ) {
            this.currentPage = this.totalPages - 1;
            this.loading = false;
            this.loadStates();
            return;
          }

          this.applySearch();

          this.loading = false;

          this.cdr.detectChanges();
        },

        error: (error) => {

          this.loading = false;

          this.errorMessage =
            error.error?.message ||
            'Unable to load states. Please try again.';

          console.error('Load admin states failed:', error);

          this.cdr.detectChanges();
        }

      });
  }

  // ================= LOAD STATISTICS =================

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

    if (!term) {
      this.states = [...this.pageStates];
      return;
    }

    this.states = this.pageStates.filter(state =>

      (state.name ?? '').toLowerCase().includes(term) ||

      (state.code ?? '').toLowerCase().includes(term) ||

      (state.tagline ?? '').toLowerCase().includes(term)

    );
  }

  onSearchChange(): void {

    this.applySearch();

    this.cdr.detectChanges();
  }

  // ================= PAGINATION =================

  goToPage(page: number): void {

    if (
      page < 0 ||
      page >= this.totalPages ||
      page === this.currentPage ||
      this.loading
    ) {
      return;
    }

    this.currentPage = page;

    this.loadStates();
  }

  previousPage(): void {

    if (this.currentPage > 0) {
      this.goToPage(this.currentPage - 1);
    }
  }

  nextPage(): void {

    if (this.currentPage < this.totalPages - 1) {
      this.goToPage(this.currentPage + 1);
    }
  }

  changePageSize(size: number | string): void {

    const newSize = Number(size);

    if (
      !Number.isInteger(newSize) ||
      newSize < 1 ||
      this.loading
    ) {
      return;
    }

    this.pageSize = newSize;
    this.currentPage = 0;

    this.loadStates();
  }

  onPageSizeChange(size: number | string): void {
    this.changePageSize(size);
  }

  // ================= ADD STATE =================

  openAddForm(): void {

    if (
      this.saving ||
      this.detailLoading ||
      this.viewLoading
    ) {
      return;
    }

    this.editingState = null;
    this.resetImageSelection();

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

    if (
      this.detailLoading ||
      this.saving ||
      this.viewLoading
    ) {
      return;
    }

    this.clearMessages();

    this.detailLoading = true;

    this.showForm = false;
    this.viewingState = null;
    this.editingState = null;
    this.resetImageSelection();

    this.stateForm.reset();

    this.stateService
      .getAdminStateById(state.id)
      .subscribe({

        next: (details) => {

          this.editingState = details;
          this.imagePreviewUrl = details.imageUrl ?? null;

          this.stateForm.patchValue({

            name: details.name,

            code: details.code ?? '',

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

  // ================= VIEW STATE DETAILS =================

  viewState(stateId: number): void {

    const state = this.pageStates.find(
      item => item.id === stateId
    );

    if (state) {
      this.openViewDetails(state);
    }
  }

  openViewDetails(state: AdminState): void {

    if (
      this.viewLoading ||
      this.detailLoading ||
      this.saving
    ) {
      return;
    }

    this.clearMessages();

    this.viewingState = null;

    this.viewLoading = true;

    this.stateService
      .getAdminStateById(state.id)
      .subscribe({

        next: (details) => {

          this.viewingState = details;

          this.viewLoading = false;

          this.cdr.detectChanges();
        },

        error: (error) => {

          this.viewLoading = false;

          this.errorMessage =
            error.error?.message ||
            'Unable to load state details. Please try again.';

          console.error('View state details failed:', error);

          this.cdr.detectChanges();
        }

      });
  }

  closeViewModal(): void {
    this.closeViewDetails();
  }

  closeViewDetails(): void {

    this.viewingState = null;

    this.viewLoading = false;

    this.cdr.detectChanges();
  }

  editFromView(): void {

    if (!this.viewingState) {
      return;
    }

    const state = this.viewingState;

    this.viewingState = null;

    this.openEditForm(state);
  }

  // ================= CLOSE FORM =================

  closeFormModal(): void {
    this.closeForm();
  }

  closeForm(): void {

    if (this.saving || this.detailLoading) {
      return;
    }

    this.showForm = false;

    this.editingState = null;
    this.resetImageSelection();

    this.stateForm.reset();

    this.cdr.detectChanges();
  }

  // ================= SAVE STATE =================

  saveState(): void {

    if (this.stateForm.invalid || this.saving) {

      this.stateForm.markAllAsTouched();

      return;
    }

    this.saving = true;

    this.clearMessages();

    const isEditing = !!this.editingState;

    this.uploadImageIfSelected()
      .pipe(
        switchMap(imageUrl => {
          const formValue = this.stateForm.getRawValue();
          const payload: StateRequest = {
            name: formValue.name?.trim() ?? '',
            code: formValue.code?.trim().toUpperCase() ?? '',
            slug: formValue.slug?.trim() || null,
            tagline: formValue.tagline?.trim() || null,
            description: formValue.description?.trim() || null,
            imageUrl,
            isFeatured: formValue.isFeatured ?? false,
            isActive: formValue.isActive ?? true,
            config: this.editingState?.config ?? {}
          };

          return isEditing
            ? this.stateService.updateState(this.editingState!.id, payload)
            : this.stateService.createState(payload);
        }),
        finalize(() => {
          this.saving = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({

      next: () => {

        this.showForm = false;

        this.editingState = null;
        this.resetImageSelection();

        this.successMessage = isEditing
          ? 'State updated successfully.'
          : 'State added successfully.';

        this.stateForm.reset();

        if (!isEditing) {
          this.currentPage = 0;
        }

        this.refreshData();

        this.cdr.detectChanges();
      },

      error: (error) => {

        this.errorMessage =
          error.error?.message ||
          error.message ||
          'Unable to save state. Please try again.';

        console.error('Save state failed:', error);

        this.cdr.detectChanges();
      }

    });
  }

  // ================= TOGGLE ACTIVE STATUS =================

  toggleActive(state: AdminState): void {

    if (
      this.saving ||
      this.detailLoading ||
      this.viewLoading
    ) {
      return;
    }

    this.clearMessages();

    this.detailLoading = true;

    this.stateService
      .getAdminStateById(state.id)
      .subscribe({

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

          this.stateService
            .updateState(state.id, payload)
            .subscribe({

              next: () => {

                this.detailLoading = false;

                this.successMessage =
                  `${state.name} ${
                    payload.isActive ? 'activated' : 'deactivated'
                  } successfully.`;

                this.refreshData();

                this.cdr.detectChanges();
              },

              error: (error) => {

                this.detailLoading = false;

                this.errorMessage =
                  error.error?.message ||
                  'Unable to update state status.';

                console.error('Update state status failed:', error);

                this.cdr.detectChanges();
              }

            });
        },

        error: (error) => {

          this.detailLoading = false;

          this.errorMessage =
            error.error?.message ||
            'Unable to load state details.';

          console.error('Load state for status update failed:', error);

          this.cdr.detectChanges();
        }

      });
  }

  // ================= DELETE STATE =================

  deleteState(state: AdminState): void {

    if (
      this.saving ||
      this.detailLoading ||
      this.viewLoading ||
      this.deleting
    ) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete ${state.name}? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    this.clearMessages();

    this.deleting = true;

    this.stateService
      .deleteState(state.id)
      .subscribe({

        next: () => {

          this.deleting = false;

          this.successMessage =
            `${state.name} deleted successfully.`;

          // Move to previous page when deleting
          // the only record on the current page.
          if (
            this.pageStates.length === 1 &&
            this.currentPage > 0
          ) {
            this.currentPage--;
          }

          this.refreshData();

          this.cdr.detectChanges();
        },

        error: (error) => {

          this.deleting = false;

          this.errorMessage =
            error.error?.message ||
            'Unable to delete state.';

          console.error('Delete state failed:', error);

          this.cdr.detectChanges();
        }

      });
  }

  // ================= REFRESH =================

  refreshData(): void {

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
