import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./features/home/home.component').then(
        (m) => m.HomeComponent
      )
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
    path: 'cities/:id',
    loadComponent: () =>
      import('./features/city-detail/city-detail.component')
        .then(m => m.CityDetailComponent)
  },
  {
    path: 'cities',
    loadComponent: () =>
      import('./features/cities/city-list.component')
        .then(m => m.CitiesListComponent)
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
    path: '**',
    redirectTo: ''
  }
];