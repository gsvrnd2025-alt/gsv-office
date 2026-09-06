plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "in.gsvee.gsv_office"
    compileSdk = 36   // AGP 8.9.1 + androidx.core:1.18.0 requires SDK 36
    ndkVersion = "27.0.12077973"  // Required by webview_flutter_android + connectivity_plus

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_17.toString()
    }

    defaultConfig {
        applicationId = "in.gsvee.gsv_office"
        minSdk = 24
        targetSdk = 35   // Target 35 (stable) even though we compile with 36
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    buildTypes {
        release {
            // Signed with debug keys — fine for internal LAN distribution
            signingConfig = signingConfigs.getByName("debug")
        }
    }
}

flutter {
    source = "../.."
}
