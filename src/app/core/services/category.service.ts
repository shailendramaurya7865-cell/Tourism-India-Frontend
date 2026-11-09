
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environments';
import { ApiResponse } from '../models/api-response.model';

import {
    AdminCategory,
    AdminCategoryDetail,
    CategoryStats,
    CategoryRequest
} from '../../features/admin/models/admin-category.model';

@Injectable({
    providedIn: 'root'
})
export class CategoryService {

    private readonly http = inject(HttpClient);
    private readonly apiUrl = environment.apiUrl;
    private readonly adminCategoriesUrl = `${environment.apiUrl}/admin/categories`;

    // ================= RESPONSE HANDLER =================

    private unwrap<T>(response: ApiResponse<T> | T): T {
        if (
            response !== null &&
            typeof response === 'object' &&
            'data' in response
        ) {
            return (response as ApiResponse<T>).data;
        }

        return response as T;
    }

    // ================= PUBLIC APIs =================

    // Get all categories
    getCategories(): Observable<AdminCategory[]> {
        return this.http
            .get<ApiResponse<AdminCategory[]> | AdminCategory[]>(
                `${this.apiUrl}/categories`
            )
            .pipe(
                map(response => this.unwrap(response) ?? [])
            );
    }

    // ================= ADMIN APIs =================

    // Get lightweight category list
    getAdminCategories(): Observable<AdminCategory[]> {
        return this.http
            .get<ApiResponse<AdminCategory[]> | AdminCategory[]>(
                this.adminCategoriesUrl
            )
            .pipe(
                map(response => this.unwrap(response) ?? [])
            );
    }

    // Get complete category details
    getAdminCategoryById(id: number): Observable<AdminCategoryDetail> {
        return this.http
            .get<ApiResponse<AdminCategoryDetail> | AdminCategoryDetail>(
                `${this.adminCategoriesUrl}/${id}`
            )
            .pipe(
                map(response => this.unwrap(response))
            );
    }

    // Get category statistics
    getCategoryStats(): Observable<CategoryStats> {
        return this.http
            .get<ApiResponse<CategoryStats> | CategoryStats>(
                `${this.adminCategoriesUrl}/stats`
            )
            .pipe(
                map(response => this.unwrap(response))
            );
    }

    // Create category
    createCategory(payload: CategoryRequest): Observable<AdminCategoryDetail> {
        return this.http
            .post<ApiResponse<AdminCategoryDetail> | AdminCategoryDetail>(
                this.adminCategoriesUrl,
                payload
            )
            .pipe(
                map(response => this.unwrap(response))
            );
    }

    // Update category
    updateCategory(
        id: number,
        payload: CategoryRequest
    ): Observable<AdminCategoryDetail> {
        return this.http
            .put<ApiResponse<AdminCategoryDetail> | AdminCategoryDetail>(
                `${this.adminCategoriesUrl}/${id}`,
                payload
            )
            .pipe(
                map(response => this.unwrap(response))
            );
    }

    // Delete category
    deleteCategory(id: number): Observable<void> {
        return this.http.delete<void>(
            `${this.adminCategoriesUrl}/${id}`
        );
    }
}
