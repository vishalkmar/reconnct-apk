import { launchImageLibrary } from 'react-native-image-picker';

// Global rule: every image upload on the platform must be under 5MB.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const checkImageSize = (asset, mediaType) => {
  if (mediaType !== 'photo' || !asset.fileSize) return;
  if (asset.fileSize > MAX_IMAGE_BYTES) {
    const mb = (asset.fileSize / (1024 * 1024)).toFixed(1);
    throw new Error(`That photo is ${mb}MB — please pick one smaller than 5MB.`);
  }
};

/**
 * Opens the device gallery and returns the picked file URI (or null if the user
 * cancelled). Uses the system photo picker on modern Android — no runtime
 * storage permission required. mediaType: 'photo' | 'video'.
 */
export async function pickFromDevice(mediaType = 'photo') {
  const res = await launchImageLibrary({
    mediaType,
    selectionLimit: 1,
    quality: 0.85,
    includeBase64: false,
  });
  if (res.didCancel) return null;
  if (res.errorCode) throw new Error(res.errorMessage || 'Could not open the gallery.');
  const asset = res.assets && res.assets[0];
  if (!asset) return null;
  checkImageSize(asset, mediaType);
  return asset.uri;
}

/**
 * Like pickFromDevice but returns the full asset ({ uri, name, type }) needed to
 * build a multipart upload. Returns null if the user cancelled.
 */
export async function pickAsset(mediaType = 'photo') {
  const res = await launchImageLibrary({ mediaType, selectionLimit: 1, quality: 0.85, includeBase64: false });
  if (res.didCancel) return null;
  if (res.errorCode) throw new Error(res.errorMessage || 'Could not open the gallery.');
  const a = res.assets && res.assets[0];
  if (!a) return null;
  checkImageSize(a, mediaType);
  return { uri: a.uri, name: a.fileName || `photo-${Date.now()}.jpg`, type: a.type || 'image/jpeg' };
}
