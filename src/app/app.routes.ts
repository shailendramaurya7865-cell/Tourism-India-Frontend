import { Routes } from '@angular/router';
import { adminAuthGuard } from './core/guards/admin-auth.guard';

export const routes: Routes = [

  // PUBLIC WEBSITE
  {
    path: '',
    loadComponent: () =>
      import('./shared/layouts/public-layout/public-layout.component')
        .then(m => m.PublicLayoutComponent),

    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/home/home.component')
            .then(m => m.HomeComponent)
      },
      {
        path: 'states',
        loadComponent: () =>
          import('./features/states/states-list.component')
            .then(m => m.StatesListComponent)
      },
      {
        path: 'states/:id',
        loadComponent: () =>
          import('./features/state-detail/state-detail.component')
            .then(m => m.StateDetailComponent)
      },
      {
        path: 'cities',
        loadComponent: () =>
          import('./features/cities/city-list.component')
            .then(m => m.CitiesListComponent)
      },
      {
        path: 'cities/:id',
        loadComponent: () =>
          import('./features/city-detail/city-detail.component')
            .then(m => m.CityDetailComponent)
      },
      {
        path: 'tourist-places',
        loadComponent: () =>
          import('./features/tourist-places/tourist-place-list.component')
            .then(m => m.TouristPlacesListComponent)
      },
      {
        path: 'tourist-places/:id',
        loadComponent: () =>
          import('./features/tourist-place-detail/tourist-place-detail.component')
            .then(m => m.TouristPlaceDetailComponent)
      },
      {
        path: 'explore-category/:slug',
        loadComponent: () =>
          import('./features/categories/explore-category.component')
            .then(m => m.ExploreCategoryComponent)
      },
      {
        path: 'login',
        loadComponent: () =>
          import('./features/login/login.component')
            .then(m => m.LoginComponent)
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile.component')
            .then(m => m.ProfileComponent)
      }
    ]
  },

  // ADMIN WEBSITE
  {
    path: 'admin',
    canActivate: [adminAuthGuard],

    loadComponent: () =>
      import('./shared/layouts/admin-layout/admin-layout.component')
        .then(m => m.AdminLayoutComponent),

    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/admin/dashboard/admin-dashboard.component')
            .then(m => m.AdminDashboardComponent)
      },

      {
        path: 'states',
        loadComponent: () =>
          import('./features/admin/state-management/state-management.component')
            .then(m => m.StateManagementComponent)
      },
      {
        path: 'cities',
        loadComponent: () =>
          import('./features/admin/city-management/city-management.component')
            .then(m => m.CityManagementComponent)
      },
      {
        path: 'categories',
        loadComponent: () =>
          import('./features/admin/category-management/category-management.component')
            .then(m => m.CategoryManagementComponent)
      }


      // Add other admin child routes when their components are ready.
    ]
  },

  // FALLBACK
  {
    path: '**',
    redirectTo: ''
  }
];