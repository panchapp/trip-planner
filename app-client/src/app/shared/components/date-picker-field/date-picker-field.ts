import {
  CdkConnectedOverlay,
  CdkOverlayOrigin,
  type ConnectedPosition,
  Overlay,
  type ScrollStrategy,
  STANDARD_DROPDOWN_BELOW_POSITIONS,
} from '@angular/cdk/overlay';
import { NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { LucideCalendar, LucideChevronLeft, LucideChevronRight } from '@lucide/angular';
import { toYmdLocal } from '@shared/utils/trip-date.utils';

interface DatePickerCell {
  readonly dateStr: string;
  readonly label: number;
  readonly muted: boolean;
  readonly disabled: boolean;
  readonly isToday: boolean;
  readonly isSelected: boolean;
}

@Component({
  selector: 'app-date-picker-field',
  templateUrl: './date-picker-field.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgClass,
    CdkOverlayOrigin,
    CdkConnectedOverlay,
    LucideCalendar,
    LucideChevronLeft,
    LucideChevronRight,
  ],
})
export class DatePickerField {
  readonly overlay = inject(Overlay);

  readonly inputId = input.required<string>();
  readonly value = input<string>('');
  readonly minDate = input<string | null>(null);
  readonly maxDate = input<string | null>(null);

  readonly valueChange = output<string>();

  readonly open = signal(false);
  readonly viewMonth = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  readonly displayText = computed(() => {
    const v = this.value();
    if (!v) return '';
    const parts = v.split('-').map(Number);
    if (parts.length !== 3) return '';
    const [y, m, d] = parts;
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(y, m - 1, d));
  });

  readonly monthTitle = computed(() =>
    new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(this.viewMonth()),
  );

  readonly todayDisabled = computed(() => {
    const t = toYmdLocal(new Date());
    return this.isOutOfRange(t, this.minDate(), this.maxDate());
  });

  readonly calendarRows = computed(() => {
    const min = this.minDate();
    const max = this.maxDate();
    const vm = this.viewMonth();
    const year = vm.getFullYear();
    const month = vm.getMonth();
    const first = new Date(year, month, 1);
    const startPad = first.getDay();
    const cells: DatePickerCell[] = [];
    const cur = new Date(year, month, 1 - startPad);
    const today = toYmdLocal(new Date());
    const selected = this.value();

    for (let i = 0; i < 42; i++) {
      const muted = cur.getMonth() !== month;
      const dateStr = toYmdLocal(cur);
      const disabled = this.isOutOfRange(dateStr, min, max);
      cells.push({
        dateStr,
        muted,
        disabled,
        label: cur.getDate(),
        isToday: dateStr === today,
        isSelected: dateStr === selected,
      });
      cur.setDate(cur.getDate() + 1);
    }

    const rows: DatePickerCell[][] = [];
    for (let r = 0; r < 6; r++) {
      rows.push(cells.slice(r * 7, r * 7 + 7));
    }
    return rows;
  });

  readonly panelWidthPx = 480;
  readonly scrollStrategy: ScrollStrategy = this.overlay.scrollStrategies.reposition();
  readonly overlayPositions: ConnectedPosition[] = [...STANDARD_DROPDOWN_BELOW_POSITIONS];

  toggle(event: MouseEvent): void {
    event.stopPropagation();
    if (this.open()) {
      this.open.set(false);
      return;
    }
    const v = this.value();
    if (v) {
      const parts = v.split('-').map(Number);
      if (parts.length === 3) {
        const [y, m] = parts;
        this.viewMonth.set(new Date(y, m - 1, 1));
      }
    } else {
      const n = new Date();
      this.viewMonth.set(new Date(n.getFullYear(), n.getMonth(), 1));
    }
    this.open.set(true);
  }

  closeOverlay(): void {
    this.open.set(false);
  }

  prevMonth(): void {
    const d = this.viewMonth();
    this.viewMonth.set(new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }

  nextMonth(): void {
    const d = this.viewMonth();
    this.viewMonth.set(new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  selectDay(cell: DatePickerCell): void {
    if (cell.disabled) return;
    this.valueChange.emit(cell.dateStr);
    this.open.set(false);
  }

  clear(): void {
    this.valueChange.emit('');
    this.open.set(false);
  }

  pickToday(): void {
    if (this.todayDisabled()) return;
    this.valueChange.emit(toYmdLocal(new Date()));
    this.open.set(false);
  }

  /** Registers document Escape only while the overlay is open (no global listener when closed). */
  private readonly escapeWhileOpen = effect((onCleanup) => {
    if (!this.open()) return;
    const handler = (ev: KeyboardEvent): void => {
      if (ev.key === 'Escape') {
        this.open.set(false);
      }
    };
    document.addEventListener('keydown', handler);
    onCleanup(() => document.removeEventListener('keydown', handler));
  });

  private isOutOfRange(dateStr: string, min: string | null, max: string | null): boolean {
    if (min && dateStr < min) return true;
    if (max && dateStr > max) return true;
    return false;
  }
}
