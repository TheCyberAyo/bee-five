/**
 * Ad Mediator Types
 * Types for the ad mediation system that selects the most profitable ads
 */

export type AdType = 'banner' | 'interstitial' | 'rewarded';

export type AdNetwork = 
  | 'admob' 
  | 'facebook' 
  | 'applovin' 
  | 'unity' 
  | 'vungle' 
  | 'adcolony' 
  | 'ironsource' 
  | 'chartboost' 
  | 'inmobi'
  | 'unknown';

export interface AdPerformanceMetrics {
  network: AdNetwork;
  adType: AdType;
  impressions: number;
  clicks: number;
  revenue: number; // Total revenue in USD
  eCPM: number; // Effective cost per mille (revenue per 1000 impressions)
  fillRate: number; // Percentage of successful ad loads
  averageLoadTime: number; // Average time to load ad in milliseconds
  lastUpdated: number; // Timestamp
}

export interface AdUnitConfig {
  adType: AdType;
  testUnitId: string;
  productionUnitId?: string;
  position?: 'top' | 'bottom' | 'center';
  size?: 'banner' | 'largeBanner' | 'mediumRectangle' | 'fullBanner' | 'leaderboard';
}

export interface AdMediatorConfig {
  appId?: string;
  testMode: boolean;
  adUnits: {
    banner?: AdUnitConfig;
    interstitial?: AdUnitConfig;
    rewarded?: AdUnitConfig;
  };
  performanceTrackingEnabled: boolean;
  autoOptimizeEnabled: boolean;
  minImpressionsForOptimization: number; // Minimum impressions before optimizing
  optimizationInterval: number; // How often to re-evaluate (in milliseconds)
}

export interface AdRequestOptions {
  requestNonPersonalizedAdsOnly?: boolean;
  keywords?: string[];
  contentUrl?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface AdLoadResult {
  success: boolean;
  network?: AdNetwork;
  error?: string;
  loadTime?: number;
}

export interface AdDisplayResult {
  success: boolean;
  network?: AdNetwork;
  revenue?: number;
  error?: string;
}


