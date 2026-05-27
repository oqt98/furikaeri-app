import {
  manipulateAsync,
  SaveFormat,
} from 'expo-image-manipulator';

const MAX_PHOTO_EDGE = 1600;
const PHOTO_QUALITY = 0.72;

export async function preparePhotoForUpload(uri: string) {
  const resized = await manipulateAsync(
    uri,
    [{ resize: { width: MAX_PHOTO_EDGE } }],
    {
      compress: PHOTO_QUALITY,
      format: SaveFormat.JPEG,
    }
  );

  return resized.uri;
}
