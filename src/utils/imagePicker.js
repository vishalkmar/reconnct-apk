import { launchImageLibrary } from 'react-native-image-picker';

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
  return asset ? asset.uri : null;
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
  return { uri: a.uri, name: a.fileName || `photo-${Date.now()}.jpg`, type: a.type || 'image/jpeg' };
}
