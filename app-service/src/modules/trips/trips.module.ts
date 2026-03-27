import { TripRepository } from '@app/modules/trips/interfaces/trip.repository';
import { TripKnexRepository } from '@app/modules/trips/repositories/trip-knex.repository';
import { TripsController } from '@app/modules/trips/trips.controller';
import { TripsService } from '@app/modules/trips/trips.service';
import { Module } from '@nestjs/common';

@Module({
  controllers: [TripsController],
  providers: [TripsService, { provide: TripRepository, useClass: TripKnexRepository }],
  exports: [TripsService],
})
export class TripsModule {}
