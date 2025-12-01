/**
 * Ad Banner Component
 * Displays a banner ad using the ad mediator
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { BannerAd, BannerAdSize, AdEventType } from 'react-native-google-mobile-ads';
import { getAdMediator } from '../services/adMediator';
import { recordImpression, recordClick } from '../services/adPerformanceStorage';
import { AdNetwork } from '../types/adMediator';

interface AdBannerProps {
  position?: 'top' | 'bottom';
  style?: any;
  onAdLoaded?: () => void;
  onAdFailedToLoad?: (error: string) => void;
}

export default function AdBanner({
  position = 'bottom',
  style,
  onAdLoaded,
  onAdFailedToLoad,
}: AdBannerProps) {
  const [adUnitId, setAdUnitId] = useState<string | null>(null);
  const [adSize, setAdSize] = useState<BannerAdSize>(BannerAdSize.BANNER);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initAd = async () => {
      try {
        const mediator = getAdMediator();
        
        if (!mediator.isInitialized()) {
          await mediator.initialize();
        }

        setAdUnitId(mediator.getBannerAdUnitId());
        setAdSize(mediator.getBannerAdSize());
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize ad banner:', error);
        onAdFailedToLoad?.(error instanceof Error ? error.message : 'Unknown error');
      }
    };

    initAd();
  }, [onAdFailedToLoad]);

  const handleAdLoaded = async () => {
    onAdLoaded?.();
    // Record impression for banner (simplified - banner impressions are automatic)
    const network: AdNetwork = 'admob'; // Mediation handles network selection
    await recordImpression(network, 'banner');
  };

  const handleAdFailedToLoad = (error: any) => {
    console.error('Banner ad failed to load:', error);
    onAdFailedToLoad?.(error.message || 'Failed to load ad');
  };

  const handleAdClicked = async () => {
    const network: AdNetwork = 'admob';
    await recordClick(network, 'banner');
  };

  if (!isInitialized || !adUnitId) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="small" color="#FFC30B" />
      </View>
    );
  }

  return (
    <View style={[styles.container, position === 'top' ? styles.top : styles.bottom, style]}>
      <BannerAd
        unitId={adUnitId}
        size={adSize}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdLoaded={handleAdLoaded}
        onAdFailedToLoad={handleAdFailedToLoad}
        onAdClicked={handleAdClicked}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
});


