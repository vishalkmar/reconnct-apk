import { useCallback, useRef, useState } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import Sound from 'react-native-nitro-sound';

// Hold-to-record voice notes — records to the app's own private cache dir
// (react-native-nitro-sound's default path), so no storage permission is
// needed, just RECORD_AUDIO. A tap shorter than 400ms is treated as
// accidental and discarded rather than sent as a near-silent clip.
export function useVoiceRecorder({ onRecorded, onError }) {
  const [recording, setRecording] = useState(false);
  const startingRef = useRef(false);
  const startedAtRef = useRef(0);

  const ensurePermission = async () => {
    if (Platform.OS !== 'android') return true;
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone permission',
          message: 'reconnct needs microphone access to record a voice message.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  };

  const start = useCallback(async () => {
    if (recording || startingRef.current) return;
    startingRef.current = true;
    try {
      const allowed = await ensurePermission();
      if (!allowed) { onError && onError(new Error('Microphone permission denied')); return; }
      await Sound.startRecorder();
      startedAtRef.current = Date.now();
      setRecording(true);
    } catch (e) {
      onError && onError(e);
    } finally {
      startingRef.current = false;
    }
  }, [recording, onError]);

  const stop = useCallback(async () => {
    if (!recording) return;
    try {
      const uri = await Sound.stopRecorder();
      setRecording(false);
      const heldMs = Date.now() - startedAtRef.current;
      if (!uri || heldMs < 400) return;
      const fileUri = uri.startsWith('file://') ? uri : `file://${uri}`;
      onRecorded && onRecorded({ uri: fileUri, name: `voice-${Date.now()}.mp4`, type: 'audio/mp4' });
    } catch (e) {
      setRecording(false);
      onError && onError(e);
    }
  }, [recording, onRecorded, onError]);

  return { recording, start, stop };
}
