// Cashfree credentials must stay on the backend. Creating payment links
// directly from the app would expose the client secret inside the APK.
export async function createPaymentLink() {
  throw new Error(
    'Payments must be initialised by the backend before enabling checkout.',
  );
}
