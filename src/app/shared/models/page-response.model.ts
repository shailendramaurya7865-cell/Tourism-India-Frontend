export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number; // Zero-based current page
  numberOfElements: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}
