
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
import {
  Observable,
  concatMap,
  finalize,
  from,
  map,
  of,
  switchMap,
  tap,
  toArray
} from 'rxjs';

import { StateService } from '../../../core/services/state.services';
import { CityService } from '../../../core/services/city.services';
import { CityDetailService } from '../../../core/services/city-detail.service';
import { MediaService } from '../../../core/services/media.service';
import { MediaFolder } from '../../../shared/models/media-folder.model';
import { City } from '../../../core/models/city.model';

import { AdminState } from '../../../features/admin/models/admin-state.model';

import {
  AdminCity,
  AdminCityDetail,
  AdminNearbyCity,
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
export class CityManagementComponent implements OnInit, OnDestroy {

  private readonly cityService = inject(CityService);
  private readonly cityDetailService = inject(CityDetailService);
  private readonly stateService = inject(StateService);
  private readonly mediaService = inject(MediaService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly mediaFolder: MediaFolder = 'CITIES';

  readonly maxImageSize = 5 * 1024 * 1024;
  readonly allowedImageTypes = ['image/png', 'image/jpeg', 'image/webp'];
  selectedImageFile: File | null = null;
  imagePreviewUrl: string | null = null;
  private previewObjectUrl: string | null = null;

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
  nearbyCities: AdminNearbyCity[] = [];
  nearbyCityOptions: City[] = [];
  nearbyCitySearchTerm = '';
  selectedNearbyCity: City | null = null;
  nearbyDistanceKm: number | null = null;
  nearbyCityOptionsLoading = false;
  nearbyCityOptionsLoaded = false;
  nearbyCitiesLoading = false;
  nearbyCitiesError = '';
  nearbyActionInProgress = false;
  private nearbyCitiesRequestId = 0;

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

  ngOnDestroy(): void {
    this.clearImagePreview();
  }

  get filteredNearbyCityOptions(): City[] {
    const term = this.nearbyCitySearchTerm.trim().toLowerCase();
    if (!term) return [];

    const currentCityName = this.cityForm.controls.name.value?.trim().toLowerCase();
    const excludedIds = new Set(this.nearbyCities.map(city => city.id));
    if (this.editingCity) excludedIds.add(this.editingCity.id);

    return this.nearbyCityOptions
      .filter(city =>
        !excludedIds.has(city.id) &&
        city.name.toLowerCase() !== currentCityName &&
        city.name.toLowerCase().includes(term)
      )
      .slice(0, 8);
  }

  get isNearbyCityDistanceValid(): boolean {
    return this.nearbyDistanceKm !== null &&
      Number.isFinite(this.nearbyDistanceKm) &&
      this.nearbyDistanceKm > 0;
  }

  private loadNearbyCities(cityId: number): void {
    const requestId = ++this.nearbyCitiesRequestId;
    this.nearbyCities = [];
    this.nearbyCitiesError = '';
    this.nearbyCitiesLoading = true;

    this.cityDetailService.getCityDetail(cityId).subscribe({
      next: response => {
        if (requestId !== this.nearbyCitiesRequestId) return;

        if (!response.success || !response.data) {
          this.nearbyCitiesError = response.message || 'Unable to load nearby cities.';
        } else {
          this.nearbyCities = (response.data.nearByCities ?? []).map(city => ({
            id: city.id,
            name: city.name,
            distanceKm: city.distanceFromSource
          }));
        }

        this.nearbyCitiesLoading = false;
        this.cdr.detectChanges();
      },
      error: error => {
        if (requestId !== this.nearbyCitiesRequestId) return;

        this.nearbyCitiesLoading = false;
        this.nearbyCitiesError = error.error?.message || 'Unable to load nearby cities.';
        console.error('Load nearby cities failed:', error);
        this.cdr.detectChanges();
      }
    });
  }

  private clearNearbyCities(): void {
    this.nearbyCitiesRequestId++;
    this.nearbyCities = [];
    this.nearbyCitiesLoading = false;
    this.nearbyCitiesError = '';
  }

  onNearbyCitySearchChange(term: string): void {
    this.nearbyCitySearchTerm = term;
    this.selectedNearbyCity = null;
    this.nearbyDistanceKm = null;

    if (!term.trim() || this.nearbyCityOptionsLoaded || this.nearbyCityOptionsLoading) {
      return;
    }

    this.nearbyCityOptionsLoading = true;
    this.cityService.getCities().subscribe({
      next: cities => {
        this.nearbyCityOptions = cities ?? [];
        this.nearbyCityOptionsLoaded = true;
        this.nearbyCityOptionsLoading = false;
        this.cdr.detectChanges();
      },
      error: error => {
        this.nearbyCityOptionsLoading = false;
        this.errorMessage = error.error?.message || 'Unable to search cities for nearby destinations.';
        console.error('Load nearby city options failed:', error);
        this.cdr.detectChanges();
      }
    });
  }

  selectNearbyCity(city: City): void {
    this.selectedNearbyCity = city;
    this.nearbyDistanceKm = null;
    this.nearbyCitySearchTerm = '';
  }

  cancelNearbyCitySelection(): void {
    this.selectedNearbyCity = null;
    this.nearbyDistanceKm = null;
    this.nearbyCitySearchTerm = '';
  }

  addNearbyCity(): void {
    const city = this.selectedNearbyCity;
    const distanceKm = Number(this.nearbyDistanceKm);

    if (
      !city ||
      !Number.isFinite(distanceKm) ||
      distanceKm <= 0 ||
      this.nearbyCities.some(nearby => nearby.id === city.id) ||
      this.nearbyActionInProgress ||
      this.saving
    ) {
      return;
    }

    if (!this.editingCity) {
      this.nearbyCities = [...this.nearbyCities, {
        id: city.id,
        name: city.name,
        distanceKm,
        pending: true
      }];
      this.cancelNearbyCitySelection();
      return;
    }

    this.nearbyActionInProgress = true;
    this.clearMessages();
    this.cityService.addNearbyCity(this.editingCity.id, city.id, distanceKm)
      .pipe(finalize(() => {
        this.nearbyActionInProgress = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          this.nearbyCities = [...this.nearbyCities, {
            id: city.id,
            name: city.name,
            distanceKm
          }];
          this.cancelNearbyCitySelection();
          this.successMessage = `${city.name} added as a nearby city.`;
        },
        error: error => {
          this.errorMessage = error.error?.message || 'Unable to add nearby city.';
          console.error('Add nearby city failed:', error);
        }
      });
  }

  removeNearbyCity(city: AdminNearbyCity): void {
    if (this.nearbyActionInProgress || this.saving) return;

    if (city.pending || !this.editingCity) {
      this.nearbyCities = this.nearbyCities.filter(item => item.id !== city.id);
      return;
    }

    this.nearbyActionInProgress = true;
    this.clearMessages();
    this.cityService.removeNearbyCity(this.editingCity.id, city.id)
      .pipe(finalize(() => {
        this.nearbyActionInProgress = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          this.nearbyCities = this.nearbyCities.filter(item => item.id !== city.id);
          this.successMessage = `${city.name} removed from nearby cities.`;
        },
        error: error => {
          this.errorMessage = error.error?.message || 'Unable to remove nearby city.';
          console.error('Remove nearby city failed:', error);
        }
      });
  }

  private persistPendingNearbyCities(cityId: number): Observable<unknown[]> {
    return from(this.nearbyCities.filter(city => city.pending)).pipe(
      concatMap(city =>
        this.cityService.addNearbyCity(cityId, city.id, city.distanceKm).pipe(
          tap(() => {
            this.nearbyCities = this.nearbyCities.map(item =>
              item.id === city.id ? { ...item, pending: false } : item
            );
          })
        )
      ),
      toArray()
    );
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
    this.cityForm.patchValue({ imageUrl: '' });
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
    const input = document.getElementById('cityImage') as HTMLInputElement | null;
    if (input) input.value = '';
  }

  private uploadImageIfSelected(): Observable<string | null> {
    if (!this.selectedImageFile) {
      return of(this.cityForm.get('imageUrl')?.value?.trim() || null);
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
      next: (response) => {

        this.states = (response.content ?? []).filter(
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

    if (this.saving || this.detailLoading || this.nearbyActionInProgress) {
      return;
    }

    this.editingCity = null;
    this.resetImageSelection();
    this.clearNearbyCities();
    this.cancelNearbyCitySelection();

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
      this.nearbyActionInProgress ||
      this.viewLoading
    ) {
      return;
    }

    this.clearMessages();

    this.detailLoading = true;

    this.showForm = false;
    this.viewingCity = null;
    this.editingCity = null;
    this.resetImageSelection();
    this.clearNearbyCities();

    this.cityForm.reset();

    this.cityService
      .getAdminCityById(city.id)
      .subscribe({

        next: (details) => {

          this.editingCity = details;
          this.imagePreviewUrl = details.imageUrl ?? null;

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
          this.loadNearbyCities(details.id);

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
      this.nearbyActionInProgress ||
      this.saving
    ) {
      return;
    }

    this.clearMessages();

    this.viewingCity = null;
    this.clearNearbyCities();

    this.viewLoading = true;

    this.cityService
      .getAdminCityById(city.id)
      .subscribe({

        next: (details) => {

          this.viewingCity = details;

          this.viewLoading = false;
          this.loadNearbyCities(details.id);

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
    this.clearNearbyCities();

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

    if (this.saving || this.detailLoading || this.nearbyActionInProgress) {
      return;
    }

    this.showForm = false;

    this.editingCity = null;
    this.resetImageSelection();
    this.clearNearbyCities();
    this.cancelNearbyCitySelection();

    this.cityForm.reset();

    this.cdr.detectChanges();
  }

  // ================= SAVE CITY =================

  saveCity(): void {

    if (this.cityForm.invalid || this.saving || this.nearbyActionInProgress) {

      this.cityForm.markAllAsTouched();

      return;
    }

    this.saving = true;

    this.clearMessages();

    const isEditing = !!this.editingCity;

    this.uploadImageIfSelected()
      .pipe(
        switchMap(imageUrl => {
          const formValue = this.cityForm.getRawValue();
          const payload: CityRequest = {
            name: formValue.name?.trim() ?? '',
            code: formValue.code?.trim().toUpperCase() || null,
            stateId: Number(formValue.stateId),
            slug: formValue.slug?.trim() || null,
            tagline: formValue.tagline?.trim() || null,
            description: formValue.description?.trim() || null,
            imageUrl,
            isFeatured: formValue.isFeatured ?? false,
            isActive: formValue.isActive ?? true,
            config: this.editingCity?.config ?? {}
          };

          return isEditing
            ? this.cityService.updateCity(this.editingCity!.id, payload)
            : this.cityService.createCity(payload);
        }),
        switchMap(savedCity => {
          this.editingCity = savedCity;
          return this.persistPendingNearbyCities(savedCity.id).pipe(
            map(() => savedCity)
          );
        }),
        finalize(() => {
          this.saving = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({

      next: () => {

        this.showForm = false;

        this.editingCity = null;
        this.resetImageSelection();
        this.clearNearbyCities();
        this.cancelNearbyCitySelection();

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

        this.errorMessage =
          error.error?.message ||
          (this.editingCity && this.nearbyCities.some(city => city.pending)
            ? 'City saved, but some nearby cities could not be added. Save again to retry.'
            : error.message) ||
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
