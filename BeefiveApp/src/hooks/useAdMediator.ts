/**
 * React Hook for Ad Mediator
 * Provides easy access to ad mediator functionality in React components
 */

import { useState, useEffect, useCallback } from 'react';
import { getAdMediator } from '../services/adMediator';
import { AdDisplayResult } from '../types/adMediator';

export function useAdMediator() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoadingInterstitial, setIsLoadingInterstitial] = useState(false);
  const [isLoadingRewarded, setIsLoadingRewarded] = useState(false);
  const [interstitialReady, setInterstitialReady] = useState(false);
  const [rewardedReady, setRewardedReady] = useState(false);

  useEffect(() => {
    const mediator = getAdMediator();
    setIsInitialized(mediator.isInitialized());

    if (!mediator.isInitialized()) {
      mediator.initialize().then(() => {
        setIsInitialized(true);
        // Preload ads
        checkInterstitialReady();
        checkRewardedReady();
      });
    } else {
      checkInterstitialReady();
      checkRewardedReady();
    }
  }, []);

  const checkInterstitialReady = useCallback(async () => {
    const mediator = getAdMediator();
    // Check if interstitial is ready (simplified check)
    setInterstitialReady(mediator.isInitialized());
  }, []);

  const checkRewardedReady = useCallback(async () => {
    const mediator = getAdMediator();
    // Check if rewarded is ready (simplified check)
    setRewardedReady(mediator.isInitialized());
  }, []);

  const showInterstitial = useCallback(async (): Promise<AdDisplayResult> => {
    if (!isInitialized) {
      return { success: false, error: 'Ad mediator not initialized' };
    }

    setIsLoadingInterstitial(true);
    try {
      const mediator = getAdMediator();
      const result = await mediator.showInterstitial();
      setInterstitialReady(false);
      // Preload next ad
      setTimeout(() => {
        mediator.preloadInterstitial().then(() => {
          setInterstitialReady(true);
        });
      }, 1000);
      return result;
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to show interstitial' };
    } finally {
      setIsLoadingInterstitial(false);
    }
  }, [isInitialized]);

  const showRewarded = useCallback(async (): Promise<AdDisplayResult & { reward?: { type: string; amount: number } }> => {
    if (!isInitialized) {
      return { success: false, error: 'Ad mediator not initialized' };
    }

    setIsLoadingRewarded(true);
    try {
      const mediator = getAdMediator();
      const result = await mediator.showRewarded();
      setRewardedReady(false);
      // Preload next ad
      setTimeout(() => {
        mediator.preloadRewarded().then(() => {
          setRewardedReady(true);
        });
      }, 1000);
      return result;
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to show rewarded ad' };
    } finally {
      setIsLoadingRewarded(false);
    }
  }, [isInitialized]);

  const preloadInterstitial = useCallback(async () => {
    if (!isInitialized) return;
    
    setIsLoadingInterstitial(true);
    try {
      const mediator = getAdMediator();
      await mediator.preloadInterstitial();
      setInterstitialReady(true);
    } catch (error) {
      console.error('Failed to preload interstitial:', error);
    } finally {
      setIsLoadingInterstitial(false);
    }
  }, [isInitialized]);

  const preloadRewarded = useCallback(async () => {
    if (!isInitialized) return;
    
    setIsLoadingRewarded(true);
    try {
      const mediator = getAdMediator();
      await mediator.preloadRewarded();
      setRewardedReady(true);
    } catch (error) {
      console.error('Failed to preload rewarded ad:', error);
    } finally {
      setIsLoadingRewarded(false);
    }
  }, [isInitialized]);

  return {
    isInitialized,
    isLoadingInterstitial,
    isLoadingRewarded,
    interstitialReady,
    rewardedReady,
    showInterstitial,
    showRewarded,
    preloadInterstitial,
    preloadRewarded,
  };
}


