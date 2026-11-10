
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
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule
  ],
  templateUrl: './category-management.component.html',
  styleUrl: './category-management.component.css'
})
export class CategoryManagementComponent implements OnInit {

  private readonly categoryService = inject(CategoryService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  // ================= DATA =================

  categories: AdminCategory[] = [];

  private pageCategories: AdminCategory[] = [];

  stats: CategoryStats = {
    totalCategories: 0,
    activeCategories: 0,
    inactiveCategories: 0,
    categoriesWithPlaces: 0
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

  // ================= LOADING =================

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

  editingCategory: AdminCategoryDetail | null = null;

  viewingCategory: AdminCategoryDetail | null = null;

  get showFormModal(): boolean {
    return this.showForm;
  }

  get showViewModal(): boolean {
    return this.viewLoading || this.viewingCategory !== null;
  }

  get isEditMode(): boolean {
    return this.editingCategory !== null;
  }

  get selectedCategory(): AdminCategoryDetail | null {
    return this.viewingCategory;
  }

  // ================= FORM =================

  categoryForm = this.fb.group({
    name: ['', [
      Validators.required,
      Validators.maxLength(255)
    ]],

    slug: ['', Validators.maxLength(255)],

    iconUrl: ['', Validators.maxLength(1000)],

    description: [''],

    isActive: [true]
  });

  // ================= INITIALIZATION =================

  ngOnInit(): void {
    this.loadCategories();
    this.loadCategoryStats();
  }

  // ================= LOAD DATA =================

  loadCategories(): void {

    if (this.loading) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.categoryService
      .getAdminCategories(this.currentPage, this.pageSize)
      .subscribe({

        next: (response: any) => {

          console.log('Admin categories API response:', response);

          // Support Spring Boot Page response.
          // Also safely handle an incorrectly structured response.

          const content = Array.isArray(response)
            ? response
            : Array.isArray(response?.content)
              ? response.content
              : [];

          this.pageCategories = content;

          this.totalElements = Number(
            response?.totalElements ?? content.length
          );

          this.totalPages = Number(
            response?.totalPages ??
            Math.ceil(this.totalElements / this.pageSize)
          );

          // Prevent invalid page selection.
          if (
            this.totalPages > 0 &&
            this.currentPage >= this.totalPages
          ) {
            this.currentPage = this.totalPages - 1;
            this.loading = false;
            this.loadCategories();
            return;
          }

          if (this.totalPages === 0) {
            this.currentPage = 0;
          }

          this.applySearch();

          this.loading = false;

          this.cdr.detectChanges();
        },

        error: (error) => {

          this.loading = false;

          this.pageCategories = [];
          this.categories = [];

          this.totalElements = 0;
          this.totalPages = 0;

          this.errorMessage =
            error.error?.message ||
            'Unable to load categories. Please try again.';

          console.error(
            'Load admin categories failed:',
            error
          );

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

        console.error(
          'Load category statistics failed:',
          error
        );

        this.cdr.detectChanges();
      }
    });
  }

  // ================= SEARCH =================

  applySearch(): void {

    const term = (this.searchTerm ?? '')
      .trim()
      .toLowerCase();

    // Always work with a valid array.
    const source: AdminCategory[] =
      Array.isArray(this.pageCategories)
        ? this.pageCategories
        : [];

    if (!term) {
      this.categories = [...source];
      return;
    }

    this.categories = source.filter(category => {

      const name = String(category?.name ?? '').toLowerCase();

      const slug = String(category?.slug ?? '').toLowerCase();

      return name.includes(term) || slug.includes(term);
    });
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

    this.loadCategories();
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

    this.loadCategories();
  }

  onPageSizeChange(size: number | string): void {
    this.changePageSize(size);
  }

  // ================= ADD CATEGORY =================

  openAddForm(): void {

    if (
      this.saving ||
      this.detailLoading ||
      this.viewLoading
    ) {
      return;
    }

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
    this.viewingCategory = null;
    this.editingCategory = null;

    this.categoryForm.reset();

    this.categoryService
      .getAdminCategoryById(category.id)
      .subscribe({

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

          console.error(
            'Load category details failed:',
            error
          );

          this.cdr.detectChanges();
        }
      });
  }

  // ================= VIEW CATEGORY =================

  viewCategory(categoryId: number): void {

    const category = this.pageCategories.find(
      item => item.id === categoryId
    );

    if (category) {
      this.openViewDetails(category);
    }
  }

  openViewDetails(category: AdminCategory): void {

    if (
      this.viewLoading ||
      this.detailLoading ||
      this.saving
    ) {
      return;
    }

    this.clearMessages();

    this.viewingCategory = null;
    this.viewLoading = true;

    this.categoryService
      .getAdminCategoryById(category.id)
      .subscribe({

        next: (details) => {

          this.viewingCategory = details;
          this.viewLoading = false;

          this.cdr.detectChanges();
        },

        error: (error) => {

          this.viewLoading = false;

          this.errorMessage =
            error.error?.message ||
            'Unable to load category details. Please try again.';

          console.error(
            'View category details failed:',
            error
          );

          this.cdr.detectChanges();
        }
      });
  }

  closeViewModal(): void {
    this.closeViewDetails();
  }

  closeViewDetails(): void {

    this.viewingCategory = null;
    this.viewLoading = false;

    this.cdr.detectChanges();
  }

  editFromView(): void {

    if (!this.viewingCategory) {
      return;
    }

    const category = this.viewingCategory;

    this.viewingCategory = null;

    this.openEditForm(category);
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
          'Unable to save category. Please try again.';

        console.error(
          'Save category failed:',
          error
        );

        this.cdr.detectChanges();
      }
    });
  }

  // ================= TOGGLE STATUS =================

  toggleActive(category: AdminCategory): void {

    if (
      this.saving ||
      this.detailLoading ||
      this.viewLoading
    ) {
      return;
    }

    this.clearMessages();

    this.detailLoading = true;

    this.categoryService
      .getAdminCategoryById(category.id)
      .subscribe({

        next: (details) => {

          const payload: CategoryRequest = {

            name: details.name,

            slug: details.slug,

            iconUrl: details.iconUrl,

            description: details.description,

            isActive: !details.isActive,

            config: details.config ?? {}
          };

          this.categoryService
            .updateCategory(category.id, payload)
            .subscribe({

              next: () => {

                this.detailLoading = false;

                this.successMessage =
                  `${category.name} ${
                    payload.isActive
                      ? 'activated'
                      : 'deactivated'
                  } successfully.`;

                this.refreshData();

                this.cdr.detectChanges();
              },

              error: (error) => {

                this.detailLoading = false;

                this.errorMessage =
                  error.error?.message ||
                  'Unable to update category status.';

                console.error(
                  'Update category status failed:',
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
            'Unable to load category details.';

          console.error(
            'Load category for status update failed:',
            error
          );

          this.cdr.detectChanges();
        }
      });
  }

  // ================= DELETE CATEGORY =================

  deleteCategory(category: AdminCategory): void {

    if (
      this.saving ||
      this.detailLoading ||
      this.viewLoading ||
      this.deleting
    ) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete ${category.name}? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    this.clearMessages();

    this.deleting = true;

    this.categoryService
      .deleteCategory(category.id)
      .subscribe({

        next: () => {

          this.deleting = false;

          this.successMessage =
            `${category.name} deleted successfully.`;

          if (
            this.pageCategories.length === 1 &&
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
            'Unable to delete category.';

          console.error(
            'Delete category failed:',
            error
          );

          this.cdr.detectChanges();
        }
      });
  }

  // ================= REFRESH =================

  refreshData(): void {

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
