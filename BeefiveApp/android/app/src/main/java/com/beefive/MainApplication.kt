package com.beefive

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
// Temporarily disabled Google Mobile Ads
// import com.google.android.gms.ads.MobileAds

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    
    // Temporarily disabled Google Mobile Ads initialization
    // Initialize Google Mobile Ads SDK for mediation
    // This must be called before loading any ads
    // MobileAds.initialize(this) { initializationStatus ->
    //   // Initialization complete
    //   // You can check initializationStatus.adapterStatusMap to see which adapters loaded
    // }
    
    loadReactNative(this)
  }
}

