import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  FormControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { QrCode } from '../../components/qr-code/qr-code';
import { WhiskyFields } from '../../components/whisky-fields/whisky-fields';
import { TastingRound } from '../../models/whisky.models';
import { TastingService } from '../../services/tasting.service';
import { copyToClipboard, joinUrlFor } from '../../utils/share';
import { createWhiskyProfileGroup } from '../../utils/whisky-form';

@Component({
  selector: 'app-admin-create',
  imports: [ReactiveFormsModule, RouterLink, DatePipe, QrCode, WhiskyFields],
  templateUrl: './admin-create.html',
  styleUrl: './admin-create.scss',
})
export class AdminCreate {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly tastingService = inject(TastingService);

  protected readonly labelControl: FormControl<string> = this.fb.control('');
  protected readonly bottleForm = createWhiskyProfileGroup(this.fb);

  protected readonly createdRound = signal<TastingRound | null>(null);
  protected readonly showQr = signal(false);
  protected readonly copied = signal(false);
  protected readonly previousRounds = signal<TastingRound[]>([]);
  /** Round awaiting delete confirmation; non-null while the modal is open. */
  protected readonly pendingDelete = signal<TastingRound | null>(null);

  constructor() {
    this.loadRounds();
  }

  protected saveBottle(): void {
    if (this.bottleForm.invalid) {
      this.bottleForm.markAllAsTouched();
      return;
    }
    this.tastingService
      .createRound(this.bottleForm.getRawValue(), this.labelControl.value.trim())
      .subscribe((round) => {
        this.createdRound.set(round);
        this.showQr.set(false);
        this.copied.set(false);
        this.loadRounds();
      });
  }

  protected joinUrl(round: TastingRound): string {
    return joinUrlFor(round.id);
  }

  protected async copyLink(round: TastingRound): Promise<void> {
    await copyToClipboard(this.joinUrl(round));
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }

  protected confirmDelete(): void {
    const round = this.pendingDelete();
    if (!round) {
      return;
    }
    this.tastingService.deleteRound(round.id).subscribe(() => {
      this.pendingDelete.set(null);
      if (this.createdRound()?.id === round.id) {
        this.createdRound.set(null);
      }
      this.loadRounds();
    });
  }

  protected startNewRound(): void {
    this.createdRound.set(null);
    this.showQr.set(false);
    this.bottleForm.reset();
    this.labelControl.reset();
  }

  private loadRounds(): void {
    this.tastingService
      .getRounds()
      .subscribe((rounds) => this.previousRounds.set(rounds));
  }
}
