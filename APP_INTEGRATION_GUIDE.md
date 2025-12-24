# Disbux App Integration Guide

This guide explains how to configure your mobile app to work with the smart app detection and deep linking system implemented on your landing page.

## How It Works

The landing page now includes smart app detection that:
1. **Detects if the app is installed** using custom URL schemes
2. **Opens the app directly** if installed (with auto-login capability)
3. **Downloads the APK** if the app is not installed
4. **Shows user-friendly notifications** throughout the process

## Mobile App Configuration Required

### Android App Configuration

#### 1. Add Intent Filters to AndroidManifest.xml

```xml
<activity
    android:name=".MainActivity"
    android:exported="true"
    android:launchMode="singleTop">
    
    <!-- Existing intent filter -->
    <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
    </intent-filter>
    
    <!-- Custom URL Scheme -->
    <intent-filter android:autoVerify="true">
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="disbux" />
    </intent-filter>
    
    <!-- Deep Links -->
    <intent-filter android:autoVerify="true">
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="https"
              android:host="disbux.com" />
    </intent-filter>
</activity>
```

#### 2. Handle Deep Links in Your App

```kotlin
// In your MainActivity or appropriate activity
override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    
    handleDeepLink(intent)
}

override fun onNewIntent(intent: Intent?) {
    super.onNewIntent(intent)
    intent?.let { handleDeepLink(it) }
}

private fun handleDeepLink(intent: Intent) {
    val data = intent.data
    
    when {
        data?.scheme == "disbux" -> {
            // Handle custom scheme (disbux://open)
            when (data.host) {
                "open" -> {
                    // Auto-login user if they have valid session
                    autoLoginUser()
                }
            }
        }
        
        data?.scheme == "https" && data.host == "disbux.com" -> {
            // Handle web deep links
            when (data.path) {
                "/open", "/login" -> autoLoginUser()
                "/user/claim" -> navigateToClaimScreen()
                "/pay" -> navigateToPaymentScreen()
            }
        }
    }
}

private fun autoLoginUser() {
    // Check if user has valid session/token
    val userToken = getStoredUserToken()
    
    if (userToken != null && isTokenValid(userToken)) {
        // Navigate directly to main app screen
        navigateToMainScreen()
    } else {
        // Navigate to login screen
        navigateToLoginScreen()
    }
}
```

### iOS App Configuration (if you plan to support iOS)

#### 1. Add URL Scheme to Info.plist

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLName</key>
        <string>com.hnrycdr.disbux</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>disbux</string>
        </array>
    </dict>
</array>

<key>com.apple.developer.associated-domains</key>
<array>
    <string>applinks:disbux.com</string>
</array>
```

#### 2. Handle URL Schemes in iOS

```swift
// In AppDelegate or SceneDelegate
func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey : Any] = [:]) -> Bool {
    
    if url.scheme == "disbux" {
        switch url.host {
        case "open":
            autoLoginUser()
        default:
            break
        }
    }
    
    return true
}

func autoLoginUser() {
    // Check for valid user session
    if let userToken = UserDefaults.standard.string(forKey: "userToken"),
       isTokenValid(userToken) {
        // Navigate to main screen
        navigateToMainScreen()
    } else {
        // Navigate to login screen
        navigateToLoginScreen()
    }
}
```

## Web Configuration (Already Implemented)

The following files have been configured on your website:

### 1. `.well-known/assetlinks.json` (Android App Links)
- Already configured with your package name: `com.hnrycdr.disbux`
- Uses your app's SHA256 fingerprint for verification

### 2. `.well-known/apple-app-site-association` (iOS Universal Links)
- Configured for future iOS support
- Handles paths: `/user/claim/*`, `/pay/*`, `/open`, `/login`

### 3. JavaScript Implementation
- Smart app detection using multiple methods
- Fallback to APK download
- User-friendly notifications
- Loading states for better UX

## Testing the Integration

### Test Scenarios:

1. **App Installed**: Click "Get the App" → Should open your app directly
2. **App Not Installed**: Click "Get the App" → Should download APK after 2.5 seconds
3. **Auto-Login**: When app opens from web, should check for valid session and auto-login

### Testing Commands:

```bash
# Test Android intent URL
adb shell am start -W -a android.intent.action.VIEW -d "disbux://open" com.hnrycdr.disbux

# Test deep link
adb shell am start -W -a android.intent.action.VIEW -d "https://disbux.com/open" com.hnrycdr.disbux
```

## Security Considerations

1. **Token Validation**: Always validate stored tokens before auto-login
2. **Deep Link Validation**: Validate all incoming deep link parameters
3. **Session Management**: Implement proper session timeout and refresh mechanisms
4. **Certificate Pinning**: Consider implementing certificate pinning for API calls

## Troubleshooting

### Common Issues:

1. **App doesn't open**: Check if custom URL scheme is properly registered
2. **Deep links don't work**: Verify intent filters and app link verification
3. **Auto-login fails**: Check token storage and validation logic
4. **APK download doesn't start**: Verify file path and server configuration

### Debug Steps:

1. Check Android logcat for intent handling
2. Verify app link verification status: `adb shell pm get-app-links com.hnrycdr.disbux`
3. Test URL schemes in browser address bar
4. Use Chrome DevTools to debug web-side JavaScript

## Next Steps

1. **Implement the mobile app changes** described above
2. **Test thoroughly** on different devices and scenarios
3. **Consider adding analytics** to track app opens vs downloads
4. **Implement push notifications** for better user engagement
5. **Add iOS support** when ready to expand to iOS platform

The web implementation is now complete and ready to work with your mobile app once you implement the corresponding mobile-side configuration.