// Bridges push-notification taps (which can fire outside the React tree —
// background state, or before RootNavigator has even mounted on a cold
// start) into the app's custom nav stack. RootNavigator registers itself
// once mounted; any route that arrives before that is queued and flushed
// the moment it does.
let navigate = null;
let pendingRoute = null;

export function registerNavigator(fn) {
  navigate = fn;
  if (pendingRoute) {
    const route = pendingRoute;
    pendingRoute = null;
    fn(route);
  }
}

export function unregisterNavigator() {
  navigate = null;
}

export function goToRoute(route) {
  if (!route) return;
  if (navigate) navigate(route);
  else pendingRoute = route;
}

// Mirrors NotificationsScreen.jsx's routeFor() — same kinds, same target
// screens — but reads an FCM data payload, whose values always arrive as
// strings.
export function routeForPush(data = {}) {
  const kind = data.kind;
  if (kind === 'booking') {
    return data.bookingCode ? { name: 'bookingFullDetail', params: { code: data.bookingCode } } : null;
  }
  if (kind === 'reminder') {
    if (data.isHostBooking === 'true') {
      return data.bookingId ? { name: 'hostBookingDetail', params: { id: data.bookingId } } : null;
    }
    return data.bookingCode ? { name: 'bookingFullDetail', params: { code: data.bookingCode } } : null;
  }
  if (kind === 'host_booking') {
    return data.bookingId ? { name: 'hostBookingDetail', params: { id: data.bookingId } } : null;
  }
  if (kind === 'support') {
    return { name: 'support', params: { queue: data.queue === 'supplier' ? 'supplier' : 'user' } };
  }
  return null;
}
