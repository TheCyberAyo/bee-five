/**
 * Ad Performance Storage
 * Manages storage and retrieval of ad performance metrics for optimization
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AdPerformanceMetrics, AdNetwork, AdType } from '../types/adMediator';

const STORAGE_KEY = 'adMediator:performanceMetrics';
const MIN_UPDATE_INTERVAL = 60000; // 1 minute minimum between updates

interface StoredMetrics {
  [key: string]: AdPerformanceMetrics;
}

/**
 * Generate a unique key for a network + adType combination
 */
function getMetricsKey(network: AdNetwork, adType: AdType): string {
  return `${network}:${adType}`;
}

/**
 * Load all performance metrics from storage
 */
export async function loadPerformanceMetrics(): Promise<Map<string, AdPerformanceMetrics>> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (!data) {
      return new Map();
    }

    const stored: StoredMetrics = JSON.parse(data);
    const metricsMap = new Map<string, AdPerformanceMetrics>();

    for (const [key, metric] of Object.entries(stored)) {
      metricsMap.set(key, metric);
    }

    return metricsMap;
  } catch (error) {
    console.warn('Failed to load ad performance metrics:', error);
    return new Map();
  }
}

/**
 * Save performance metrics to storage
 */
export async function savePerformanceMetrics(
  metrics: Map<string, AdPerformanceMetrics>
): Promise<void> {
  try {
    const stored: StoredMetrics = {};
    metrics.forEach((metric, key) => {
      stored[key] = metric;
    });

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch (error) {
    console.warn('Failed to save ad performance metrics:', error);
  }
}

/**
 * Update metrics for a specific network and ad type
 */
export async function updateMetrics(
  network: AdNetwork,
  adType: AdType,
  update: Partial<AdPerformanceMetrics>
): Promise<AdPerformanceMetrics> {
  const metrics = await loadPerformanceMetrics();
  const key = getMetricsKey(network, adType);
  const existing = metrics.get(key);

  const now = Date.now();
  const baseMetric: AdPerformanceMetrics = existing || {
    network,
    adType,
    impressions: 0,
    clicks: 0,
    revenue: 0,
    eCPM: 0,
    fillRate: 0,
    averageLoadTime: 0,
    lastUpdated: now,
  };

  // Merge updates
  const updated: AdPerformanceMetrics = {
    ...baseMetric,
    ...update,
    network,
    adType,
    lastUpdated: now,
  };

  // Recalculate eCPM if impressions or revenue changed
  if (updated.impressions > 0) {
    updated.eCPM = (updated.revenue / updated.impressions) * 1000;
  }

  // Recalculate fill rate if we have load attempts
  if (update.fillRate !== undefined) {
    updated.fillRate = update.fillRate;
  }

  metrics.set(key, updated);
  await savePerformanceMetrics(metrics);

  return updated;
}

/**
 * Record an ad impression
 */
export async function recordImpression(
  network: AdNetwork,
  adType: AdType,
  revenue?: number
): Promise<void> {
  const metrics = await loadPerformanceMetrics();
  const key = getMetricsKey(network, adType);
  const existing = metrics.get(key) || {
    network,
    adType,
    impressions: 0,
    clicks: 0,
    revenue: 0,
    eCPM: 0,
    fillRate: 0,
    averageLoadTime: 0,
    lastUpdated: Date.now(),
  };

  const updated: AdPerformanceMetrics = {
    ...existing,
    impressions: existing.impressions + 1,
    revenue: existing.revenue + (revenue || 0),
    eCPM: existing.impressions + 1 > 0 
      ? ((existing.revenue + (revenue || 0)) / (existing.impressions + 1)) * 1000
      : 0,
    lastUpdated: Date.now(),
  };

  metrics.set(key, updated);
  await savePerformanceMetrics(metrics);
}

/**
 * Record an ad click
 */
export async function recordClick(network: AdNetwork, adType: AdType): Promise<void> {
  const metrics = await loadPerformanceMetrics();
  const key = getMetricsKey(network, adType);
  const existing = metrics.get(key);

  if (!existing) {
    // Create new entry if it doesn't exist
    await updateMetrics(network, adType, { clicks: 1 });
    return;
  }

  await updateMetrics(network, adType, {
    clicks: existing.clicks + 1,
  });
}

/**
 * Record ad load attempt (success or failure)
 */
export async function recordLoadAttempt(
  network: AdNetwork,
  adType: AdType,
  success: boolean,
  loadTime?: number
): Promise<void> {
  const metrics = await loadPerformanceMetrics();
  const key = getMetricsKey(network, adType);
  const existing = metrics.get(key);

  // For fill rate calculation, we need to track total attempts
  // This is a simplified version - in production you might want more sophisticated tracking
  if (existing) {
    // Update average load time
    const newLoadTime = loadTime || 0;
    const totalLoads = existing.impressions || 1;
    const updatedLoadTime = existing.averageLoadTime 
      ? (existing.averageLoadTime * (totalLoads - 1) + newLoadTime) / totalLoads
      : newLoadTime;

    await updateMetrics(network, adType, {
      averageLoadTime: success ? updatedLoadTime : existing.averageLoadTime,
      fillRate: success ? Math.min(100, (existing.impressions / (existing.impressions + 1)) * 100) : existing.fillRate,
    });
  } else if (success) {
    await updateMetrics(network, adType, {
      fillRate: 100,
      averageLoadTime: loadTime || 0,
    });
  }
}

/**
 * Get the best performing network for an ad type based on eCPM
 */
export async function getBestNetwork(adType: AdType): Promise<AdNetwork | null> {
  const metrics = await loadPerformanceMetrics();
  let bestNetwork: AdNetwork | null = null;
  let bestECPM = 0;
  let bestFillRate = 0;

  metrics.forEach((metric) => {
    if (metric.adType === adType) {
      // Consider both eCPM and fill rate
      // Weight: 70% eCPM, 30% fill rate
      const score = metric.eCPM * 0.7 + metric.fillRate * 0.3;
      const currentBestScore = bestECPM * 0.7 + bestFillRate * 0.3;

      if (score > currentBestScore || bestNetwork === null) {
        bestNetwork = metric.network;
        bestECPM = metric.eCPM;
        bestFillRate = metric.fillRate;
      }
    }
  });

  return bestNetwork;
}

/**
 * Get all metrics for a specific ad type
 */
export async function getMetricsForAdType(adType: AdType): Promise<AdPerformanceMetrics[]> {
  const metrics = await loadPerformanceMetrics();
  const results: AdPerformanceMetrics[] = [];

  metrics.forEach((metric) => {
    if (metric.adType === adType) {
      results.push(metric);
    }
  });

  return results.sort((a, b) => b.eCPM - a.eCPM);
}

/**
 * Clear all performance metrics (useful for testing)
 */
export async function clearPerformanceMetrics(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear ad performance metrics:', error);
  }
}


