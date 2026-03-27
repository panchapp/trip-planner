import type { User } from '@app/modules/auth/entities/user';
import { CreateTripDto } from '@app/modules/trips/dto/create-trip.dto';
import { TripQueryDto } from '@app/modules/trips/dto/trip-query.dto';
import { UpdateTripDto } from '@app/modules/trips/dto/update-trip.dto';
import { TripsService } from '@app/modules/trips/trips.service';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

@Controller('trips')
@UseGuards(JwtAuthGuard)
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: User, @Body() dto: CreateTripDto) {
    return this.tripsService.create(user, dto);
  }

  @Get()
  findAll(@CurrentUser() user: User, @Query() query: TripQueryDto) {
    return this.tripsService.findAll(user, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.tripsService.findOne(user, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTripDto,
  ) {
    return this.tripsService.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.tripsService.remove(user, id);
  }
}
