import React, { useEffect } from 'react';
import { View, StatusBar, BackHandler } from 'react-native';
import { useAuth } from '../store/AuthContext';
import { useNav } from './NavContext';
import { colors } from '../theme';

import AuthNavigator from '../screens/auth/AuthNavigator';
import BottomNav from '../components/BottomNav';

// Screens are loaded lazily (required when first shown) so a problem in any one
// screen can never stop the whole app from opening — only the auth screen needs
// to load at startup.
const lazy = (loader) => { const C = loader().default; return <C />; };

function TabScreen({ tab }) {
  switch (tab) {
    case 'home': return lazy(() => require('../screens/HomeScreen'));
    case 'search': return lazy(() => require('../screens/SearchScreen'));
    case 'experiences': return lazy(() => require('../screens/ExperiencesScreen'));
    case 'inbox': return lazy(() => require('../screens/InboxScreen'));
    case 'profile': return lazy(() => require('../screens/ProfileScreen'));
    default: return lazy(() => require('../screens/HomeScreen'));
  }
}

// Pushed (full-screen, above the tabs) screens.
function StackScreen({ name, params }) {
  switch (name) {
    case 'detail': { const C = require('../screens/DetailScreen').default; return <C idOrSlug={params.idOrSlug} />; }
    case 'reconnect': return lazy(() => require('../screens/ReconnectScreen'));
    case 'booking': { const C = require('../screens/BookingScreen').default; return <C item={params.item} />; }
    case 'experiences': { const C = require('../screens/ExperiencesScreen').default; return <C initialFilters={params.initialFilters} tagMode={params.tagMode} />; }
    case 'bookings': return lazy(() => require('../screens/user/MyBookingsScreen'));
    case 'wishlist': return lazy(() => require('../screens/user/WishlistScreen'));
    case 'transactions': return lazy(() => require('../screens/user/TransactionsScreen'));
    case 'notifications': return lazy(() => require('../screens/NotificationsScreen'));
    case 'cityPicker': return lazy(() => require('../screens/CityPickerScreen'));
    default: return null;
  }
}

export default function RootNavigator() {
  const { isAuthed } = useAuth();
  const { tab, top, navigateTab, goBack } = useNav();

  // Android hardware/system back → one step back inside the app instead of
  // closing it. When goBack() can't go further (Home, nothing pushed) we
  // return false so the OS performs its default (exit).
  useEffect(() => {
    const onBack = () => (isAuthed ? goBack() : false);
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [isAuthed, goBack]);

  const onHeader = isAuthed && (tab === 'home' || tab === 'profile') ? colors.brand : colors.surface;

  if (!isAuthed) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.brandSoft }}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.brandSoft} />
        <AuthNavigator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle={onHeader === colors.brand ? 'light-content' : 'dark-content'} backgroundColor={onHeader} />
      {/* When a screen is pushed, it covers the whole view incl. the tab bar */}
      {top ? (
        <StackScreen name={top.name} params={top.params} />
      ) : (
        <>
          <View style={{ flex: 1 }}>
            <TabScreen tab={tab} />
          </View>
          <BottomNav current={tab} onChange={navigateTab} />
        </>
      )}
    </View>
  );
}
