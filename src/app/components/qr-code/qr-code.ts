import {
  Component,
  ElementRef,
  effect,
  input,
  viewChild,
} from '@angular/core';
import QRCode from 'qrcode';

/**
 * Renders a QR code for the given data string onto a canvas.
 * Styled in parchment-on-dark to match the whisky theme while keeping
 * enough contrast for reliable scanning.
 */
@Component({
  selector: 'app-qr-code',
  template: '<canvas #canvas class="qr-canvas" aria-label="QR code"></canvas>',
  styles: `
    :host {
      display: inline-block;
      line-height: 0;
    }
    .qr-canvas {
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    }
  `,
})
export class QrCode {
  readonly data = input.required<string>();
  readonly size = input(232);

  private readonly canvas =
    viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  constructor() {
    effect(() => {
      QRCode.toCanvas(this.canvas().nativeElement, this.data(), {
        width: this.size(),
        margin: 2,
        errorCorrectionLevel: 'M',
        color: { dark: '#1a1208', light: '#f6ead0' },
      }).catch((err: unknown) => console.error('QR render failed', err));
    });
  }
}
