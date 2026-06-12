import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { busOutline, logoGithub, openOutline } from 'ionicons/icons';
import { LanguageService } from '../../core/language.service';
import { LangPillComponent } from '../../shared/lang-pill.component';

const STACK = [
  'Ionic 8', 'Angular 20', '.NET 9', 'SQL Server', 'EF Core', 'SignalR', 'Leaflet', 'JWT', 'Azure',
];

@Component({
  selector: 'app-about',
  templateUrl: './about.page.html',
  styleUrl: './about.page.scss',
  imports: [RouterLink, IonContent, IonIcon, LangPillComponent],
})
export class AboutPage {
  readonly lang = inject(LanguageService);
  readonly stack = STACK;

  constructor() {
    addIcons({ busOutline, logoGithub, openOutline });
  }
}
