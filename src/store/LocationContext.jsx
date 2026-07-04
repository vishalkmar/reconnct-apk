import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

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
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Allow location access',
        message: 'reconnct uses your location to show experiences happening near you.',
        buttonPositive: 'Allow',
        buttonNegative: 'Not now',
      },
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
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

  // Read the real device GPS position (so we can capture the full street/area
  // address, not just an IP-based city guess). Resolves null on error/timeout.
  const getDeviceCoords = () => new Promise((resolve) => {
    try {
      Geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
      );
    } catch { resolve(null); }
  });

  const detect = useCallback(async (askFirst = true) => {
    setLoading(true);
    let granted = permission;
    if (askFirst) { granted = await askPermission(); setPermission(granted); }
    try {
      // With permission → real GPS coords → full location (gali/mohalla + city).
      // Without → backend falls back to an IP-based city lookup.
      const coords = granted ? await getDeviceCoords() : null;
      const d = await api.geoLocate(coords && coords.lat, coords && coords.lon);
      setDetected(d && (d.city || d.fullAddress) ? d : null);
    } catch { /* endpoint not live yet → silently skip */ } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission]);

  // Ask for location + resolve city only AFTER the user signs in (post-OTP).
  useEffect(() => { if (isAuthed) detect(true); }, [isAuthed, detect]);

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
    selectedCity,
    setSelectedCity,
    redetect: () => detect(false),
  }), [detected, loading, permission, selectedCity, detect]);

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export const useLocation = () => useContext(LocationContext) || {};
