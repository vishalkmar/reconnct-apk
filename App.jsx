/**
 * reconnct — Experiences that connect.
 * React Native (JavaScript only). Data is served by the backend public API
 * (/api/public/*) which exposes the experiences admins publish from the website.
 */
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/store/AuthContext';
import { WishlistProvider } from './src/store/WishlistContext';
import { LocationProvider } from './src/store/LocationContext';
import { NavProvider } from './src/navigation/NavContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <WishlistProvider>
          <LocationProvider>
            <NavProvider>
              <RootNavigator />
            </NavProvider>
          </LocationProvider>
        </WishlistProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
