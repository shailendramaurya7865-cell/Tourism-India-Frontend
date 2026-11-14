
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environments';
import { ApiResponse } from '../models/api-response.model';
import { MediaFolder } from '../../shared/models/media-folder.model';


export interface MediaUploadResponse {
    key: string;
    url: string;
    fileName: string;
    contentType: string;
    size: number;
}

@Injectable({
    providedIn: 'root'
})
export class MediaService {

    private readonly http = inject(HttpClient);

    private readonly mediaUrl =
        `${environment.apiUrl}/admin/media`;

    // ================= UPLOAD IMAGE =================

    uploadImage(file: File, folder: MediaFolder): Observable<ApiResponse<MediaUploadResponse>> {
        const formData = new FormData();

        formData.append('file', file);
        formData.append('folder', folder);

        return this.http.post<ApiResponse<MediaUploadResponse>>(
            `${this.mediaUrl}/upload`,
            formData
        );
    }

    // ================= DELETE IMAGE =================

    deleteImage(key: string): Observable<ApiResponse<void>> {

        const params = new HttpParams()
            .set('key', key);

        return this.http.delete<ApiResponse<void>>(
            this.mediaUrl,
            { params }
        );
    }
}