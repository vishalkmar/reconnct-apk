import React from 'react';
import { View, Text, Image, ImageBackground, StyleSheet } from 'react-native';
import { formatMoney } from '../../utils/format';
import { ICONS } from '../../icons';

/**
 * Shared building blocks for every deal card so the badge / price / location
 * look identical across the framed, clean and overlay variants. Each card file
 * only owns its own frame + layout; these own the small repeated pieces.
 */

// Amber "Cultural" pill, sits on the image top-left.
export function CategoryBadge({ label, style }) {
  return (
    <ImageBackground
      source={ICONS.brandGrad}
      style={[parts.badge, style]}
      imageStyle={parts.badgeGrad}
      resizeMode="stretch"
    >
      <Text style={parts.badgeText} numberOfLines={1}>{label || 'Cultural'}</Text>
    </ImageBackground>
  );
}

// Crossed-out original price → discounted price → /unit.
// `stacked` puts the strike price on its own line above the discounted price.
export function PriceLine({ item, light, size = 16, strikeColor, stacked }) {
  const price = item.fromPrice || 0;
  const strike = price ? Math.round((price * 1.48) / 50) * 50 : 0;
  if (stacked) {
    return (
      <View>
        {!!strike && <Text style={[parts.strike, parts.strikeStacked, strikeColor && { color: strikeColor }]}>{formatMoney(strike, item.currency)}</Text>}
        <View style={parts.priceRow}>
          <Text style={[parts.price, { fontSize: size }, light ? parts.priceLight : parts.priceDark]}>
            {price ? formatMoney(price, item.currency) : 'Contact'}
          </Text>
          {!!price && <Text style={[parts.unit, light ? parts.unitLight : parts.unitDark]}>/{item.priceUnit || 'person'}</Text>}
        </View>
      </View>
    );
  }
  return (
    <View style={parts.priceRow}>
      {!!strike && <Text style={[parts.strike, strikeColor && { color: strikeColor }]}>{formatMoney(strike, item.currency)}</Text>}
      <Text style={[parts.price, { fontSize: size }, light ? parts.priceLight : parts.priceDark]}>
        {price ? formatMoney(price, item.currency) : 'Contact'}
      </Text>
      {!!price && <Text style={[parts.unit, light ? parts.unitLight : parts.unitDark]}>/{item.priceUnit || 'person'}</Text>}
    </View>
  );
}

// Pin icon + city.
export function LocationLine({ city, light }) {
  if (!city) return null;
  return (
    <View style={parts.locRow}>
      <Image source={light ? ICONS.locWhite : ICONS.locGray} style={[parts.locIcon, !light && parts.locIconDark]} />
      <Text style={[parts.loc, light ? parts.locLight : parts.locDark]} numberOfLines={1}>{city}</Text>
    </View>
  );
}

const parts = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    height: 20,
    paddingHorizontal: 9,
    borderRadius: 7,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeGrad: { borderRadius: 7 },
  badgeText: { color: '#1A1A2E', fontSize: 9.5, fontWeight: '900' },

  priceRow: { flexDirection: 'row', alignItems: 'flex-end' },
  strike: {
    color: '#FF2056',
    fontSize: 11,
    fontWeight: '700',
    textDecorationLine: 'line-through',
    marginRight: 5,
    marginBottom: 2,
  },
  strikeStacked: { marginRight: 0, marginBottom: 1 },
  price: { fontWeight: '700', lineHeight: 20 },
  priceLight: { color: '#FFFFFF' },
  priceDark: { color: '#1A1A2E' },
  unit: { fontSize: 10, fontWeight: '400', marginBottom: 2, marginLeft: 1 },
  unitLight: { color: 'rgba(255,255,255,0.82)' },
  unitDark: { color: '#7A7E8C' },

  locRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  locIcon: { width: 10, height: 10, marginRight: 4, opacity: 0.9 },
  locIconDark: { opacity: 1 },
  loc: { fontSize: 11, flex: 1 },
  locLight: { color: 'rgba(255,255,255,0.86)' },
  locDark: { color: '#5A5E6C' },
});
