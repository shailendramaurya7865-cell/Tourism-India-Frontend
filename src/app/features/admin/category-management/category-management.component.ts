
import { Component, OnInit, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Observable, of, switchMap, map, finalize } from 'rxjs';
import { CategoryService } from '../../../core/services/category.service';
import { MediaService } from '../../../core/services/media.service';
import { AdminCategory, AdminCategoryDetail, CategoryStats, CategoryRequest } from '../../../features/admin/models/admin-category.model';
import { MediaFolder } from '../../../shared/models/media-folder.model';
import { PageResponse } from '../../../shared/models/page-response.model';

@Component({
  selector: 'app-category-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './category-management.component.html',
  styleUrl: './category-management.component.css'
})
export class CategoryManagementComponent implements OnInit, OnDestroy {
  private readonly categoryService = inject(CategoryService);
  private readonly mediaService = inject(MediaService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly mediaFolder: MediaFolder = 'CATEGORIES';
  private reloadAfterLoad = false;

  readonly maxImageSize = 5 * 1024 * 1024;
  readonly allowedImageTypes = ['image/png', 'image/jpeg', 'image/webp'];
  readonly pageSizeOptions = [5, 10, 20, 50];
  readonly Math = Math;

  categories: AdminCategory[] = [];
  private pageCategories: AdminCategory[] = [];

  stats: CategoryStats = {
    totalCategories: 0,
    activeCategories: 0,
    inactiveCategories: 0,
    categoriesWithPlaces: 0
  };

  currentPage = 0;
  pageSize = 10;
  totalPages = 0;
  totalElements = 0;

  loading = false;
  saving = false;
  detailLoading = false;
  viewLoading = false;
  deleting = false;

  errorMessage = '';
  successMessage = '';
  searchTerm = '';

  showForm = false;
  editingCategory: AdminCategoryDetail | null = null;
  viewingCategory: AdminCategoryDetail | null = null;

  selectedIconFile: File | null = null;
  imagePreviewUrl: string | null = null;
  private previewObjectUrl: string | null = null;

  readonly categoryForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    slug: ['', Validators.maxLength(255)],
    iconUrl: ['', Validators.maxLength(1000)],
    description: [''],
    isActive: [true]
  });

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, index) => index);
  }

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

  get nameControl() {
    return this.categoryForm.controls.name;
  }

  get slugControl() {
    return this.categoryForm.controls.slug;
  }

  ngOnInit(): void {
    this.refreshData();
  }

  ngOnDestroy(): void {
    this.clearImagePreview();
  }

  // =====================================================
  // CHANGE DETECTION
  // =====================================================

  private updateView(): void {
    this.cdr.detectChanges();
  }

  // =====================================================
  // LOAD CATEGORIES
  // =====================================================

  loadCategories(): void {
    if (this.loading) return;

    this.loading = true;
    this.errorMessage = '';
    this.updateView();

    this.categoryService.getAdminCategories(this.currentPage, this.pageSize)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.updateView();

          // Reload after moving to the previous valid page.
          if (this.reloadAfterLoad) {
            this.reloadAfterLoad = false;
            this.loadCategories();
          }
        })
      )
      .subscribe({
        next: (response: PageResponse<AdminCategory>) => {
          const content = response?.content ?? [];

          this.pageCategories = content;
          this.totalElements = response?.totalElements ?? content.length;
          this.totalPages = response?.totalPages ?? Math.ceil(this.totalElements / this.pageSize);

          // Handle deletion of the last item on the current page.
          if (this.totalPages > 0 && this.currentPage >= this.totalPages) {
            this.currentPage = this.totalPages - 1;
            this.reloadAfterLoad = true;
            return;
          }

          if (this.totalPages === 0) {
            this.currentPage = 0;
          }

          this.applySearch();
          this.updateView();
        },
        error: error => {
          this.pageCategories = [];
          this.categories = [];
          this.totalElements = 0;
          this.totalPages = 0;
          this.errorMessage = this.getErrorMessage(error, 'Unable to load categories. Please try again.');
          console.error('Load categories failed:', error);
          this.updateView();
        }
      });
  }

  // =====================================================
  // LOAD STATISTICS
  // =====================================================

  loadCategoryStats(): void {
    this.categoryService.getCategoryStats()
      .pipe(finalize(() => this.updateView()))
      .subscribe({
        next: stats => {
          this.stats = stats;
          this.updateView();
        },
        error: error => {
          console.error('Load category statistics failed:', error);
          this.updateView();
        }
      });
  }

  // =====================================================
  // SEARCH
  // =====================================================

  applySearch(): void {
    const term = this.searchTerm.trim().toLowerCase();

    if (!term) {
      this.categories = [...this.pageCategories];
      return;
    }

    this.categories = this.pageCategories.filter(category => {
      const name = String(category.name ?? '').toLowerCase();
      const slug = String(category.slug ?? '').toLowerCase();
      return name.includes(term) || slug.includes(term);
    });
  }

  onSearchChange(): void {
    this.applySearch();
  }

  // =====================================================
  // PAGINATION
  // =====================================================

  goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages || page === this.currentPage || this.loading) return;

    this.currentPage = page;
    this.loadCategories();
  }

  previousPage(): void {
    if (this.currentPage > 0) this.goToPage(this.currentPage - 1);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) this.goToPage(this.currentPage + 1);
  }

  changePageSize(size: number | string): void {
    const newSize = Number(size);

    if (!Number.isInteger(newSize) || newSize < 1 || this.loading) return;

    this.pageSize = newSize;
    this.currentPage = 0;
    this.loadCategories();
  }

  onPageSizeChange(size: number | string): void {
    this.changePageSize(size);
  }

  // =====================================================
  // IMAGE SELECTION
  // =====================================================

  onIconSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    this.clearMessages();

    if (!this.allowedImageTypes.includes(file.type)) {
      this.errorMessage = 'Please select a PNG, JPG or WebP image.';
      input.value = '';
      this.updateView();
      return;
    }

    if (file.size > this.maxImageSize) {
      this.errorMessage = 'Image size must not exceed 5 MB.';
      input.value = '';
      this.updateView();
      return;
    }

    this.clearImagePreview();
    this.selectedIconFile = file;
    this.previewObjectUrl = URL.createObjectURL(file);
    this.imagePreviewUrl = this.previewObjectUrl;
    this.updateView();
  }

  removeSelectedIcon(): void {
    this.selectedIconFile = null;
    this.clearImagePreview();
    this.categoryForm.patchValue({ iconUrl: '' });
    this.resetFileInput();
    this.updateView();
  }

  private clearImagePreview(): void {
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
    }

    this.previewObjectUrl = null;
    this.imagePreviewUrl = null;
  }

  private resetImageSelection(): void {
    this.selectedIconFile = null;
    this.clearImagePreview();
    this.resetFileInput();
  }

  private resetFileInput(): void {
    const input = document.getElementById('categoryIcon') as HTMLInputElement | null;
    if (input) input.value = '';
  }

  // =====================================================
  // ADD CATEGORY
  // =====================================================

  openAddForm(): void {
    if (this.saving || this.detailLoading || this.viewLoading) return;

    this.resetImageSelection();
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
    this.updateView();
  }

  // =====================================================
  // EDIT CATEGORY
  // =====================================================

  openEditForm(category: AdminCategory): void {
    if (this.detailLoading || this.saving || this.viewLoading) return;

    this.clearMessages();
    this.resetImageSelection();
    this.detailLoading = true;
    this.showForm = false;
    this.viewingCategory = null;
    this.editingCategory = null;
    this.categoryForm.reset();
    this.updateView();

    this.categoryService.getAdminCategoryById(category.id)
      .pipe(
        finalize(() => {
          this.detailLoading = false;
          this.updateView();
        })
      )
      .subscribe({
        next: details => {
          this.editingCategory = details;
          this.categoryForm.patchValue({
            name: details.name,
            slug: details.slug ?? '',
            iconUrl: details.iconUrl ?? '',
            description: details.description ?? '',
            isActive: details.isActive
          });

          this.imagePreviewUrl = details.iconUrl ?? null;
          this.showForm = true;
          this.updateView();
        },
        error: error => {
          this.errorMessage = this.getErrorMessage(error, 'Unable to load category details. Please try again.');
          console.error('Load category details failed:', error);
          this.updateView();
        }
      });
  }

  // =====================================================
  // VIEW CATEGORY
  // =====================================================

  viewCategory(categoryId: number): void {
    const category = this.pageCategories.find(item => item.id === categoryId);
    if (category) this.openViewDetails(category);
  }

  openViewDetails(category: AdminCategory): void {
    if (this.viewLoading || this.detailLoading || this.saving) return;

    this.clearMessages();
    this.viewingCategory = null;
    this.viewLoading = true;
    this.updateView();

    this.categoryService.getAdminCategoryById(category.id)
      .pipe(
        finalize(() => {
          this.viewLoading = false;
          this.updateView();
        })
      )
      .subscribe({
        next: details => {
          this.viewingCategory = details;
          this.updateView();
        },
        error: error => {
          this.errorMessage = this.getErrorMessage(error, 'Unable to load category details. Please try again.');
          console.error('View category failed:', error);
          this.updateView();
        }
      });
  }

  closeViewModal(): void {
    this.closeViewDetails();
  }

  closeViewDetails(): void {
    this.viewingCategory = null;
    this.viewLoading = false;
    this.updateView();
  }

  editFromView(): void {
    if (!this.viewingCategory) return;

    const category = this.viewingCategory;
    this.viewingCategory = null;
    this.openEditForm(category);
  }

  // =====================================================
  // CLOSE FORM
  // =====================================================

  closeFormModal(): void {
    this.closeForm();
  }

  closeForm(): void {
    if (this.saving || this.detailLoading) return;

    this.showForm = false;
    this.editingCategory = null;
    this.resetImageSelection();
    this.categoryForm.reset();
    this.updateView();
  }

  // =====================================================
  // IMAGE UPLOAD
  // =====================================================

  private uploadImageIfSelected(): Observable<string | null> {
    if (!this.selectedIconFile) {
      return of(this.categoryForm.get('iconUrl')?.value?.trim() || null);
    }

    return this.mediaService.uploadImage(this.selectedIconFile, this.mediaFolder)
      .pipe(
        map(response => {
          if (!response.success || !response.data?.url) {
            throw new Error(response.message || 'Image upload failed.');
          }

          return response.data.url;
        })
      );
  }

  // =====================================================
  // SAVE CATEGORY
  // =====================================================

  saveCategory(): void {
    if (this.categoryForm.invalid || this.saving) {
      this.categoryForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.clearMessages();
    this.updateView();

    const categoryId = this.editingCategory?.id;
    const isEditing = categoryId != null;

    this.uploadImageIfSelected()
      .pipe(
        switchMap(iconUrl => {
          const formValue = this.categoryForm.getRawValue();

          const payload: CategoryRequest = {
            name: formValue.name?.trim() ?? '',
            slug: formValue.slug?.trim() || null,
            iconUrl,
            description: formValue.description?.trim() || null,
            isActive: formValue.isActive ?? true,
            config: this.editingCategory?.config ?? {}
          };

          return isEditing
            ? this.categoryService.updateCategory(categoryId!, payload)
            : this.categoryService.createCategory(payload);
        }),
        finalize(() => {
          this.saving = false;
          this.updateView();
        })
      )
      .subscribe({
        next: () => {
          this.showForm = false;
          this.editingCategory = null;
          this.successMessage = isEditing ? 'Category updated successfully.' : 'Category added successfully.';
          this.resetImageSelection();
          this.categoryForm.reset();

          if (!isEditing) this.currentPage = 0;

          this.updateView();
          this.refreshData();
        },
        error: error => {
          this.errorMessage = this.getErrorMessage(error, 'Unable to save category. Please try again.');
          console.error('Save category failed:', error);
          this.updateView();
        }
      });
  }

  // =====================================================
  // TOGGLE CATEGORY STATUS
  // =====================================================

  toggleActive(category: AdminCategory): void {
    if (this.saving || this.detailLoading || this.viewLoading) return;

    this.clearMessages();
    this.detailLoading = true;
    this.updateView();

    this.categoryService.getAdminCategoryById(category.id)
      .pipe(
        switchMap(details => {
          const payload: CategoryRequest = {
            name: details.name,
            slug: details.slug,
            iconUrl: details.iconUrl,
            description: details.description,
            isActive: !details.isActive,
            config: details.config ?? {}
          };

          return this.categoryService.updateCategory(category.id, payload)
            .pipe(map(() => payload));
        }),
        finalize(() => {
          this.detailLoading = false;
          this.updateView();
        })
      )
      .subscribe({
        next: payload => {
          this.successMessage = `${category.name} ${payload.isActive ? 'activated' : 'deactivated'} successfully.`;
          this.updateView();
          this.refreshData();
        },
        error: error => {
          this.errorMessage = this.getErrorMessage(error, 'Unable to update category status.');
          console.error('Update category status failed:', error);
          this.updateView();
        }
      });
  }

  // =====================================================
  // DELETE CATEGORY
  // =====================================================

  deleteCategory(category: AdminCategory): void {
    if (this.saving || this.detailLoading || this.viewLoading || this.deleting) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${category.name}? This action cannot be undone.`
    );

    if (!confirmed) return;

    this.clearMessages();
    this.deleting = true;
    this.updateView();

    this.categoryService.deleteCategory(category.id)
      .pipe(
        finalize(() => {
          this.deleting = false;
          this.updateView();
        })
      )
      .subscribe({
        next: () => {
          this.successMessage = `${category.name} deleted successfully.`;

          if (this.pageCategories.length === 1 && this.currentPage > 0) {
            this.currentPage--;
          }

          this.updateView();
          this.refreshData();
        },
        error: error => {
          this.errorMessage = this.getErrorMessage(error, 'Unable to delete category.');
          console.error('Delete category failed:', error);
          this.updateView();
        }
      });
  }

  // =====================================================
  // REFRESH
  // =====================================================

  refreshData(): void {
    this.loadCategories();
    this.loadCategoryStats();
  }

  // =====================================================
  // MESSAGES
  // =====================================================

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  private getErrorMessage(error: any, fallback: string): string {
    return error?.error?.message || error?.message || fallback;
  }
}
