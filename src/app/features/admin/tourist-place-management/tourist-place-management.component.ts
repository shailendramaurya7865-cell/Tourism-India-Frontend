
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

import { TouristPlaceService } from '../../../core/services/tourist-place.service';
import { StateService } from '../../../core/services/state.services';
import { CityService } from '../../../core/services/city.services';
import { CategoryService } from '../../../core/services/category.service';

import { AdminState } from '../../../features/admin/models/admin-state.model';
import { AdminCity } from '../../../features/admin/models/admin-city.model';
import { AdminCategory } from '../../../features/admin/models/admin-category.model';

import {
  AdminTouristPlace,
  AdminTouristPlaceDetail,
  TouristPlaceStats,
  TouristPlaceRequest
} from '../../../features/admin/models/admin-tourist-place.model';

@Component({
  selector: 'app-tourist-place-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './tourist-place-management.component.html',
  styleUrl: './tourist-place-management.component.css'
})
export class TouristPlaceManagementComponent implements OnInit {

  private readonly touristPlaceService = inject(TouristPlaceService);
  private readonly stateService = inject(StateService);
  private readonly cityService = inject(CityService);
  private readonly categoryService = inject(CategoryService);

  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

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

  loading = false;
  saving = false;
  detailLoading = false;
  citiesLoading = false;

  errorMessage = '';
  successMessage = '';

  searchTerm = '';

  showForm = false;

  editingTouristPlace: AdminTouristPlaceDetail | null = null;

  touristPlaceForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
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

  ngOnInit(): void {
    this.loadTouristPlaces();
    this.loadTouristPlaceStats();
    this.loadStates();
    this.loadCategories();
  }

  // ================= LOAD DATA =================

  loadTouristPlaces(): void {
    this.loading = true;
    this.errorMessage = '';

    this.touristPlaceService.getAdminTouristPlaces().subscribe({
      next: (places) => {
        this.touristPlaces = places ?? [];
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

  loadTouristPlaceStats(): void {
    this.touristPlaceService.getTouristPlaceStats().subscribe({
      next: (stats) => {
        this.stats = stats;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Load tourist place statistics failed:', error);
        this.cdr.detectChanges();
      }
    });
  }

  loadStates(): void {
    this.stateService.getAdminStates().subscribe({
      next: (states) => {
        this.states = states ?? [];
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Load states failed:', error);
      }
    });
  }

  loadCategories(): void {
    this.categoryService.getAdminCategories().subscribe({
      next: (categories) => {
        this.categories = categories ?? [];
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

    this.filteredTouristPlaces = this.touristPlaces.filter(place =>
      place.name.toLowerCase().includes(term) ||
      (place.cityName ?? '').toLowerCase().includes(term) ||
      (place.stateName ?? '').toLowerCase().includes(term) ||
      (place.tagline ?? '').toLowerCase().includes(term)
    );
  }

  // ================= ADD TOURIST PLACE =================

  openAddForm(): void {
    this.editingTouristPlace = null;
    this.selectedCategoryIds = [];
    this.cities = [];

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
      this.cdr.detectChanges();
      return;
    }

    this.citiesLoading = true;

    this.cityService.getAdminCitiesByStateId(stateId).subscribe({
      next: (cities) => {
        this.cities = cities ?? [];
        this.citiesLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.citiesLoading = false;

        this.errorMessage =
          error.error?.message || 'Unable to load cities.';

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
        this.selectedCategoryIds.filter(id => id !== categoryId);
    }
  }

  isCategorySelected(categoryId: number): boolean {
    return this.selectedCategoryIds.includes(categoryId);
  }

  // ================= EDIT TOURIST PLACE =================

  openEditForm(place: AdminTouristPlace): void {

    if (this.detailLoading || this.saving) {
      return;
    }

    this.clearMessages();

    this.detailLoading = true;
    this.showForm = false;
    this.editingTouristPlace = null;

    this.touristPlaceForm.reset();
    this.selectedCategoryIds = [];

    this.touristPlaceService
      .getAdminTouristPlaceById(place.id)
      .subscribe({
        next: (details) => {

          this.editingTouristPlace = details;

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
            this.cityService.getAdminCitiesByStateId(stateId).subscribe({
              next: (cities) => {
                this.cities = cities ?? [];
                this.detailLoading = false;
                this.showForm = true;
                this.cdr.detectChanges();
              },
              error: (error) => {
                this.detailLoading = false;
                this.errorMessage =error.error?.message || 'Unable to load cities.';
                console.error('Load edit cities failed:', error);
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

          console.error('Load tourist place details failed:', error);
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
    this.editingTouristPlace = null;
    this.selectedCategoryIds = [];
    this.cities = [];

    this.touristPlaceForm.reset();

    this.cdr.detectChanges();
  }

  // ================= SAVE TOURIST PLACE =================

  saveTouristPlace(): void {

    if (this.touristPlaceForm.invalid || this.saving) {
      this.touristPlaceForm.markAllAsTouched();
      return;
    }

    if (!this.selectedCategoryIds.length) {
      this.errorMessage = 'Please select at least one category.';
      return;
    }

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
      latitude: formValue.latitude !== null
        ? Number(formValue.latitude)
        : null,
      longitude: formValue.longitude !== null
        ? Number(formValue.longitude)
        : null,

      entryFee: formValue.entryFee !== null
        ? Number(formValue.entryFee)
        : null,

      openingTime: formValue.openingTime || null,
      closingTime: formValue.closingTime || null,

      bestTimeToVisit: formValue.bestTimeToVisit?.trim() || null,
      timeRequired: formValue.timeRequired?.trim() || null,
      weeklyOf: formValue.weeklyOf?.trim() || null,
      howToReach: formValue.howToReach?.trim() || null,

      imageUrl: formValue.imageUrl?.trim() || null,

      isFeatured: formValue.isFeatured ?? false,
      isActive: formValue.isActive ?? true
    };

    this.saving = true;
    this.clearMessages();

    const isEditing = !!this.editingTouristPlace;

    const request = isEditing
      ? this.touristPlaceService.updateTouristPlace(
          this.editingTouristPlace!.id,
          payload
        )
      : this.touristPlaceService.createTouristPlace(payload);

    request.subscribe({
      next: () => {

        this.saving = false;
        this.showForm = false;
        this.editingTouristPlace = null;
        this.selectedCategoryIds = [];

        this.successMessage = isEditing
          ? 'Tourist place updated successfully.'
          : 'Tourist place added successfully.';

        this.touristPlaceForm.reset();

        this.refreshData();
        this.cdr.detectChanges();
      },
      error: (error) => {

        this.saving = false;

        this.errorMessage =
          error.error?.message ||
          'Unable to save tourist place. Please try again.';

        console.error('Save tourist place failed:', error);
        this.cdr.detectChanges();
      }
    });
  }

  // ================= TOGGLE ACTIVE STATUS =================

  toggleActive(place: AdminTouristPlace): void {

    if (this.saving || this.detailLoading) {
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

                console.error('Update tourist place status failed:', error);
                this.cdr.detectChanges();
              }
            });
        },
        error: (error) => {

          this.detailLoading = false;

          this.errorMessage =
            error.error?.message ||
            'Unable to load tourist place details.';

          console.error('Load tourist place for status update failed:', error);
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

    this.touristPlaceService.deleteTouristPlace(place.id).subscribe({
      next: () => {

        this.successMessage =
          `${place.name} deleted successfully.`;

        this.refreshData();
        this.cdr.detectChanges();
      },
      error: (error) => {

        this.errorMessage =
          error.error?.message || 'Unable to delete tourist place.';

        console.error('Delete tourist place failed:', error);
        this.cdr.detectChanges();
      }
    });
  }

  // ================= REFRESH =================

  private refreshData(): void {
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
