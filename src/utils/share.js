import { Share } from 'react-native';

// Opens the OS share sheet (includes "Copy link") for an experience. Uses RN's
// built-in Share API — no native module needed.
export async function shareExperience(item) {
  if (!item) return;
  const url = `https://reconnct.app/experiences/${item.slug || item.id}`;
  try {
    await Share.share(
      { message: `${item.name} — discover it on reconnct\n${url}`, url, title: item.name },
      { dialogTitle: 'Share experience' },
    );
  } catch (_) { /* user dismissed */ }
}
