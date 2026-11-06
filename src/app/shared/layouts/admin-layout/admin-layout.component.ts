
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive
  ],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css'
})
export class AdminLayoutComponent {

  navigation = [
    {
      heading: '',
      items: [
        { label: 'Dashboard', icon: '▦', route: '/admin/dashboard' }
      ]
    },
    {
      heading: 'DESTINATIONS',
      items: [
        { label: 'States', icon: '♟', route: '/admin/states' },
        { label: 'Cities', icon: '▥', route: '/admin/cities' },
        { label: 'Tourist Places', icon: '♦', route: '/admin/tourist-places' },
        { label: 'Categories', icon: '▦', route: '/admin/categories' }
      ]
    },
    {
      heading: 'USER MANAGEMENT',
      items: [
        { label: 'Users', icon: '♟', route: '/admin/users' },
        { label: 'Roles & Permissions', icon: '♙', route: '/admin/roles' }
      ]
    },
    {
      heading: 'SYSTEM',
      items: [
        { label: 'Settings', icon: '⚙', route: '/admin/settings' }
      ]
    }
  ];

}
