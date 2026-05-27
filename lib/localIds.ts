export function createLocalId(prefix: string) {
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${timestamp}-${random}`;
}

export function createLocalReviewId() {
  return createLocalId('local-review');
}

export function createLocalPhotoId() {
  return createLocalId('local-photo');
}

export function createImportedReviewId() {
  return createLocalId('import-review');
}

export function createLocalTagId(type: 'action' | 'state') {
  return createLocalId(`${type}-tag`);
}
