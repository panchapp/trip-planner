import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { EnvironmentService } from '@env/environment.service';
import type {
  CreateTripPayload,
  Trip,
  TripListQuery,
  UpdateTripPayload,
} from '@shared/models/trip.model';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TripService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(EnvironmentService);

  private readonly baseUrl = `${this.env.apiUrl}/trips`;

  getTrips(query?: TripListQuery): Observable<Trip[]> {
    return this.http.get<Trip[]>(this.baseUrl, {
      params: this.toParams(query),
      withCredentials: true,
    });
  }

  getTrip(id: string): Observable<Trip> {
    return this.http.get<Trip>(`${this.baseUrl}/${id}`, { withCredentials: true });
  }

  createTrip(body: CreateTripPayload): Observable<Trip> {
    return this.http.post<Trip>(this.baseUrl, body, { withCredentials: true });
  }

  updateTrip(id: string, body: UpdateTripPayload): Observable<Trip> {
    return this.http.patch<Trip>(`${this.baseUrl}/${id}`, body, { withCredentials: true });
  }

  deleteTrip(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`, { withCredentials: true });
  }

  private toParams(query?: TripListQuery): HttpParams {
    let params = new HttpParams();
    if (!query) return params;
    if (query.limit != null) params = params.set('limit', String(query.limit));
    if (query.offset != null) params = params.set('offset', String(query.offset));
    if (query.status != null) params = params.set('status', query.status);
    if (query.category != null) params = params.set('category', query.category);
    return params;
  }
}
