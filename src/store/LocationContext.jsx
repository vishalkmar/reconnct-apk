import React, {
  createContext, useContext, useState, useEffect, useCallback, useMemo, useRef,
} from 'react';
import {
  PermissionsAndroid, Platform, Alert, Linking, AppState,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

// Let the module pick the best provider (GPS or Google Play services) and never
// skip the OS permission prompt.
try {
  Geolocation.setRNConfiguration({ skipPermissionRequests: false, authorizationLevel: 'whenInUse', locationProvider: 'auto' });
} catch { /* older versions may not support this — safe to ignore */ }

/**
 * Location intelligence. On first run we ask for the OS location permission
 * (so the user sees the access prompt), then resolve their city. Coordinates
 * are resolved server-side (IP-based) so no native GPS module is needed — keeps
 * the release build simple. The user can also override the city manually.
 */
const LocationContext = createContext(null);

async function askPermission() {
  if (Platform.OS !== 'android') return true;
  try {
    // Ask for BOTH fine + coarse — some devices only surface the prompt when
    // both are requested together, and coarse lets us still get a fix if the
    // user picks "approximate".
    const res = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    ]);
    return res[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED
      || res[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

export function LocationProvider({ children }) {
  const { isAuthed } = useAuth();
  const [detected, setDetected] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [permission, setPermission] = useState(null); // true | false | null
  // Device location (GPS) toggle is OFF even though we have permission — "near
  // you" / "you are here" can't work exactly until the user turns it on.
  const [servicesOff, setServicesOff] = useState(false);
  const promptedRef = useRef(false);

  // Nudge the user to switch device location ON (once per app foreground).
  const promptEnableLocation = useCallback(() => {
    if (promptedRef.current) return;
    promptedRef.current = true;
    Alert.alert(
      'Turn on location',
      "Your device location is off, so we can't show experiences near you or your exact place. Please turn it on for the full experience.",
      [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'Turn on',
          onPress: () => {
            if (Platform.OS === 'android') {
              Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS').catch(() => Linking.openSettings());
            } else {
              Linking.openSettings();
            }
          },
        },
      ],
    );
  }, []);

  // Read the real device GPS position (so we capture the exact street/area, not
  // an IP-based city guess). Tries a precise GPS fix first; if that times out
  // (common indoors) it falls back to a faster network-based fix. Resolves null
  // only if both fail.
  const getPos = (opts) => new Promise((resolve, reject) => {
    try {
      Geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        (err) => reject(err),
        opts,
      );
    } catch (e) { reject(e); }
  });

  const getDeviceCoords = async () => {
    try {
      return await getPos({ enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
    } catch { /* GPS timed out → try a quicker, network-based fix */ }
    try {
      return await getPos({ enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 });
    } catch { return null; }
  };

  const detect = useCallback(async (askFirst = true) => {
    setLoading(true);
    let granted = permission;
    if (askFirst) { granted = await askPermission(); setPermission(granted); }
    try {
      // With permission → real GPS coords → full location (gali/mohalla + city).
      // Without → backend falls back to an IP-based city lookup.
      const coords = granted ? await getDeviceCoords() : null;
      // Permission is there but we still got no fix → device location toggle is
      // off. Flag it and nudge the user, since exact "near you" needs real GPS.
      const off = !!granted && !coords;
      setServicesOff(off);
      if (off) promptEnableLocation();
      const d = await api.geoLocate(coords && coords.lat, coords && coords.lon);
      setDetected(d && (d.city || d.fullAddress) ? d : null);
    } catch { /* endpoint not live yet → silently skip */ } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission]);

  // Ask for location + resolve the exact place as soon as the app opens (so the
  // permission prompt appears right away and "near you" / "you are here" work
  // for guests too), and again once the user signs in.
  useEffect(() => { detect(true); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (isAuthed) detect(true); }, [isAuthed]); // eslint-disable-line react-hooks/exhaustive-deps

  // EVERY time the app comes to the foreground, re-check that location is on and
  // re-resolve the place — so if the user turned location on (or off) while away,
  // "near you" / "you are here" update, and we re-nudge if it's still off.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') { promptedRef.current = false; detect(false); }
    });
    return () => sub.remove();
  }, [detect]);

  const value = useMemo(() => ({
    detected,
    loading,
    permission,
    coords: detected && detected.lat != null ? { lat: detected.lat, lon: detected.lon } : null,
    city: selectedCity || (detected && detected.city) || null,
    detectedCity: detected && detected.city,
    // Full captured location (street/area/city/state) — stored separately so the
    // UI can show it while the city drives the picker selection.
    fullAddress: (detected && detected.fullAddress) || null,
    area: (detected && detected.area) || null,
    pincode: (detected && (detected.pincode || detected.postcode)) || null,
    selectedCity,
    setSelectedCity,
    servicesOff,
    promptEnableLocation,
    redetect: () => detect(false),
  }), [detected, loading, permission, selectedCity, servicesOff, promptEnableLocation, detect]);

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export const useLocation = () => useContext(LocationContext) || {};
