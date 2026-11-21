
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

import { TouristPlaceService } from '../../../core/services/tourist-place.service';
import { TouristPlaceDetailService } from '../../../core/services/tourist-place-detail.service';
import { StateService } from '../../../core/services/state.services';
import { CityService } from '../../../core/services/city.services';
import { CategoryService } from '../../../core/services/category.service';
import { MediaService } from '../../../core/services/media.service';
import { MediaFolder } from '../../../shared/models/media-folder.model';

import { AdminState } from '../../../features/admin/models/admin-state.model';
import { AdminCity } from '../../../features/admin/models/admin-city.model';
import { AdminCategory } from '../../../features/admin/models/admin-category.model';
import { TouristPlace } from '../../../core/models/tourist-place.model';
import { TouristPlaceDetail, NearbyPlace } from '../../../core/models/tourist-place-detail.model';

import {
  AdminTouristPlace,
  AdminTouristPlaceDetail,
  AdminNearbyPlace,
  TouristPlaceStats,
  TouristPlaceRequest
} from '../../../features/admin/models/admin-tourist-place.model';

@Component({
  selector: 'app-tourist-place-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule
  ],
  templateUrl: './tourist-place-management.component.html',
  styleUrl: './tourist-place-management.component.css'
})
export class TouristPlaceManagementComponent implements OnInit, OnDestroy {

  private readonly touristPlaceService = inject(TouristPlaceService);
  private readonly touristPlaceDetailService = inject(TouristPlaceDetailService);
  private readonly stateService = inject(StateService);
  private readonly cityService = inject(CityService);
  private readonly categoryService = inject(CategoryService);
  private readonly mediaService = inject(MediaService);

  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly mediaFolder: MediaFolder = 'TOURIST_PLACES';

  readonly maxImageSize = 5 * 1024 * 1024;
  readonly allowedImageTypes = ['image/png', 'image/jpeg', 'image/webp'];
  selectedImageFile: File | null = null;
  imagePreviewUrl: string | null = null;
  private previewObjectUrl: string | null = null;

  // ================= DATA =================

  touristPlaces: AdminTouristPlace[] = [];
  filteredTouristPlaces: AdminTouristPlace[] = [];

  states: AdminState[] = [];
  cities: AdminCity[] = [];
  categories: AdminCategory[] = [];

  selectedCategoryIds: number[] = [];

  stats: TouristPlaceStats = {
    totalTouristPlaces: 0,
    activeTouristPlaces: 0,
    inactiveTouristPlaces: 0,
    featuredTouristPlaces: 0
  };

  // ================= PAGINATION =================

  currentPage = 0;
  pageSize = 10;
  totalPages = 0;
  totalElements = 0;

  pageSizeOptions = [5, 10, 20, 50];

  readonly Math = Math;

  get pageNumbers(): number[] {
    return Array.from(
      { length: this.totalPages },
      (_, index) => index
    );
  }

  // ================= LOADING STATES =================

  loading = false;
  saving = false;
  detailLoading = false;
  citiesLoading = false;
  viewLoading = false;

  // ================= MESSAGES =================

  errorMessage = '';
  successMessage = '';

  // ================= SEARCH =================

  searchTerm = '';

  // ================= MODALS =================

  showForm = false;

  editingTouristPlace: AdminTouristPlaceDetail | null = null;

  viewingTouristPlace: AdminTouristPlaceDetail | null = null;
  nearbyPlaces: AdminNearbyPlace[] = [];
  nearbyPlaceOptions: TouristPlace[] = [];
  nearbyPlaceSearchTerm = '';
  selectedNearbyPlace: TouristPlace | null = null;
  nearbyDistanceKm: number | null = null;
  nearbyPlaceOptionsLoading = false;
  nearbyPlaceOptionsLoaded = false;
  nearbyPlacesLoading = false;
  nearbyPlacesError = '';
  nearbyActionInProgress = false;
  private nearbyPlacesRequestId = 0;

  // ================= FORM =================

  touristPlaceForm = this.fb.group({
    name: ['', [
      Validators.required,
      Validators.maxLength(255)
    ]],

    slug: ['', Validators.required],

    tagline: ['', Validators.maxLength(200)],

    shortDescription: ['', Validators.maxLength(500)],

    description: [''],

    stateId: [null as number | null, Validators.required],

    cityId: [null as number | null, Validators.required],

    address: ['', Validators.maxLength(500)],

    latitude: [null as number | null],

    longitude: [null as number | null],

    entryFee: [null as number | null],

    openingTime: [''],

    closingTime: [''],

    bestTimeToVisit: [''],

    timeRequired: [''],

    weeklyOf: [''],

    howToReach: [''],

    imageUrl: [''],

    isFeatured: [false],

    isActive: [true]
  });

  // ================= INITIALIZATION =================

  ngOnInit(): void {
    this.loadTouristPlaces();
    this.loadTouristPlaceStats();
    this.loadStates();
    this.loadCategories();
  }

  ngOnDestroy(): void {
    this.clearImagePreview();
  }

  get filteredNearbyPlaceOptions(): TouristPlace[] {
    const term = this.nearbyPlaceSearchTerm.trim().toLowerCase();
    if (!term) return [];

    const excludedIds = new Set(this.nearbyPlaces.map(place => place.id));
    if (this.editingTouristPlace) excludedIds.add(this.editingTouristPlace.id);

    return this.nearbyPlaceOptions
      .filter(place =>
        !excludedIds.has(place.id) &&
        place.title.toLowerCase().includes(term)
      )
      .slice(0, 8);
  }

  get isNearbyPlaceDistanceValid(): boolean {
    return this.nearbyDistanceKm !== null &&
      Number.isFinite(this.nearbyDistanceKm) &&
      this.nearbyDistanceKm > 0;
  }

  private loadNearbyPlaces(placeId: number): void {
    const requestId = ++this.nearbyPlacesRequestId;
    this.nearbyPlaces = [];
    this.nearbyPlacesError = '';
    this.nearbyPlacesLoading = true;

    this.touristPlaceDetailService.getTouristPlaceDetail(placeId).subscribe({
      next: response => {
        if (requestId !== this.nearbyPlacesRequestId) return;

        const detail = response.data as (TouristPlaceDetail & {
          nearbyPlaces?: NearbyPlace[];
        }) | undefined;

        if (!response.success || !detail) {
          this.nearbyPlacesError = response.message || 'Unable to load nearby tourist places.';
        } else {
          const nearbyPlaces = detail.nearByPlace ?? detail.nearbyPlaces ?? [];
          this.nearbyPlaces = nearbyPlaces.map(place => ({
            id: place.id,
            placeName: place.name,
            distanceKm: place.distanceKm
          }));
        }

        this.nearbyPlacesLoading = false;
        this.cdr.detectChanges();
      },
      error: error => {
        if (requestId !== this.nearbyPlacesRequestId) return;

        this.nearbyPlacesLoading = false;
        this.nearbyPlacesError = error.error?.message || 'Unable to load nearby tourist places.';
        console.error('Load nearby tourist places failed:', error);
        this.cdr.detectChanges();
      }
    });
  }

  private clearNearbyPlaces(): void {
    this.nearbyPlacesRequestId++;
    this.nearbyPlaces = [];
    this.nearbyPlacesLoading = false;
    this.nearbyPlacesError = '';
  }

  onNearbyPlaceSearchChange(term: string): void {
    this.nearbyPlaceSearchTerm = term;
    this.selectedNearbyPlace = null;
    this.nearbyDistanceKm = null;

    if (!term.trim() || this.nearbyPlaceOptionsLoaded || this.nearbyPlaceOptionsLoading) {
      return;
    }

    this.nearbyPlaceOptionsLoading = true;
    this.touristPlaceService.getTouristPlaces().subscribe({
      next: places => {
        this.nearbyPlaceOptions = places ?? [];
        this.nearbyPlaceOptionsLoaded = true;
        this.nearbyPlaceOptionsLoading = false;
        this.cdr.detectChanges();
      },
      error: error => {
        this.nearbyPlaceOptionsLoading = false;
        this.errorMessage = error.error?.message || 'Unable to search tourist places.';
        console.error('Load nearby tourist-place options failed:', error);
        this.cdr.detectChanges();
      }
    });
  }

  selectNearbyPlace(place: TouristPlace): void {
    this.selectedNearbyPlace = place;
    this.nearbyDistanceKm = null;
    this.nearbyPlaceSearchTerm = '';
  }

  cancelNearbyPlaceSelection(): void {
    this.selectedNearbyPlace = null;
    this.nearbyDistanceKm = null;
    this.nearbyPlaceSearchTerm = '';
  }

  addNearbyPlace(): void {
    const place = this.selectedNearbyPlace;
    const distanceKm = Number(this.nearbyDistanceKm);

    if (
      !place ||
      !Number.isFinite(distanceKm) ||
      distanceKm <= 0 ||
      this.nearbyPlaces.some(nearby => nearby.id === place.id) ||
      this.nearbyActionInProgress ||
      this.nearbyPlacesLoading ||
      this.saving
    ) {
      return;
    }

    if (!this.editingTouristPlace) {
      this.nearbyPlaces = [...this.nearbyPlaces, {
        id: place.id,
        placeName: place.title,
        distanceKm,
        pending: true
      }];
      this.cancelNearbyPlaceSelection();
      return;
    }

    this.nearbyActionInProgress = true;
    this.clearMessages();
    this.touristPlaceService
      .addNearbyPlace(this.editingTouristPlace.id, place.id, distanceKm)
      .pipe(finalize(() => {
        this.nearbyActionInProgress = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          this.nearbyPlaces = [...this.nearbyPlaces, {
            id: place.id,
            placeName: place.title,
            distanceKm
          }];
          this.cancelNearbyPlaceSelection();
          this.successMessage = `${place.title} added as a nearby tourist place.`;
        },
        error: error => {
          this.errorMessage = error.error?.message || 'Unable to add nearby tourist place.';
          console.error('Add nearby tourist place failed:', error);
        }
      });
  }

  removeNearbyPlace(place: AdminNearbyPlace): void {
    if (this.nearbyActionInProgress || this.nearbyPlacesLoading || this.saving) return;

    if (place.pending || !this.editingTouristPlace) {
      this.nearbyPlaces = this.nearbyPlaces.filter(item => item.id !== place.id);
      return;
    }

    this.nearbyActionInProgress = true;
    this.clearMessages();
    this.touristPlaceService
      .removeNearbyPlace(this.editingTouristPlace.id, place.id)
      .pipe(finalize(() => {
        this.nearbyActionInProgress = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          this.nearbyPlaces = this.nearbyPlaces.filter(item => item.id !== place.id);
          this.successMessage = `${place.placeName} removed from nearby tourist places.`;
        },
        error: error => {
          this.errorMessage = error.error?.message || 'Unable to remove nearby tourist place.';
          console.error('Remove nearby tourist place failed:', error);
        }
      });
  }

  private persistPendingNearbyPlaces(placeId: number): Observable<unknown[]> {
    const pendingPlaces = this.nearbyPlaces.filter(
      (place): place is AdminNearbyPlace & { distanceKm: number } =>
        place.pending === true && place.distanceKm !== null
    );

    return from(pendingPlaces).pipe(
      concatMap(place =>
        this.touristPlaceService.addNearbyPlace(placeId, place.id, place.distanceKm).pipe(
          tap(() => {
            this.nearbyPlaces = this.nearbyPlaces.map(item =>
              item.id === place.id ? { ...item, pending: false } : item
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
    this.touristPlaceForm.patchValue({ imageUrl: '' });
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
    const input = document.getElementById('touristPlaceImage') as HTMLInputElement | null;
    if (input) input.value = '';
  }

  private uploadImageIfSelected(): Observable<string | null> {
    if (!this.selectedImageFile) {
      return of(this.touristPlaceForm.get('imageUrl')?.value?.trim() || null);
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

  // ================= LOAD TOURIST PLACES =================

  loadTouristPlaces(): void {
    this.loading = true;
    this.errorMessage = '';

    this.touristPlaceService
      .getAdminTouristPlaces(this.currentPage, this.pageSize)
      .subscribe({
        next: (response) => {
          this.touristPlaces = response.content ?? [];

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
            'Unable to load tourist places. Please try again.';

          console.error('Load tourist places failed:', error);

          this.cdr.detectChanges();
        }
      });
  }

  // ================= LOAD STATISTICS =================

  loadTouristPlaceStats(): void {
    this.touristPlaceService.getTouristPlaceStats().subscribe({
      next: (stats) => {
        this.stats = stats;

        this.cdr.detectChanges();
      },

      error: (error) => {
        console.error(
          'Load tourist place statistics failed:',
          error
        );

        this.cdr.detectChanges();
      }
    });
  }

  // ================= LOAD STATES =================

  loadStates(): void {
    this.stateService.getAdminStates().subscribe({
      next: (response) => {
        this.states = response.content ?? [];

        this.cdr.detectChanges();
      },

      error: (error) => {
        console.error('Load states failed:', error);
      }
    });
  }

  // ================= LOAD CATEGORIES =================

  loadCategories(): void {
    this.categoryService.getAdminCategories().subscribe({
      next: (response) => {
        this.categories = response.content ?? [];

        this.cdr.detectChanges();
      },

      error: (error) => {
        console.error('Load categories failed:', error);
      }
    });
  }

  // ================= SEARCH =================

  applySearch(): void {
    const term = this.searchTerm.trim().toLowerCase();

    if (!term) {
      this.filteredTouristPlaces = [...this.touristPlaces];
      return;
    }

    this.filteredTouristPlaces = this.touristPlaces.filter(place =>
      (place.name ?? '').toLowerCase().includes(term) ||
      (place.cityName ?? '').toLowerCase().includes(term) ||
      (place.stateName ?? '').toLowerCase().includes(term)
    );
  }

  // ================= PAGINATION METHODS =================

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
    this.loadTouristPlaces();
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

    this.loadTouristPlaces();
  }

  // ================= ADD TOURIST PLACE =================

  openAddForm(): void {
    if (this.saving || this.detailLoading || this.nearbyActionInProgress) {
      return;
    }

    this.editingTouristPlace = null;
    this.selectedCategoryIds = [];
    this.cities = [];
    this.resetImageSelection();
    this.clearNearbyPlaces();
    this.cancelNearbyPlaceSelection();

    this.touristPlaceForm.reset({
      name: '',
      slug: '',
      tagline: '',
      shortDescription: '',
      description: '',
      stateId: null,
      cityId: null,
      address: '',
      latitude: null,
      longitude: null,
      entryFee: null,
      openingTime: '',
      closingTime: '',
      bestTimeToVisit: '',
      timeRequired: '',
      weeklyOf: '',
      howToReach: '',
      imageUrl: '',
      isFeatured: false,
      isActive: true
    });

    this.clearMessages();

    this.showForm = true;

    this.cdr.detectChanges();
  }

  // ================= STATE / CITY =================

  onStateChange(stateId: number | null): void {
    this.cities = [];

    this.touristPlaceForm.patchValue({
      cityId: null
    });

    if (!stateId) {
      this.citiesLoading = false;
      this.cdr.detectChanges();
      return;
    }

    this.citiesLoading = true;

    this.cityService
      .getAdminCitiesByStateId(stateId)
      .subscribe({
        next: (cities) => {
          this.cities = cities ?? [];

          this.citiesLoading = false;

          this.cdr.detectChanges();
        },

        error: (error) => {
          this.citiesLoading = false;

          this.errorMessage =
            error.error?.message ||
            'Unable to load cities.';

          console.error('Load cities failed:', error);

          this.cdr.detectChanges();
        }
      });
  }

  // ================= CATEGORY SELECTION =================

  toggleCategory(categoryId: number, checked: boolean): void {
    if (checked) {
      if (!this.selectedCategoryIds.includes(categoryId)) {
        this.selectedCategoryIds = [
          ...this.selectedCategoryIds,
          categoryId
        ];
      }
    } else {
      this.selectedCategoryIds =
        this.selectedCategoryIds.filter(
          id => id !== categoryId
        );
    }
  }

  isCategorySelected(categoryId: number): boolean {
    return this.selectedCategoryIds.includes(categoryId);
  }

  // ================= EDIT TOURIST PLACE =================

  openEditForm(place: AdminTouristPlace): void {
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
    this.editingTouristPlace = null;
    this.resetImageSelection();
    this.clearNearbyPlaces();
    this.cancelNearbyPlaceSelection();

    this.touristPlaceForm.reset();
    this.selectedCategoryIds = [];
    this.cities = [];

    this.touristPlaceService
      .getAdminTouristPlaceById(place.id)
      .subscribe({
        next: (details) => {
          this.editingTouristPlace = details;
          this.imagePreviewUrl = details.imageUrl ?? null;
          this.loadNearbyPlaces(details.id);

          const state = this.states.find(
            item => item.name === details.stateName
          );

          const stateId = state?.id ?? null;

          this.selectedCategoryIds = [
            ...(details.categoryIds ?? [])
          ];

          this.touristPlaceForm.patchValue({
            name: details.name,
            slug: details.slug,
            tagline: details.tagline ?? '',

            shortDescription: details.shortDescription ?? '',
            description: details.description ?? '',

            stateId,
            cityId: details.cityId,

            address: details.address ?? '',
            latitude: details.latitude,
            longitude: details.longitude,

            entryFee: details.entryFee,
            openingTime: details.openingTime ?? '',
            closingTime: details.closingTime ?? '',

            bestTimeToVisit: details.bestTimeToVisit ?? '',
            timeRequired: details.timeRequired ?? '',
            weeklyOf: details.weeklyOf ?? '',
            howToReach: details.howToReach ?? '',

            imageUrl: details.imageUrl ?? '',

            isFeatured: details.isFeatured,
            isActive: details.isActive
          });

          if (stateId) {
            this.citiesLoading = true;

            this.cityService
              .getAdminCitiesByStateId(stateId)
              .subscribe({
                next: (cities) => {
                  this.cities = cities ?? [];

                  this.citiesLoading = false;
                  this.detailLoading = false;
                  this.showForm = true;

                  this.cdr.detectChanges();
                },

                error: (error) => {
                  this.citiesLoading = false;
                  this.detailLoading = false;

                  this.errorMessage =
                    error.error?.message ||
                    'Unable to load cities.';

                  console.error(
                    'Load edit cities failed:',
                    error
                  );

                  this.cdr.detectChanges();
                }
              });
          } else {
            this.detailLoading = false;
            this.showForm = true;

            this.cdr.detectChanges();
          }
        },

        error: (error) => {
          this.detailLoading = false;

          this.errorMessage =
            error.error?.message ||
            'Unable to load tourist place details. Please try again.';

          console.error(
            'Load tourist place details failed:',
            error
          );

          this.cdr.detectChanges();
        }
      });
  }

  // ================= VIEW TOURIST PLACE DETAILS =================

  openViewDetails(place: AdminTouristPlace): void {
    if (
      this.viewLoading ||
      this.detailLoading ||
      this.nearbyActionInProgress ||
      this.saving
    ) {
      return;
    }

    this.clearMessages();

    this.viewingTouristPlace = null;
    this.clearNearbyPlaces();
    this.viewLoading = true;

    this.touristPlaceService
      .getAdminTouristPlaceById(place.id)
      .subscribe({
        next: (details) => {
          this.viewingTouristPlace = details;

          this.viewLoading = false;
          this.loadNearbyPlaces(details.id);

          this.cdr.detectChanges();
        },

        error: (error) => {
          this.viewLoading = false;

          this.errorMessage =
            error.error?.message ||
            'Unable to load tourist place details.';

          console.error(
            'View tourist place failed:',
            error
          );

          this.cdr.detectChanges();
        }
      });
  }

  closeViewDetails(): void {
    this.viewingTouristPlace = null;
    this.clearNearbyPlaces();

    this.cdr.detectChanges();
  }

  editFromView(): void {
    if (!this.viewingTouristPlace) {
      return;
    }

    const place = this.viewingTouristPlace;

    this.viewingTouristPlace = null;

    this.openEditForm(place);
  }

  // ================= CLOSE FORM =================

  closeForm(): void {
    if (this.saving || this.detailLoading || this.nearbyActionInProgress) {
      return;
    }

    this.showForm = false;
    this.editingTouristPlace = null;
    this.selectedCategoryIds = [];
    this.cities = [];
    this.resetImageSelection();
    this.clearNearbyPlaces();
    this.cancelNearbyPlaceSelection();

    this.touristPlaceForm.reset();

    this.cdr.detectChanges();
  }

  // ================= SAVE TOURIST PLACE =================

  saveTouristPlace(): void {
    if (this.touristPlaceForm.invalid || this.saving || this.nearbyActionInProgress) {
      this.touristPlaceForm.markAllAsTouched();
      return;
    }

    if (!this.selectedCategoryIds.length) {
      this.errorMessage = 'Please select at least one category.';
      return;
    }

    this.saving = true;
    this.clearMessages();

    const isEditing = !!this.editingTouristPlace;

    this.uploadImageIfSelected()
      .pipe(
        switchMap(imageUrl => {
          const formValue = this.touristPlaceForm.getRawValue();
          const payload: TouristPlaceRequest = {
            name: formValue.name?.trim() ?? '',
            slug: formValue.slug?.trim() ?? '',
            tagline: formValue.tagline?.trim() || null,
            shortDescription: formValue.shortDescription?.trim() || null,
            description: formValue.description?.trim() || null,
            cityId: Number(formValue.cityId),
            categoryIds: [...this.selectedCategoryIds],
            address: formValue.address?.trim() || null,
            latitude: formValue.latitude !== null ? Number(formValue.latitude) : null,
            longitude: formValue.longitude !== null ? Number(formValue.longitude) : null,
            entryFee: formValue.entryFee !== null ? Number(formValue.entryFee) : null,
            openingTime: formValue.openingTime || null,
            closingTime: formValue.closingTime || null,
            bestTimeToVisit: formValue.bestTimeToVisit?.trim() || null,
            timeRequired: formValue.timeRequired?.trim() || null,
            weeklyOf: formValue.weeklyOf?.trim() || null,
            howToReach: formValue.howToReach?.trim() || null,
            imageUrl,
            isFeatured: formValue.isFeatured ?? false,
            isActive: formValue.isActive ?? true
          };

          return isEditing
            ? this.touristPlaceService.updateTouristPlace(this.editingTouristPlace!.id, payload)
            : this.touristPlaceService.createTouristPlace(payload);
        }),
        switchMap(savedPlace => {
          this.editingTouristPlace = savedPlace;
          return this.persistPendingNearbyPlaces(savedPlace.id).pipe(
            map(() => savedPlace)
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
        this.editingTouristPlace = null;
        this.selectedCategoryIds = [];
        this.resetImageSelection();
        this.clearNearbyPlaces();
        this.cancelNearbyPlaceSelection();

        this.successMessage = isEditing
          ? 'Tourist place updated successfully.'
          : 'Tourist place added successfully.';

        this.touristPlaceForm.reset();

        // Newly created records should appear on the first page.
        if (!isEditing) {
          this.currentPage = 0;
        }

        this.refreshData();

        this.cdr.detectChanges();
      },

      error: (error) => {
        this.errorMessage =
          error.error?.message ||
          (this.editingTouristPlace && this.nearbyPlaces.some(place => place.pending)
            ? 'Tourist place saved, but some nearby places could not be added. Save again to retry.'
            : error.message) ||
          'Unable to save tourist place. Please try again.';

        console.error('Save tourist place failed:', error);

        this.cdr.detectChanges();
      }
    });
  }

  // ================= TOGGLE ACTIVE STATUS =================

  toggleActive(place: AdminTouristPlace): void {
    if (
      this.saving ||
      this.detailLoading ||
      this.viewLoading
    ) {
      return;
    }

    this.clearMessages();

    this.detailLoading = true;

    this.touristPlaceService
      .getAdminTouristPlaceById(place.id)
      .subscribe({
        next: (details) => {
          const payload: TouristPlaceRequest = {
            name: details.name,
            slug: details.slug,
            tagline: details.tagline,
            shortDescription: details.shortDescription,
            description: details.description,

            cityId: details.cityId,
            categoryIds: details.categoryIds ?? [],

            address: details.address,
            latitude: details.latitude,
            longitude: details.longitude,

            entryFee: details.entryFee,
            openingTime: details.openingTime,
            closingTime: details.closingTime,

            bestTimeToVisit: details.bestTimeToVisit,
            timeRequired: details.timeRequired,
            weeklyOf: details.weeklyOf,
            howToReach: details.howToReach,

            imageUrl: details.imageUrl,

            isFeatured: details.isFeatured,
            isActive: !details.isActive
          };

          this.touristPlaceService
            .updateTouristPlace(place.id, payload)
            .subscribe({
              next: () => {
                this.detailLoading = false;

                this.successMessage =
                  `${place.name} ${
                    payload.isActive ? 'activated' : 'deactivated'
                  } successfully.`;

                this.refreshData();

                this.cdr.detectChanges();
              },

              error: (error) => {
                this.detailLoading = false;

                this.errorMessage =
                  error.error?.message ||
                  'Unable to update tourist place status.';

                console.error(
                  'Update tourist place status failed:',
                  error
                );

                this.cdr.detectChanges();
              }
            });
        },

        error: (error) => {
          this.detailLoading = false;

          this.errorMessage =
            error.error?.message ||
            'Unable to load tourist place details.';

          console.error(
            'Load tourist place for status update failed:',
            error
          );

          this.cdr.detectChanges();
        }
      });
  }

  // ================= DELETE TOURIST PLACE =================

  deleteTouristPlace(place: AdminTouristPlace): void {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${place.name}? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    this.clearMessages();

    this.touristPlaceService
      .deleteTouristPlace(place.id)
      .subscribe({
        next: () => {
          this.successMessage =
            `${place.name} deleted successfully.`;

          // If the last row on this page is deleted,
          // move to the previous page.
          if (
            this.touristPlaces.length === 1 &&
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
            'Unable to delete tourist place.';

          console.error(
            'Delete tourist place failed:',
            error
          );

          this.cdr.detectChanges();
        }
      });
  }

  // ================= REFRESH =================

  refreshData(): void {
    this.loadTouristPlaces();
    this.loadTouristPlaceStats();
  }

  // ================= MESSAGES =================

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  // ================= STATISTICS =================

  get activeCount(): number {
    return this.stats.activeTouristPlaces;
  }

  get featuredCount(): number {
    return this.stats.featuredTouristPlaces;
  }

  get inactiveCount(): number {
    return this.stats.inactiveTouristPlaces;
  }

  get totalCount(): number {
    return this.stats.totalTouristPlaces;
  }

  // ================= FORM CONTROLS =================

  get nameControl() {
    return this.touristPlaceForm.controls.name;
  }

  get slugControl() {
    return this.touristPlaceForm.controls.slug;
  }

  get cityControl() {
    return this.touristPlaceForm.controls.cityId;
  }

}
