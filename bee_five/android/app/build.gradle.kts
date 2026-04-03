import java.util.Properties

val keyProperties = Properties()
val keyPropertiesFile = rootProject.file("key.properties")
val hasReleaseKeystore: Boolean =
    keyPropertiesFile.exists().also { exists ->
        if (exists) {
            keyPropertiesFile.inputStream().use { keyProperties.load(it) }
        }
    } &&
        keyProperties.getProperty("storeFile")?.isNotBlank() == true &&
        keyProperties.getProperty("keyAlias")?.isNotBlank() == true &&
        keyProperties.getProperty("storePassword")?.isNotBlank() == true &&
        keyProperties.getProperty("keyPassword")?.isNotBlank() == true

plugins {
    id("com.android.application")
    id("kotlin-android")
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "com.beefive.app"
    compileSdk = 36
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_17.toString()
    }

    defaultConfig {
        applicationId = "com.beefive.app"
        minSdk = flutter.minSdkVersion
        targetSdk = 35
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        if (hasReleaseKeystore) {
            create("release") {
                keyAlias = keyProperties.getProperty("keyAlias")
                keyPassword = keyProperties.getProperty("keyPassword")
                storeFile = rootProject.file(keyProperties.getProperty("storeFile"))
                storePassword = keyProperties.getProperty("storePassword")
            }
        }
    }

    buildTypes {
        release {
            // Play uploads need a release keystore; use debug signing only for local testing.
            signingConfig =
                signingConfigs.findByName("release") ?: signingConfigs.getByName("debug")
        }
    }
}

flutter {
    source = "../.."
}