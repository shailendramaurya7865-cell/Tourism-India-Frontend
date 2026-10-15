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
    path: '**',
    redirectTo: ''
  }
];