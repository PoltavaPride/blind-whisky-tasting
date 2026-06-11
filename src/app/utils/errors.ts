import { HttpErrorResponse } from '@angular/common/http';

/** Human-readable description of a failed data request, with enough
 * technical detail to diagnose issues reported from guests' phones. */
export function describeError(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) {
      return (
        'The data service could not be reached — check your connection ' +
        '(or an ad/content blocker may be blocking googleapis.com).'
      );
    }
    return `The data service answered with error ${err.status} ${err.statusText || ''}`.trim() + '.';
  }
  if (err instanceof Error && err.name === 'TimeoutError') {
    return 'The data service did not respond in time.';
  }
  return 'Unexpected error while loading.';
}
