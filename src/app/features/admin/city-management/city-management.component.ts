
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
import { CityService } from '../../../core/services/city.services';

import { AdminState } from '../../../features/admin/models/admin-state.model';

import {
  AdminCity,
  AdminCityDetail,
  CityStats,
  CityRequest
} from '../../../features/admin/models/admin-city.model';

@Component({
  selector: 'app-city-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule
  ],
  templateUrl: './city-management.component.html',
  styleUrl: './city-management.component.css'
})
export class CityManagementComponent implements OnInit {

  private readonly cityService = inject(CityService);
  private readonly stateService = inject(StateService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  // ================= DATA =================

  cities: AdminCity[] = [];
  private pageCities: AdminCity[] = [];

  states: AdminState[] = [];

  stats: CityStats = {
    totalCities: 0,
    activeCities: 0,
    inactiveCities: 0,
    featuredCities: 0
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

  // HTML-compatible aliases

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

  editingCity: AdminCityDetail | null = null;
  viewingCity: AdminCityDetail | null = null;

  // HTML-compatible aliases

  get showFormModal(): boolean {
    return this.showForm;
  }

  get showViewModal(): boolean {
    return this.viewLoading || this.viewingCity !== null;
  }

  get isEditMode(): boolean {
    return this.editingCity !== null;
  }

  get selectedCity(): AdminCityDetail | null {
    return this.viewingCity;
  }

  // ================= FORM =================

  cityForm = this.fb.group({

    name: ['', [
      Validators.required,
      Validators.maxLength(255)
    ]],

    code: ['', Validators.maxLength(20)],

    stateId: [null as number | null, Validators.required],

    slug: ['', Validators.maxLength(150)],

    tagline: ['', Validators.maxLength(200)],

    imageUrl: ['', Validators.maxLength(1000)],

    description: [''],

    isFeatured: [false],

    isActive: [true]

  });

  // ================= INITIALIZATION =================

  ngOnInit(): void {
    this.loadCities();
    this.loadCityStats();
    this.loadStates();
  }

  // ================= LOAD CITIES =================

  loadCities(): void {

    this.loading = true;
    this.errorMessage = '';

    this.cityService
      .getAdminCities(this.currentPage, this.pageSize)
      .subscribe({

        next: (response) => {

          this.pageCities = response.content ?? [];

          this.totalElements = response.totalElements ?? 0;
          this.totalPages = response.totalPages ?? 0;

          this.applySearch();

          this.loading = false;

          this.cdr.detectChanges();
        },

        error: (error) => {

          this.loading = false;

          this.errorMessage =
            error.error?.message ||
            'Unable to load cities. Please try again.';

          console.error('Load admin cities failed:', error);

          this.cdr.detectChanges();
        }

      });
  }

  // ================= LOAD STATISTICS =================

  loadCityStats(): void {

    this.cityService.getCityStats().subscribe({

      next: (stats) => {

        this.stats = stats;

        this.cdr.detectChanges();
      },

      error: (error) => {

        console.error('Load city statistics failed:', error);

        this.cdr.detectChanges();
      }

    });
  }

  // ================= LOAD STATES =================

  loadStates(): void {

    this.stateService.getAdminStates().subscribe({

      next: (states) => {

        this.states = (states ?? []).filter(
          state => state.isActive
        );

        this.cdr.detectChanges();
      },

      error: (error) => {

        console.error('Load states for city form failed:', error);

        this.errorMessage =
          error.error?.message ||
          'Unable to load states. Please try again.';

        this.cdr.detectChanges();
      }

    });
  }

  // ================= SEARCH =================

  applySearch(): void {

    const term = this.searchTerm.trim().toLowerCase();

    if (!term) {
      this.cities = [...this.pageCities];
      return;
    }

    this.cities = this.pageCities.filter(city =>

      (city.name ?? '').toLowerCase().includes(term) ||

      (city.tagline ?? '').toLowerCase().includes(term) ||

      (city.stateName ?? '').toLowerCase().includes(term) ||

      (city.code ?? '').toLowerCase().includes(term)

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

    this.loadCities();
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

    if (!newSize || newSize < 1 || this.loading) {
      return;
    }

    this.pageSize = newSize;
    this.currentPage = 0;

    this.loadCities();
  }

  // HTML-compatible pagination handler

  onPageSizeChange(size: number | string): void {
    this.changePageSize(size);
  }

  // ================= ADD CITY =================

  openAddForm(): void {

    if (this.saving || this.detailLoading) {
      return;
    }

    this.editingCity = null;

    this.cityForm.reset({

      name: '',
      code: '',
      stateId: null,
      slug: '',
      tagline: '',
      imageUrl: '',
      description: '',
      isFeatured: false,
      isActive: true

    });

    this.clearMessages();

    this.showForm = true;

    this.cdr.detectChanges();
  }

  // ================= EDIT CITY =================

  openEditForm(city: AdminCity): void {

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
    this.viewingCity = null;

    this.editingCity = null;

    this.cityForm.reset();

    this.cityService
      .getAdminCityById(city.id)
      .subscribe({

        next: (details) => {

          this.editingCity = details;

          this.cityForm.patchValue({

            name: details.name,

            code: details.code ?? '',

            stateId: details.stateId,

            slug: details.slug ?? '',

            tagline: details.tagline ?? '',

            imageUrl: details.imageUrl ?? '',

            description: details.description ?? '',

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
            'Unable to load city details. Please try again.';

          console.error('Load city details failed:', error);

          this.cdr.detectChanges();
        }

      });
  }

  // ================= VIEW CITY DETAILS =================

  viewCity(cityId: number): void {

    const city = this.cities.find(item => item.id === cityId);

    if (city) {
      this.openViewDetails(city);
    }
  }

  openViewDetails(city: AdminCity): void {

    if (
      this.viewLoading ||
      this.detailLoading ||
      this.saving
    ) {
      return;
    }

    this.clearMessages();

    this.viewingCity = null;

    this.viewLoading = true;

    this.cityService
      .getAdminCityById(city.id)
      .subscribe({

        next: (details) => {

          this.viewingCity = details;

          this.viewLoading = false;

          this.cdr.detectChanges();
        },

        error: (error) => {

          this.viewLoading = false;

          this.errorMessage =
            error.error?.message ||
            'Unable to load city details. Please try again.';

          console.error('View city details failed:', error);

          this.cdr.detectChanges();
        }

      });
  }

  closeViewModal(): void {
    this.closeViewDetails();
  }

  closeViewDetails(): void {

    this.viewingCity = null;

    this.viewLoading = false;

    this.cdr.detectChanges();
  }

  editFromView(): void {

    if (!this.viewingCity) {
      return;
    }

    const city = this.viewingCity;

    this.viewingCity = null;

    this.openEditForm(city);
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

    this.editingCity = null;

    this.cityForm.reset();

    this.cdr.detectChanges();
  }

  // ================= SAVE CITY =================

  saveCity(): void {

    if (this.cityForm.invalid || this.saving) {

      this.cityForm.markAllAsTouched();

      return;
    }

    const formValue = this.cityForm.getRawValue();

    const payload: CityRequest = {

      name: formValue.name?.trim() ?? '',

      code: formValue.code?.trim().toUpperCase() || null,

      stateId: Number(formValue.stateId),

      slug: formValue.slug?.trim() || null,

      tagline: formValue.tagline?.trim() || null,

      description: formValue.description?.trim() || null,

      imageUrl: formValue.imageUrl?.trim() || null,

      isFeatured: formValue.isFeatured ?? false,

      isActive: formValue.isActive ?? true,

      config: this.editingCity?.config ?? {}

    };

    this.saving = true;

    this.clearMessages();

    const isEditing = !!this.editingCity;

    const request = isEditing

      ? this.cityService.updateCity(
          this.editingCity!.id,
          payload
        )

      : this.cityService.createCity(payload);

    request.subscribe({

      next: () => {

        this.saving = false;

        this.showForm = false;

        this.editingCity = null;

        this.successMessage = isEditing
          ? 'City updated successfully.'
          : 'City added successfully.';

        this.cityForm.reset();

        if (!isEditing) {
          this.currentPage = 0;
        }

        this.refreshData();

        this.cdr.detectChanges();
      },

      error: (error) => {

        this.saving = false;

        this.errorMessage =
          error.error?.message ||
          'Unable to save city. Please try again.';

        console.error('Save city failed:', error);

        this.cdr.detectChanges();
      }

    });
  }

  // ================= TOGGLE ACTIVE STATUS =================

  toggleActive(city: AdminCity): void {

    if (
      this.saving ||
      this.detailLoading ||
      this.viewLoading
    ) {
      return;
    }

    this.clearMessages();

    this.detailLoading = true;

    this.cityService
      .getAdminCityById(city.id)
      .subscribe({

        next: (details) => {

          const payload: CityRequest = {

            name: details.name,

            code: details.code,

            stateId: details.stateId,

            slug: details.slug,

            tagline: details.tagline,

            description: details.description,

            imageUrl: details.imageUrl,

            isFeatured: details.isFeatured,

            isActive: !details.isActive,

            config: details.config ?? {}

          };

          this.cityService
            .updateCity(city.id, payload)
            .subscribe({

              next: () => {

                this.detailLoading = false;

                this.successMessage =
                  `${city.name} ${
                    payload.isActive ? 'activated' : 'deactivated'
                  } successfully.`;

                this.refreshData();

                this.cdr.detectChanges();
              },

              error: (error) => {

                this.detailLoading = false;

                this.errorMessage =
                  error.error?.message ||
                  'Unable to update city status.';

                console.error('Update city status failed:', error);

                this.cdr.detectChanges();
              }

            });
        },

        error: (error) => {

          this.detailLoading = false;

          this.errorMessage =
            error.error?.message ||
            'Unable to load city details.';

          console.error('Load city for status update failed:', error);

          this.cdr.detectChanges();
        }

      });
  }

  // ================= DELETE CITY =================

  deleteCity(city: AdminCity): void {

    const confirmed = window.confirm(
      `Are you sure you want to delete ${city.name}? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    this.clearMessages();

    this.cityService
      .deleteCity(city.id)
      .subscribe({

        next: () => {

          this.successMessage =
            `${city.name} deleted successfully.`;

          if (
            this.cities.length === 1 &&
            this.currentPage > 0
          ) {
            this.currentPage--;
          }

          this.refreshData();

          this.cdr.detectChanges();
        },

        error: (error) => {

          this.errorMessage =
            error.error?.message ||
            'Unable to delete city.';

          console.error('Delete city failed:', error);

          this.cdr.detectChanges();
        }

      });
  }

  // ================= REFRESH =================

  refreshData(): void {

    this.loadCities();

    this.loadCityStats();
  }

  // ================= MESSAGES =================

  private clearMessages(): void {

    this.errorMessage = '';

    this.successMessage = '';
  }

  // ================= STATISTICS =================

  get activeCount(): number {
    return this.stats.activeCities;
  }

  get featuredCount(): number {
    return this.stats.featuredCities;
  }

  get inactiveCount(): number {
    return this.stats.inactiveCities;
  }

  get totalCount(): number {
    return this.stats.totalCities;
  }

  // ================= FORM CONTROLS =================

  get nameControl() {
    return this.cityForm.controls.name;
  }

  get codeControl() {
    return this.cityForm.controls.code;
  }

  get stateIdControl() {
    return this.cityForm.controls.stateId;
  }

}
