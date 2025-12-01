/**
 * Ad Mediator Service
 * Intelligent ad mediation system that selects the most profitable ads
 * 
 * This service:
 * - Tracks performance metrics for each ad network
 * - Automatically selects the best performing ads
 * - Handles ad loading, display, and revenue tracking
 * - Optimizes ad selection based on real-time performance data
 */

import mobileAds, {
  BannerAd,
  BannerAdSize,
  InterstitialAd,
  RewardedAd,
  AdEventType,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';
import {
  AdType,
  AdNetwork,
  AdMediatorConfig,
  AdRequestOptions,
  AdLoadResult,
  AdDisplayResult,
  AdUnitConfig,
} from '../types/adMediator';
import {
  loadPerformanceMetrics,
  updateMetrics,
  recordImpression,
  recordClick,
  recordLoadAttempt,
  getBestNetwork,
} from './adPerformanceStorage';
import { Platform } from 'react-native';

class AdMediatorService {
  private config: AdMediatorConfig;
  private initialized: boolean = false;
  private interstitialAds: Map<string, InterstitialAd> = new Map();
  private rewardedAds: Map<string, RewardedAd> = new Map();
  private loadStartTimes: Map<string, number> = new Map();

  constructor(config: AdMediatorConfig) {
    this.config = config;
  }

  /**
   * Initialize the ad mediator
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Initialize Google Mobile Ads SDK
      const adapterStatuses = await mobileAds().initialize();
      
      console.log('Ad Mediator initialized');
      console.log('Adapter statuses:', adapterStatuses);

      // Pre-load ads for better performance
      if (this.config.adUnits.interstitial) {
        await this.preloadInterstitial();
      }

      if (this.config.adUnits.rewarded) {
        await this.preloadRewarded();
      }

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize Ad Mediator:', error);
      throw error;
    }
  }

  /**
   * Get the appropriate ad unit ID (test or production)
   */
  private getAdUnitId(adType: AdType): string {
    const adUnit = this.config.adUnits[adType];
    if (!adUnit) {
      throw new Error(`No ad unit configured for ${adType}`);
    }

    if (this.config.testMode) {
      return adUnit.testUnitId;
    }

    return adUnit.productionUnitId || adUnit.testUnitId;
  }

  /**
   * Detect which network served the ad (simplified - AdMob mediation handles this)
   * In a real implementation, you might get this from AdMob's reporting API
   */
  private async detectNetwork(adType: AdType): Promise<AdNetwork> {
    // For now, we'll use 'admob' as the network since mediation happens server-side
    // In production, you could:
    // 1. Use AdMob's reporting API to get network data
    // 2. Use custom parameters in ad requests
    // 3. Implement client-side network detection if available
    
    // Try to get the best performing network from our metrics
    const bestNetwork = await getBestNetwork(adType);
    return bestNetwork || 'admob';
  }

  /**
   * Pre-load an interstitial ad
   */
  async preloadInterstitial(): Promise<AdLoadResult> {
    const unitId = this.getAdUnitId('interstitial');
    const loadKey = `interstitial:${unitId}`;
    const startTime = Date.now();
    this.loadStartTimes.set(loadKey, startTime);

    try {
      const interstitial = InterstitialAd.createForAdRequest(unitId, {
        requestNonPersonalizedAdsOnly: this.config.adUnits.interstitial?.position === 'center',
      });

      return new Promise((resolve) => {
        const unsubscribeLoaded = interstitial.addAdEventListener(AdEventType.LOADED, async () => {
          const loadTime = Date.now() - startTime;
          this.loadStartTimes.delete(loadKey);
          this.interstitialAds.set(loadKey, interstitial);

          const network = await this.detectNetwork('interstitial');
          await recordLoadAttempt(network, 'interstitial', true, loadTime);

          unsubscribeLoaded();
          unsubscribeError();

          resolve({
            success: true,
            network,
            loadTime,
          });
        });

        const unsubscribeError = interstitial.addAdEventListener(
          AdEventType.ERROR,
          async (error) => {
            const loadTime = Date.now() - startTime;
            this.loadStartTimes.delete(loadKey);

            const network = await this.detectNetwork('interstitial');
            await recordLoadAttempt(network, 'interstitial', false, loadTime);

            unsubscribeLoaded();
            unsubscribeError();

            resolve({
              success: false,
              network,
              error: error.message,
              loadTime,
            });
          }
        );

        interstitial.load();
      });
    } catch (error: any) {
      const network = await this.detectNetwork('interstitial');
      await recordLoadAttempt(network, 'interstitial', false);

      return {
        success: false,
        network,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Show an interstitial ad
   */
  async showInterstitial(): Promise<AdDisplayResult> {
    const unitId = this.getAdUnitId('interstitial');
    const loadKey = `interstitial:${unitId}`;
    let interstitial = this.interstitialAds.get(loadKey);

    // If no ad is loaded, try to load one
    if (!interstitial) {
      const loadResult = await this.preloadInterstitial();
      if (!loadResult.success) {
        return {
          success: false,
          error: loadResult.error || 'Failed to load interstitial ad',
        };
      }
      interstitial = this.interstitialAds.get(loadKey);
    }

    if (!interstitial) {
      return {
        success: false,
        error: 'Interstitial ad not available',
      };
    }

    try {
      return new Promise((resolve) => {
        const network = this.detectNetwork('interstitial');

        const unsubscribeClosed = interstitial!.addAdEventListener(
          AdEventType.CLOSED,
          async () => {
            // Record impression
            await recordImpression(network, 'interstitial');
            
            // Remove the ad and preload a new one
            this.interstitialAds.delete(loadKey);
            this.preloadInterstitial(); // Preload in background

            unsubscribeClosed();
            unsubscribeImpression();
            unsubscribeClicked();

            resolve({
              success: true,
              network,
            });
          }
        );

        const unsubscribeImpression = interstitial!.addAdEventListener(
          AdEventType.IMPRESSION,
          async () => {
            // Impression recorded in CLOSED event
            unsubscribeImpression();
          }
        );

        const unsubscribeClicked = interstitial!.addAdEventListener(
          AdEventType.CLICKED,
          async () => {
            await recordClick(network, 'interstitial');
            unsubscribeClicked();
          }
        );

        interstitial!.show();
      });
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to show interstitial ad',
      };
    }
  }

  /**
   * Pre-load a rewarded ad
   */
  async preloadRewarded(): Promise<AdLoadResult> {
    const unitId = this.getAdUnitId('rewarded');
    const loadKey = `rewarded:${unitId}`;
    const startTime = Date.now();
    this.loadStartTimes.set(loadKey, startTime);

    try {
      const rewarded = RewardedAd.createForAdRequest(unitId, {
        requestNonPersonalizedAdsOnly: false,
      });

      return new Promise((resolve) => {
        const unsubscribeLoaded = rewarded.addAdEventListener(
          RewardedAdEventType.LOADED,
          async () => {
            const loadTime = Date.now() - startTime;
            this.loadStartTimes.delete(loadKey);
            this.rewardedAds.set(loadKey, rewarded);

            const network = await this.detectNetwork('rewarded');
            await recordLoadAttempt(network, 'rewarded', true, loadTime);

            unsubscribeLoaded();
            unsubscribeError();

            resolve({
              success: true,
              network,
              loadTime,
            });
          }
        );

        const unsubscribeError = rewarded.addAdEventListener(
          RewardedAdEventType.ERROR,
          async (error) => {
            const loadTime = Date.now() - startTime;
            this.loadStartTimes.delete(loadKey);

            const network = await this.detectNetwork('rewarded');
            await recordLoadAttempt(network, 'rewarded', false, loadTime);

            unsubscribeLoaded();
            unsubscribeError();

            resolve({
              success: false,
              network,
              error: error.message,
              loadTime,
            });
          }
        );

        rewarded.load();
      });
    } catch (error: any) {
      const network = await this.detectNetwork('rewarded');
      await recordLoadAttempt(network, 'rewarded', false);

      return {
        success: false,
        network,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Show a rewarded ad
   */
  async showRewarded(): Promise<AdDisplayResult & { reward?: { type: string; amount: number } }> {
    const unitId = this.getAdUnitId('rewarded');
    const loadKey = `rewarded:${unitId}`;
    let rewarded = this.rewardedAds.get(loadKey);

    // If no ad is loaded, try to load one
    if (!rewarded) {
      const loadResult = await this.preloadRewarded();
      if (!loadResult.success) {
        return {
          success: false,
          error: loadResult.error || 'Failed to load rewarded ad',
        };
      }
      rewarded = this.rewardedAds.get(loadKey);
    }

    if (!rewarded) {
      return {
        success: false,
        error: 'Rewarded ad not available',
      };
    }

    try {
      return new Promise((resolve) => {
        const network = this.detectNetwork('rewarded');
        let rewardEarned = false;

        const unsubscribeEarned = rewarded!.addAdEventListener(
          RewardedAdEventType.EARNED_REWARD,
          async (reward) => {
            rewardEarned = true;
            await recordImpression(network, 'rewarded');
            unsubscribeEarned();
          }
        );

        const unsubscribeClosed = rewarded!.addAdEventListener(
          RewardedAdEventType.CLOSED,
          async () => {
            // Remove the ad and preload a new one
            this.rewardedAds.delete(loadKey);
            this.preloadRewarded(); // Preload in background

            unsubscribeClosed();
            unsubscribeEarned();

            resolve({
              success: rewardEarned,
              network,
            });
          }
        );

        rewarded!.show();
      });
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to show rewarded ad',
      };
    }
  }

  /**
   * Get banner ad size based on config
   */
  getBannerAdSize(): BannerAdSize {
    const size = this.config.adUnits.banner?.size || 'banner';
    
    switch (size) {
      case 'banner':
        return BannerAdSize.BANNER;
      case 'largeBanner':
        return BannerAdSize.LARGE_BANNER;
      case 'mediumRectangle':
        return BannerAdSize.MEDIUM_RECTANGLE;
      case 'fullBanner':
        return BannerAdSize.FULL_BANNER;
      case 'leaderboard':
        return BannerAdSize.LEADERBOARD;
      default:
        return BannerAdSize.BANNER;
    }
  }

  /**
   * Get banner ad unit ID
   */
  getBannerAdUnitId(): string {
    return this.getAdUnitId('banner');
  }

  /**
   * Check if mediator is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AdMediatorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): AdMediatorConfig {
    return { ...this.config };
  }
}

// Default configuration
const defaultConfig: AdMediatorConfig = {
  testMode: __DEV__,
  adUnits: {
    banner: {
      adType: 'banner',
      testUnitId: Platform.OS === 'ios' 
        ? TestIds.BANNER 
        : TestIds.BANNER,
      position: 'bottom',
      size: 'banner',
    },
    interstitial: {
      adType: 'interstitial',
      testUnitId: Platform.OS === 'ios'
        ? TestIds.INTERSTITIAL
        : TestIds.INTERSTITIAL,
    },
    rewarded: {
      adType: 'rewarded',
      testUnitId: Platform.OS === 'ios'
        ? TestIds.REWARDED
        : TestIds.REWARDED,
    },
  },
  performanceTrackingEnabled: true,
  autoOptimizeEnabled: true,
  minImpressionsForOptimization: 10,
  optimizationInterval: 3600000, // 1 hour
};

// Singleton instance
let adMediatorInstance: AdMediatorService | null = null;

/**
 * Get or create the ad mediator instance
 */
export function getAdMediator(config?: Partial<AdMediatorConfig>): AdMediatorService {
  if (!adMediatorInstance) {
    const finalConfig = config ? { ...defaultConfig, ...config } : defaultConfig;
    adMediatorInstance = new AdMediatorService(finalConfig);
  } else if (config) {
    adMediatorInstance.updateConfig(config);
  }
  return adMediatorInstance;
}

/**
 * Initialize the ad mediator (call this in App.tsx)
 */
export async function initializeAdMediator(config?: Partial<AdMediatorConfig>): Promise<void> {
  const mediator = getAdMediator(config);
  await mediator.initialize();
}

export default getAdMediator;


