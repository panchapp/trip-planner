import { Injectable } from '@angular/core';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class EnvironmentService {
  readonly apiUrl = environment.apiUrl;
}
