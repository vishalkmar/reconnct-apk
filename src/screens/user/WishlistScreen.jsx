import React from 'react';
import { View, StyleSheet, FlatList, Dimensions } from 'react-native';
import { colors, space } from '../../theme';
import { useNav } from '../../navigation/NavContext';
import { useWishlist } from '../../store/WishlistContext';
import ScreenHeader from '../../components/ScreenHeader';
import EmptyState from '../../components/EmptyState';
import ExperienceCard from '../../components/ExperienceCard';

const { width: SCREEN_W } = Dimensions.get('window');
const COL_W = (SCREEN_W - space.lg * 2 - 12) / 2;

// Normalise a stored wishlist entity into the card shape.
const toCard = (e) => ({
  id: e.id,
  slug: e.slug,
  name: e.name || e.title,
  mainImage: e.mainImage || e.image,
  city: e.city,
  rating: e.rating || 0,
  reviewsCount: e.reviewsCount || 0,
  category: e.category || null,
  fromPrice: e.fromPrice || e.price || 0,
  currency: e.currency || 'INR',
  priceUnit: e.priceUnit || 'person',
  durationLabel: e.durationLabel,
  capacity: e.capacity,
});

export default function WishlistScreen() {
  const { navigateTab, push } = useNav();
  const { items } = useWishlist();
  const cards = (items || []).filter((e) => (e.type || 'experience') === 'experience').map(toCard);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Wishlist" />
      <FlatList
        data={cards}
        keyExtractor={(it) => String(it.id)}
        numColumns={2}
        columnWrapperStyle={{ paddingHorizontal: space.lg, justifyContent: 'space-between' }}
        contentContainerStyle={{ paddingTop: 12 }}
        renderItem={({ item }) => (
          <ExperienceCard item={item} style={{ width: COL_W, marginBottom: 12 }}
            onPress={() => item.slug && push('detail', { idOrSlug: item.slug })} />
        )}
        ListEmptyComponent={
          <EmptyState emoji="🤍" title="Your wishlist is empty"
            sub="Tap the heart on any experience to save it here."
            cta="Browse experiences" onCta={() => navigateTab('experiences')} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({});
