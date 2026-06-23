import React from 'react';
import { View, StatusBar } from 'react-native';
import { useAuth } from '../store/AuthContext';
import { useNav } from './NavContext';
import { colors } from '../theme';

import AuthNavigator from '../screens/auth/AuthNavigator';
import HomeScreen from '../screens/HomeScreen';
import ExperiencesScreen from '../screens/ExperiencesScreen';
import InboxScreen from '../screens/InboxScreen';
import ProfileScreen from '../screens/ProfileScreen';
import DetailScreen from '../screens/DetailScreen';
import MyBookingsScreen from '../screens/user/MyBookingsScreen';
import WishlistScreen from '../screens/user/WishlistScreen';
import TransactionsScreen from '../screens/user/TransactionsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import CityPickerScreen from '../screens/CityPickerScreen';
import BottomNav from '../components/BottomNav';

// Maps a bottom-tab key to its screen. Search reuses the Experiences screen
// (which has the search field) so the tab is immediately useful.
function TabScreen({ tab }) {
  switch (tab) {
    case 'home': return <HomeScreen />;
    case 'search': return <ExperiencesScreen />;
    case 'experiences': return <ExperiencesScreen />;
    case 'inbox': return <InboxScreen />;
    case 'profile': return <ProfileScreen />;
    default: return <HomeScreen />;
  }
}

// Pushed (full-screen, above the tabs) screens.
function StackScreen({ name, params }) {
  switch (name) {
    case 'detail': return <DetailScreen idOrSlug={params.idOrSlug} />;
    case 'experiences': return <ExperiencesScreen initialFilters={params.initialFilters} tagMode={params.tagMode} />;
    case 'bookings': return <MyBookingsScreen />;
    case 'wishlist': return <WishlistScreen />;
    case 'transactions': return <TransactionsScreen />;
    case 'notifications': return <NotificationsScreen />;
    case 'cityPicker': return <CityPickerScreen />;
    default: return null;
  }
}

export default function RootNavigator() {
  const { isAuthed } = useAuth();
  const { tab, top, navigateTab } = useNav();

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
