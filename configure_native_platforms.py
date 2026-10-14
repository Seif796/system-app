import os
import shutil
import plistlib
import xml.etree.ElementTree as ET

def configure_ios():
    plist_path = os.path.join('ios', 'App', 'App', 'Info.plist')
    if not os.path.exists(plist_path):
        print("iOS Info.plist not found, skipping iOS configuration.")
        return

    # 1. Copy CarPlaySceneDelegate.swift
    dest_swift = os.path.join('ios', 'App', 'App', 'CarPlaySceneDelegate.swift')
    if os.path.exists('CarPlaySceneDelegate.swift'):
        shutil.copyfile('CarPlaySceneDelegate.swift', dest_swift)
        print("Copied CarPlaySceneDelegate.swift into ios/App/App/")

    # 2. Update Info.plist with plistlib
    with open(plist_path, 'rb') as f:
        plist_data = plistlib.load(f)

    # Add URL Schemes for Shortcuts (systemapp://)
    plist_data['CFBundleURLTypes'] = [
        {
            'CFBundleURLName': 'com.seif.systemapp',
            'CFBundleURLSchemes': ['systemapp']
        }
    ]

    # Add Home Screen Quick Action Shortcuts
    plist_data['UIApplicationShortcutItems'] = [
        {
            'UIApplicationShortcutItemType': 'com.seif.systemapp.new',
            'UIApplicationShortcutItemTitle': 'عملية جديدة 📷',
            'UIApplicationShortcutItemSubtitle': 'التقاط وتوثيق بلاغ جديد فوراً',
            'UIApplicationShortcutItemIconType': 'UIApplicationShortcutIconTypeCompose'
        },
        {
            'UIApplicationShortcutItemType': 'com.seif.systemapp.carplay',
            'UIApplicationShortcutItemTitle': 'شاشة السيارة CarPlay 🚗',
            'UIApplicationShortcutItemSubtitle': 'عرض السيستم في وضع السيارة',
            'UIApplicationShortcutItemIconType': 'UIApplicationShortcutIconTypePlay'
        }
    ]

    # Add CarPlay Scene Manifest
    plist_data['UIApplicationSceneManifest'] = {
        'UIApplicationSupportsMultipleScenes': True,
        'UISceneConfigurations': {
            'CPTemplateApplicationSceneSessionRoleApplication': [
                {
                    'UISceneConfigurationName': 'CarPlayConfiguration',
                    'UISceneDelegateClassName': '$(PRODUCT_MODULE_NAME).CarPlaySceneDelegate'
                }
            ]
        }
    }

    # Permissions
    plist_data['NSCameraUsageDescription'] = "التطبيق يحتاج الوصول للكاميرا لالتقاط وتوثيق المشاكل الميدانية"
    plist_data['NSLocationWhenInUseUsageDescription'] = "التطبيق يحتاج تحديد الموقع الجغرافي لتوثيق مكان البلاغ بدقة"
    plist_data['NSLocationAlwaysAndWhenInUseUsageDescription'] = "التطبيق يحتاج تحديد الموقع الجغرافي لتوثيق مكان البلاغ بدقة"

    with open(plist_path, 'wb') as f:
        plistlib.dump(plist_data, f)
    print("iOS Info.plist successfully updated with CarPlay & Shortcuts!")

def configure_android():
    manifest_path = os.path.join('android', 'app', 'src', 'main', 'AndroidManifest.xml')
    if not os.path.exists(manifest_path):
        print("Android manifest not found, skipping Android configuration.")
        return

    with open(manifest_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Add systemapp:// deep link if not present
    if 'android:scheme="systemapp"' not in content:
        intent_filter = """
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="systemapp" />
            </intent-filter>
        """
        # Insert inside main Activity
        content = content.replace('</activity>', f"{intent_filter}\n        </activity>")
        with open(manifest_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Android Manifest updated with systemapp:// scheme.")

if __name__ == '__main__':
    configure_ios()
    configure_android()
