import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
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

  const detect = useCallback(async (askFirst = true) => {
    setLoading(true);
    if (askFirst) setPermission(await askPermission());
    try {
      const d = await api.geoLocate();
      setDetected(d && d.city ? d : null);
    } catch { /* endpoint not live yet → silently skip */ } finally {
      setLoading(false);
    }
  }, []);

  // Ask for location + resolve city only AFTER the user signs in (post-OTP).
  useEffect(() => { if (isAuthed) detect(true); }, [isAuthed, detect]);

  const value = useMemo(() => ({
    detected,
    loading,
    permission,
    coords: detected && detected.lat != null ? { lat: detected.lat, lon: detected.lon } : null,
    city: selectedCity || (detected && detected.city) || null,
    detectedCity: detected && detected.city,
    selectedCity,
    setSelectedCity,
    redetect: () => detect(false),
  }), [detected, loading, permission, selectedCity, detect]);

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export const useLocation = () => useContext(LocationContext) || {};
