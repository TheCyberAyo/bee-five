# Ad Mediator Usage Guide

The Ad Mediator is an intelligent system that automatically selects the most profitable ads from multiple ad networks through AdMob mediation.

## Features

- ✅ **Automatic Network Selection**: Chooses the best performing ad network based on eCPM and fill rates
- ✅ **Performance Tracking**: Tracks impressions, clicks, revenue, and load times for each network
- ✅ **Auto-Optimization**: Continuously optimizes ad selection based on real-time performance data
- ✅ **Preloading**: Pre-loads ads for better user experience
- ✅ **Multiple Ad Types**: Supports Banner, Interstitial, and Rewarded ads

## Quick Start

### 1. Basic Setup

The ad mediator is automatically initialized in `App.tsx`. You can customize it by updating the initialization:

```typescript
import { initializeAdMediator } from './src/services/adMediator';

// In App.tsx or your initialization code
await initializeAdMediator({
  testMode: __DEV__, // Use test ads in development
  performanceTrackingEnabled: true,
  autoOptimizeEnabled: true,
  adUnits: {
    banner: {
      adType: 'banner',
      testUnitId: 'ca-app-pub-3940256099942544/6300978111', // Test ID
      productionUnitId: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX', // Your production ID
      position: 'bottom',
      size: 'banner',
    },
    interstitial: {
      adType: 'interstitial',
      testUnitId: 'ca-app-pub-3940256099942544/1033173712',
      productionUnitId: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
    },
    rewarded: {
      adType: 'rewarded',
      testUnitId: 'ca-app-pub-3940256099942544/5224354917',
      productionUnitId: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
    },
  },
});
```

### 2. Display Banner Ads

Use the `AdBanner` component to display banner ads:

```typescript
import AdBanner from './src/components/AdBanner';

function MyComponent() {
  return (
    <View style={{ flex: 1 }}>
      <AdBanner 
        position="bottom" // or "top"
        onAdLoaded={() => console.log('Ad loaded')}
        onAdFailedToLoad={(error) => console.error('Ad failed:', error)}
      />
      {/* Your content */}
    </View>
  );
}
```

### 3. Show Interstitial Ads

Use the `useAdMediator` hook to show interstitial ads:

```typescript
import { useAdMediator } from './src/hooks/useAdMediator';

function GameComponent() {
  const { showInterstitial, interstitialReady, isLoadingInterstitial } = useAdMediator();

  const handleGameComplete = async () => {
    // Show interstitial after game completion
    if (interstitialReady) {
      const result = await showInterstitial();
      if (result.success) {
        console.log('Ad shown successfully');
      }
    }
  };

  return (
    <TouchableOpacity onPress={handleGameComplete}>
      <Text>Complete Game</Text>
    </TouchableOpacity>
  );
}
```

### 4. Show Rewarded Ads

```typescript
import { useAdMediator } from './src/hooks/useAdMediator';

function RewardsComponent() {
  const { showRewarded, rewardedReady } = useAdMediator();

  const handleWatchAdForReward = async () => {
    if (rewardedReady) {
      const result = await showRewarded();
      if (result.success && result.reward) {
        console.log(`Reward earned: ${result.reward.amount} ${result.reward.type}`);
        // Give user their reward
      }
    }
  };

  return (
    <TouchableOpacity onPress={handleWatchAdForReward}>
      <Text>Watch Ad for Extra Lives</Text>
    </TouchableOpacity>
  );
}
```

## Advanced Usage

### Direct Service Access

You can also use the ad mediator service directly:

```typescript
import { getAdMediator } from './src/services/adMediator';

const mediator = getAdMediator();

// Preload ads
await mediator.preloadInterstitial();
await mediator.preloadRewarded();

// Show ads
const result = await mediator.showInterstitial();
const rewardedResult = await mediator.showRewarded();
```

### Performance Metrics

Access performance metrics to see which networks are performing best:

```typescript
import { getMetricsForAdType, getBestNetwork } from './src/services/adPerformanceStorage';

// Get all metrics for interstitial ads
const metrics = await getMetricsForAdType('interstitial');
console.log('Interstitial ad performance:', metrics);

// Get the best performing network
const bestNetwork = await getBestNetwork('interstitial');
console.log('Best network:', bestNetwork);
```

### Custom Configuration

Update the configuration at runtime:

```typescript
import { getAdMediator } from './src/services/adMediator';

const mediator = getAdMediator();
mediator.updateConfig({
  testMode: false,
  autoOptimizeEnabled: true,
  minImpressionsForOptimization: 20,
});
```

## Integration Examples

### Example 1: Show Interstitial After Game Win

```typescript
import { useAdMediator } from './src/hooks/useAdMediator';

function GameScreen() {
  const { showInterstitial } = useAdMediator();
  const [gameWon, setGameWon] = useState(false);

  const handleGameWin = async () => {
    setGameWon(true);
    
    // Show ad after a short delay
    setTimeout(async () => {
      await showInterstitial();
    }, 1000);
  };

  // ... game logic
}
```

### Example 2: Banner Ad in Menu

```typescript
import AdBanner from './src/components/AdBanner';

function MenuScreen() {
  return (
    <View style={{ flex: 1 }}>
      <ScrollView>
        {/* Menu content */}
      </ScrollView>
      <AdBanner position="bottom" />
    </View>
  );
}
```

### Example 3: Rewarded Ad for Extra Lives

```typescript
import { useAdMediator } from './src/hooks/useAdMediator';

function LivesComponent() {
  const { showRewarded, rewardedReady } = useAdMediator();
  const [lives, setLives] = useState(3);

  const handleWatchAdForLife = async () => {
    if (!rewardedReady) {
      alert('Ad is loading, please wait...');
      return;
    }

    const result = await showRewarded();
    if (result.success) {
      setLives(lives + 1);
      alert('You earned an extra life!');
    } else {
      alert('Failed to show ad. Please try again.');
    }
  };

  return (
    <View>
      <Text>Lives: {lives}</Text>
      <TouchableOpacity 
        onPress={handleWatchAdForLife}
        disabled={!rewardedReady}
      >
        <Text>Watch Ad for Extra Life</Text>
      </TouchableOpacity>
    </View>
  );
}
```

## Best Practices

1. **Preload Ads**: Always preload interstitial and rewarded ads before they're needed
2. **Show Ads at Natural Breakpoints**: Show interstitial ads between game levels, not during gameplay
3. **Don't Over-Saturate**: Limit the frequency of ads to maintain good user experience
4. **Handle Errors Gracefully**: Always handle ad loading failures gracefully
5. **Test Mode**: Always use test ads during development to avoid policy violations
6. **Monitor Performance**: Regularly check performance metrics to optimize ad placement

## Performance Optimization

The ad mediator automatically:
- Tracks eCPM (effective cost per mille) for each network
- Monitors fill rates
- Records load times
- Selects the best performing network

You can view these metrics using the performance storage functions:

```typescript
import { getMetricsForAdType } from './src/services/adPerformanceStorage';

// Get performance data
const bannerMetrics = await getMetricsForAdType('banner');
bannerMetrics.forEach(metric => {
  console.log(`${metric.network}: eCPM=${metric.eCPM}, Fill Rate=${metric.fillRate}%`);
});
```

## Troubleshooting

### Ads Not Showing

1. Check that the ad mediator is initialized: `getAdMediator().isInitialized()`
2. Verify your ad unit IDs are correct
3. Ensure you're using test IDs in development
4. Check network connectivity

### Low Revenue

1. Review performance metrics to see which networks are performing best
2. Adjust ad placement and frequency
3. Ensure you have multiple networks configured in AdMob mediation
4. Check that your AdMob account is properly set up

### Performance Issues

1. Don't preload too many ads at once
2. Clear old performance data if needed: `clearPerformanceMetrics()`
3. Monitor app performance and adjust ad frequency

## Configuration Reference

```typescript
interface AdMediatorConfig {
  appId?: string; // AdMob App ID (optional, can be set in native config)
  testMode: boolean; // Use test ads
  adUnits: {
    banner?: AdUnitConfig;
    interstitial?: AdUnitConfig;
    rewarded?: AdUnitConfig;
  };
  performanceTrackingEnabled: boolean; // Track performance metrics
  autoOptimizeEnabled: boolean; // Auto-optimize ad selection
  minImpressionsForOptimization: number; // Min impressions before optimizing
  optimizationInterval: number; // Re-evaluation interval in ms
}
```

## Support

For issues or questions:
1. Check the AdMob mediation setup guide: `ADMOB_MEDIATION_SETUP.md`
2. Review AdMob documentation: https://developers.google.com/admob
3. Check React Native Google Mobile Ads: https://github.com/invertase/react-native-google-mobile-ads


