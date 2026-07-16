/**
 * reconnct — Experiences that connect.
 * React Native (JavaScript only). Data is served by the backend public API
 * (/api/public/*) which exposes the experiences admins publish from the website.
 */
import React, { useState } from 'react';
import { Text, ScrollView } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/store/AuthContext';
import { WishlistProvider } from './src/store/WishlistContext';
import { LocationProvider } from './src/store/LocationContext';
import { BookingsProvider } from './src/store/BookingsContext';
import { HostProvider } from './src/store/HostContext';
import { SupplierAuthProvider } from './src/store/SupplierAuthContext';
import { SupplierProvider } from './src/store/SupplierContext';
import { NavProvider } from './src/navigation/NavContext';
import RootNavigator from './src/navigation/RootNavigator';
import SplashScreen from './src/components/SplashScreen';

// Splash plays its split/merge/zoom logo animation on cold start, then calls
// onFinish itself (no fixed timer). It is the ONLY thing mounted while active —
// not an overlay sibling — so there's no elevation/zIndex stacking fight with
// RootNavigator on Android (that was leaving only a sliver of it visible).
function AppShell() {
  const [showSplash, setShowSplash] = useState(true);
  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }
  return <RootNavigator />;
}

// Catches any render/runtime error so the app shows a message instead of
// closing instantly — and surfaces the cause for debugging.
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#1F2937' }}>Something went wrong</Text>
          <Text style={{ marginTop: 10, color: '#6B7280' }}>{String(this.state.error && this.state.error.message)}</Text>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <SupplierAuthProvider>
            <WishlistProvider>
              <LocationProvider>
                <BookingsProvider>
                  <HostProvider>
                    <SupplierProvider>
                      <NavProvider>
                        <AppShell />
                      </NavProvider>
                    </SupplierProvider>
                  </HostProvider>
                </BookingsProvider>
              </LocationProvider>
            </WishlistProvider>
          </SupplierAuthProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
