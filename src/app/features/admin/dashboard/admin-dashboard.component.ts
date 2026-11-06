
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent {

  // Dashboard statistics (dummy data)
  stats = [
    {
      title: 'Total States',
      value: '28',
      change: '+2 this month',
      icon: 'map',
      color: 'blue'
    },
    {
      title: 'Total Cities',
      value: '156',
      change: '+8 this month',
      icon: 'city',
      color: 'green'
    },
    {
      title: 'Tourist Places',
      value: '1,248',
      change: '+42 this month',
      icon: 'location',
      color: 'orange'
    },
    {
      title: 'Active Users',
      value: '12,450',
      change: '+18% this month',
      icon: 'users',
      color: 'purple'
    },
    {
      title: 'Pending Reviews',
      value: '24',
      change: '+6 new',
      icon: 'star',
      color: 'yellow'
    }
  ];

  // Sidebar navigation
  navigation = [
    {
      heading: '',
      items: [
        { label: 'Dashboard', icon: 'dashboard', active: true }
      ]
    },
    {
      heading: 'DESTINATIONS',
      items: [
        { label: 'States', icon: 'map', active: false },
        { label: 'Cities', icon: 'city', active: false },
        { label: 'Tourist Places', icon: 'location', active: false },
        { label: 'Categories', icon: 'category', active: false }
      ]
    },
    {
      heading: 'CONTENT MANAGEMENT',
      items: [
        { label: 'Hero Banners', icon: 'image', active: false },
        { label: 'Featured Destinations', icon: 'star', active: false },
        { label: 'Trending Places', icon: 'trending', active: false },
        { label: 'Events & Festivals', icon: 'calendar', active: false },
        { label: 'Media Gallery', icon: 'gallery', active: false },
        { label: 'Pages & Content', icon: 'document', active: false },
        { label: 'Reviews & Ratings', icon: 'review', active: false }
      ]
    },
    {
      heading: 'USER MANAGEMENT',
      items: [
        { label: 'Users', icon: 'users', active: false },
        { label: 'Roles & Permissions', icon: 'shield', active: false }
      ]
    },
    {
      heading: 'ANALYTICS',
      items: [
        { label: 'Website Analytics', icon: 'chart', active: false },
        { label: 'User Activity', icon: 'activity', active: false },
        { label: 'Search Insights', icon: 'search', active: false }
      ]
    },
    {
      heading: 'SYSTEM',
      items: [
        { label: 'Settings', icon: 'settings', active: false },
        { label: 'Help & Support', icon: 'help', active: false }
      ]
    }
  ];

  // Recent destinations
  recentDestinations = [
    {
      name: 'Solang Valley',
      location: 'Manali, Himachal Pradesh',
      image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=500',
      status: 'Published',
      added: '2 days ago'
    },
    {
      name: 'Hidimba Devi Temple',
      location: 'Manali, Himachal Pradesh',
      image: 'https://images.unsplash.com/photo-1606293926075-69a00dbfde81?w=500',
      status: 'Published',
      added: '3 days ago'
    },
    {
      name: 'Baga Beach',
      location: 'Goa',
      image: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=500',
      status: 'Published',
      added: '5 days ago'
    },
    {
      name: 'Mehrangarh Fort',
      location: 'Jodhpur, Rajasthan',
      image: 'https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?w=500',
      status: 'Published',
      added: '1 week ago'
    }
  ];

  // Most viewed destinations
  topDestinations = [
    { name: 'Taj Mahal', location: 'Agra, Uttar Pradesh', views: '125,430' },
    { name: 'Manali', location: 'Himachal Pradesh', views: '98,210' },
    { name: 'Jaipur', location: 'Rajasthan', views: '76,540' },
    { name: 'Goa', location: 'Goa', views: '64,320' },
    { name: 'Varanasi', location: 'Uttar Pradesh', views: '58,910' }
  ];

  // Content approval queue
  approvalQueue = [
    {
      title: 'Rishikesh Adventure Guide',
      type: 'Blog Post',
      time: '2 hours ago'
    },
    {
      title: 'Coorg Travel Guide',
      type: 'Destination',
      time: '5 hours ago'
    },
    {
      title: 'Mysore Palace',
      type: 'Destination',
      time: '1 day ago'
    },
    {
      title: 'Kedarnath Yatra Tips',
      type: 'Blog Post',
      time: '1 day ago'
    }
  ];

  // User management
  users = [
    { name: 'Priya Sharma', email: 'priya@gmail.com', role: 'Editor', status: 'Active', initials: 'PS' },
    { name: 'Rahul Mehta', email: 'rahul@tourism.in', role: 'Content Manager', status: 'Active', initials: 'RM' },
    { name: 'Ananya Singh', email: 'ananya@gmail.com', role: 'Editor', status: 'Inactive', initials: 'AS' },
    { name: 'Vikram Rao', email: 'vikram@tourism.in', role: 'Admin', status: 'Active', initials: 'VR' },
    { name: 'Neha Kapoor', email: 'neha@tourism.in', role: 'Content Manager', status: 'Active', initials: 'NK' }
  ];

  // Content management
  contents = [
    { title: 'Kerala Backwaters', type: 'Destination', location: 'Kerala', status: 'Published' },
    { title: 'Hampi Ruins', type: 'Destination', location: 'Karnataka', status: 'Published' },
    { title: 'Kutch White Rann', type: 'Destination', location: 'Gujarat', status: 'Draft' },
    { title: 'Tawang Monastery', type: 'Destination', location: 'Arunachal Pradesh', status: 'Published' },
    { title: 'Andaman Islands', type: 'Destination', location: 'Andaman & Nicobar', status: 'Published' }
  ];

  // Visitors by region
  regions = [
    { name: 'Uttar Pradesh', percentage: 22 },
    { name: 'Maharashtra', percentage: 14 },
    { name: 'Tamil Nadu', percentage: 10 },
    { name: 'Rajasthan', percentage: 9 },
    { name: 'Karnataka', percentage: 8 },
    { name: 'Other States', percentage: 37 }
  ];

  // Quick actions
  quickActions = [
    { label: 'Add Tourist Place', icon: 'location' },
    { label: 'Add City', icon: 'city' },
    { label: 'Add State', icon: 'map' },
    { label: 'Upload Media', icon: 'image' },
    { label: 'Manage Featured Places', icon: 'star' },
    { label: 'Add Event / Festival', icon: 'calendar' },
    { label: 'Manage Pages', icon: 'document' }
  ];

  selectedPeriod = 'Last 30 Days';

  setActiveMenu(selectedItem: any): void {
    this.navigation.forEach(group => {
      group.items.forEach(item => item.active = false);
    });

    selectedItem.active = true;
  }

}
