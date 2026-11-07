
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

import {
  AdminState
} from '../../../features/admin/models/admin-state.model';

import {
  AdminCity,
  AdminCityDetail,
  CityStats,
  CityRequest
} from '../../../features/admin/models/admin-city.model';

@Component({
  selector: 'app-city-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './city-management.component.html',
  styleUrl: './city-management.component.css'
})
export class CityManagementComponent implements OnInit {

  private readonly cityService = inject(CityService);
  private readonly stateService = inject(StateService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  cities: AdminCity[] = [];
  filteredCities: AdminCity[] = [];

  states: AdminState[] = [];

  stats: CityStats = {
    totalCities: 0,
    activeCities: 0,
    inactiveCities: 0,
    featuredCities: 0
  };

  loading = false;
  saving = false;
  detailLoading = false;

  errorMessage = '';
  successMessage = '';

  searchTerm = '';

  showForm = false;

  editingCity: AdminCityDetail | null = null;

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

  // ================= LOAD DATA =================

  loadCities(): void {

    this.loading = true;
    this.errorMessage = '';

    this.cityService.getAdminCities().subscribe({

      next: (cities) => {

        this.cities = cities ?? [];
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

    this.filteredCities = this.cities.filter(city =>

      city.name.toLowerCase().includes(term) ||

      (city.tagline ?? '').toLowerCase().includes(term) ||

      (city.stateName ?? '').toLowerCase().includes(term)
    );
  }

  // ================= ADD CITY =================

  openAddForm(): void {

    if (this.detailLoading || this.saving) {
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

    if (this.detailLoading || this.saving) {
      return;
    }

    this.clearMessages();

    this.detailLoading = true;
    this.showForm = false;
    this.editingCity = null;

    this.cityForm.reset();

    this.cityService.getAdminCityById(city.id).subscribe({

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

  // ================= CLOSE FORM =================

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

      stateId: formValue.stateId!,

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

    if (this.saving || this.detailLoading) {
      return;
    }

    this.clearMessages();

    this.detailLoading = true;

    this.cityService.getAdminCityById(city.id).subscribe({

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

        this.cityService.updateCity(city.id, payload).subscribe({

          next: () => {

            this.detailLoading = false;

            this.successMessage =
              `${city.name} ${payload.isActive ? 'activated' : 'deactivated'} successfully.`;

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

    this.cityService.deleteCity(city.id).subscribe({

      next: () => {

        this.successMessage =
          `${city.name} deleted successfully.`;

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

  private refreshData(): void {

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
