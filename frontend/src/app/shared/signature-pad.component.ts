import { AfterViewInit, Component, ElementRef, Input, OnDestroy, ViewChild, output, signal } from '@angular/core';

/**
 * Hand-rolled signature canvas (no libs). Draws with pointer events,
 * exports a PNG data URL via value(). Scales for devicePixelRatio.
 */
@Component({
  selector: 'app-signature-pad',
  template: `
    <div class="pad" [class.signed]="hasInk()">
      <canvas #canvas
        (pointerdown)="start($event)"
        (pointermove)="move($event)"
        (pointerup)="end()"
        (pointercancel)="end()"
        (pointerleave)="end()"></canvas>
      @if (!hasInk()) {
        <span class="hint mono">{{ hint }}</span>
      }
    </div>
  `,
  styles: [`
    .pad {
      position: relative;
      border: 1px dashed var(--deep-600);
      border-radius: 14px;
      height: 110px;
      overflow: hidden;
      touch-action: none;
    }
    .pad.signed { border-color: var(--fleet-500); }
    canvas { width: 100%; height: 100%; display: block; }
    .hint {
      position: absolute;
      bottom: 6px;
      right: 12px;
      font-size: 10px;
      color: var(--deep-300);
      pointer-events: none;
    }
  `],
})
export class SignaturePadComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  @Input() hint = '';
  readonly hasInk = signal(false);
  readonly inkChange = output<boolean>();

  private ctx: CanvasRenderingContext2D | null = null;
  private drawing = false;
  private resizeObserver: ResizeObserver | null = null;

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement!);
    this.resize();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  start(e: PointerEvent): void {
    if (!this.ctx) return;
    this.drawing = true;
    const { x, y } = this.point(e);
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    // a dot for taps
    this.ctx.lineTo(x + 0.1, y + 0.1);
    this.ctx.stroke();
    this.setInk(true);
  }

  move(e: PointerEvent): void {
    if (!this.drawing || !this.ctx) return;
    const { x, y } = this.point(e);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
  }

  end(): void {
    this.drawing = false;
  }

  clear(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx?.clearRect(0, 0, canvas.width, canvas.height);
    this.setInk(false);
  }

  /** PNG data URL, or null when the pad is untouched. */
  value(): string | null {
    return this.hasInk() ? this.canvasRef.nativeElement.toDataURL('image/png') : null;
  }

  private setInk(value: boolean): void {
    if (this.hasInk() !== value) {
      this.hasInk.set(value);
      this.inkChange.emit(value);
    }
  }

  private point(e: PointerEvent): { x: number; y: number } {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private resize(): void {
    const canvas = this.canvasRef.nativeElement;
    const parent = canvas.parentElement!;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = parent.clientWidth * ratio;
    canvas.height = parent.clientHeight * ratio;

    const ctx = canvas.getContext('2d')!;
    ctx.scale(ratio, ratio);
    ctx.strokeStyle = '#d4ddea';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    this.ctx = ctx;
    this.setInk(false);
  }
}
