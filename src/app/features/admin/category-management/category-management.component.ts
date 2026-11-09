
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

import { CategoryService } from '../../../core/services/category.service';

import {
  AdminCategory,
  AdminCategoryDetail,
  CategoryStats,
  CategoryRequest
} from '../../../features/admin/models/admin-category.model';

@Component({
  selector: 'app-category-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './category-management.component.html',
  styleUrl: './category-management.component.css'
})
export class CategoryManagementComponent implements OnInit {

  private readonly categoryService = inject(CategoryService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  categories: AdminCategory[] = [];
  filteredCategories: AdminCategory[] = [];

  stats: CategoryStats = {
    totalCategories: 0,
    activeCategories: 0,
    inactiveCategories: 0,
    categoriesWithPlaces: 0
  };

  loading = false;
  saving = false;
  detailLoading = false;

  errorMessage = '';
  successMessage = '';

  searchTerm = '';

  showForm = false;

  // Full details are stored here after the detail API call.
  editingCategory: AdminCategoryDetail | null = null;

  categoryForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    slug: [''],
    iconUrl: [''],
    description: [''],
    isActive: [true]
  });

  ngOnInit(): void {
    this.loadCategories();
    this.loadCategoryStats();
  }

  // ================= LOAD DATA =================

  loadCategories(): void {
    this.loading = true;
    this.errorMessage = '';

    this.categoryService.getAdminCategories().subscribe({
      next: (categories) => {
        this.categories = categories ?? [];
        this.applySearch();

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.loading = false;

        this.errorMessage =
          error.error?.message ||
          'Unable to load categories. Please try again.';

        console.error('Load admin categories failed:', error);
        this.cdr.detectChanges();
      }
    });
  }

  loadCategoryStats(): void {
    this.categoryService.getCategoryStats().subscribe({
      next: (stats) => {
        this.stats = stats;

        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Load category statistics failed:', error);
        this.cdr.detectChanges();
      }
    });
  }

  // ================= SEARCH =================

  applySearch(): void {
    const term = this.searchTerm.trim().toLowerCase();

    this.filteredCategories = this.categories.filter(category =>
      category.name.toLowerCase().includes(term) ||
      (category.slug ?? '').toLowerCase().includes(term)
    );
  }

  // ================= ADD CATEGORY =================

  openAddForm(): void {
    this.editingCategory = null;

    this.categoryForm.reset({
      name: '',
      slug: '',
      iconUrl: '',
      description: '',
      isActive: true
    });

    this.clearMessages();
    this.showForm = true;

    this.cdr.detectChanges();
  }

  // ================= EDIT CATEGORY =================

  openEditForm(category: AdminCategory): void {

    if (this.detailLoading || this.saving) {
      return;
    }

    this.clearMessages();

    this.detailLoading = true;
    this.showForm = false;
    this.editingCategory = null;

    // Clear previous form values while fetching details.
    this.categoryForm.reset();

    this.categoryService.getAdminCategoryById(category.id).subscribe({
      next: (details) => {

        this.editingCategory = details;

        this.categoryForm.patchValue({
          name: details.name,
          slug: details.slug ?? '',
          iconUrl: details.iconUrl ?? '',
          description: details.description ?? '',
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
          'Unable to load category details. Please try again.';

        console.error('Load category details failed:', error);

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
    this.editingCategory = null;

    this.categoryForm.reset();

    this.cdr.detectChanges();
  }

  // ================= SAVE CATEGORY =================

  saveCategory(): void {

    if (this.categoryForm.invalid || this.saving) {
      this.categoryForm.markAllAsTouched();
      return;
    }

    const formValue = this.categoryForm.getRawValue();

    const payload: CategoryRequest = {
      name: formValue.name?.trim() ?? '',
      slug: formValue.slug?.trim() || null,
      iconUrl: formValue.iconUrl?.trim() || null,
      description: formValue.description?.trim() || null,
      isActive: formValue.isActive ?? true,
      config: this.editingCategory?.config ?? {}
    };

    this.saving = true;
    this.clearMessages();

    const isEditing = !!this.editingCategory;

    const request = isEditing
      ? this.categoryService.updateCategory(
          this.editingCategory!.id,
          payload
        )
      : this.categoryService.createCategory(payload);

    request.subscribe({
      next: () => {

        this.saving = false;
        this.showForm = false;
        this.editingCategory = null;

        this.successMessage = isEditing
          ? 'Category updated successfully.'
          : 'Category added successfully.';

        this.categoryForm.reset();

        this.refreshData();

        this.cdr.detectChanges();
      },
      error: (error) => {

        this.saving = false;

        this.errorMessage =
          error.error?.message ||
          'Unable to save category. Please try again.';

        console.error('Save category failed:', error);

        this.cdr.detectChanges();
      }
    });
  }

  // ================= TOGGLE ACTIVE STATUS =================

  toggleActive(category: AdminCategory): void {

    if (this.saving || this.detailLoading) {
      return;
    }

    this.clearMessages();
    this.detailLoading = true;

    // Fetch complete details before sending an update.
    this.categoryService.getAdminCategoryById(category.id).subscribe({
      next: (details) => {

        const payload: CategoryRequest = {
          name: details.name,
          slug: details.slug,
          iconUrl: details.iconUrl,
          description: details.description,
          isActive: !details.isActive,
          config: details.config ?? {}
        };

        this.categoryService.updateCategory(
          category.id,
          payload
        ).subscribe({
          next: () => {

            this.detailLoading = false;

            this.successMessage =
              `${category.name} ${payload.isActive ? 'activated' : 'deactivated'} successfully.`;

            this.refreshData();

            this.cdr.detectChanges();
          },
          error: (error) => {

            this.detailLoading = false;

            this.errorMessage =
              error.error?.message ||
              'Unable to update category status.';

            console.error('Update category status failed:', error);

            this.cdr.detectChanges();
          }
        });
      },
      error: (error) => {

        this.detailLoading = false;

        this.errorMessage =
          error.error?.message ||
          'Unable to load category details.';

        console.error('Load category for status update failed:', error);

        this.cdr.detectChanges();
      }
    });
  }

  // ================= DELETE CATEGORY =================

  deleteCategory(category: AdminCategory): void {

    const confirmed = window.confirm(
      `Are you sure you want to delete ${category.name}? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    this.categoryService.deleteCategory(category.id).subscribe({
      next: () => {

        this.successMessage =
          `${category.name} deleted successfully.`;

        this.refreshData();

        this.cdr.detectChanges();
      },
      error: (error) => {

        this.errorMessage =
          error.error?.message ||
          'Unable to delete category.';

        console.error('Delete category failed:', error);

        this.cdr.detectChanges();
      }
    });
  }

  // ================= REFRESH =================

  private refreshData(): void {
    this.loadCategories();
    this.loadCategoryStats();
  }

  // ================= MESSAGES =================

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  // ================= STATISTICS =================

  get activeCount(): number {
    return this.stats.activeCategories;
  }

  get inactiveCount(): number {
    return this.stats.inactiveCategories;
  }

  get totalCount(): number {
    return this.stats.totalCategories;
  }

  get categoriesWithPlacesCount(): number {
    return this.stats.categoriesWithPlaces;
  }

  // ================= FORM CONTROLS =================

  get nameControl() {
    return this.categoryForm.controls.name;
  }

  get slugControl() {
    return this.categoryForm.controls.slug;
  }
}
