import os
import shutil
import plistlib
import xml.etree.ElementTree as ET

def configure_ios():
    dest_dir = os.path.join('ios', 'App', 'App')
    plist_path = os.path.join(dest_dir, 'Info.plist')
    if not os.path.exists(plist_path):
        print("iOS Info.plist not found, skipping iOS configuration.")
        return

    # 1. Write complete unified AppDelegate.swift with SceneDelegate and CarPlaySceneDelegate
    app_delegate_path = os.path.join(dest_dir, 'AppDelegate.swift')
    unified_app_delegate = """import UIKit
import Capacitor
import CarPlay

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Fallback: Ensure phone window is created and visible regardless of iOS lifecycle
        if self.window == nil {
            let window = UIWindow(frame: UIScreen.main.bounds)
            let storyboard = UIStoryboard(name: "Main", bundle: nil)
            window.rootViewController = storyboard.instantiateInitialViewController()
            self.window = window
            window.makeKeyAndVisible()
        }
        return true
    }

    func application(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        if connectingSceneSession.role == .windowApplication {
            return UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
        } else {
            return UISceneConfiguration(name: "CarPlayConfiguration", sessionRole: connectingSceneSession.role)
        }
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}

// ==================== PHONE SCENE DELEGATE ====================
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = (scene as? UIWindowScene) else { return }

        let window = UIWindow(windowScene: windowScene)
        let storyboard = UIStoryboard(name: "Main", bundle: nil)
        let rootViewController = storyboard.instantiateInitialViewController()
        window.rootViewController = rootViewController
        self.window = window
        window.makeKeyAndVisible()
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        guard let url = URLContexts.first?.url else { return }
        ApplicationDelegateProxy.shared.application(UIApplication.shared, open: url, options: [:])
    }
}

// ==================== CARPLAY SCENE DELEGATE ====================
@available(iOS 14.0, *)
class CarPlaySceneDelegate: UIResponder, CPTemplateApplicationSceneDelegate {
    var interfaceController: CPInterfaceController?

    func templateApplicationScene(_ templateApplicationScene: CPTemplateApplicationScene, didConnect interfaceController: CPInterfaceController) {
        self.interfaceController = interfaceController
        self.updateCarPlayRoot()
    }

    func templateApplicationScene(_ templateApplicationScene: CPTemplateApplicationScene, didDisconnectInterfaceController interfaceController: CPInterfaceController) {
        self.interfaceController = nil
    }

    func updateCarPlayRoot() {
        let itemHeader = CPListItem(text: "SYSTEM - العمليات الميدانية", detailText: "متابعة البلاغات والسيستم الميداني")
        itemHeader.setImage(UIImage(systemName: "car.fill"))

        let itemNew = CPListItem(text: "توثيق بلاغ جديد (+)", detailText: "افتح التطبيق على الهاتف لالتقاط الصورة")
        itemNew.setImage(UIImage(systemName: "camera.fill"))

        let itemStatus = CPListItem(text: "الموقع الجغرافي GPS", detailText: "تحديد الموقع مفعل عبر الأقمار الصناعية")
        itemStatus.setImage(UIImage(systemName: "location.fill"))

        let section = CPListSection(items: [itemHeader, itemNew, itemStatus], header: "لوحة تحكم السيارة", sectionIndexTitle: nil)
        let listTemplate = CPListTemplate(title: "SYSTEM", sections: [section])

        interfaceController?.setRootTemplate(listTemplate, animated: false, completion: nil)
    }
}
"""
    with open(app_delegate_path, 'w', encoding='utf-8') as f:
        f.write(unified_app_delegate)
    print("Wrote complete unified AppDelegate.swift with Phone Window and CarPlay delegates.")

    # 2. Copy App.entitlements if present
    if os.path.exists('App.entitlements'):
        shutil.copyfile('App.entitlements', os.path.join(dest_dir, 'App.entitlements'))
        print("Copied App.entitlements into ios/App/App/")

    # 3. Update Info.plist with plistlib
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

    # CarPlay Supported Templates
    plist_data['CPSupportedTemplateClasses'] = [
        'CPListTemplate',
        'CPInformationTemplate',
        'CPGridTemplate',
        'CPPointOfInterestTemplate',
        'CPAlertTemplate'
    ]

    # Scene Manifest with BOTH Phone Window and CarPlay Session
    plist_data['UIApplicationSceneManifest'] = {
        'UIApplicationSupportsMultipleScenes': True,
        'UISceneConfigurations': {
            'UIWindowSceneSessionRoleApplication': [
                {
                    'UISceneConfigurationName': 'Default Configuration',
                    'UISceneDelegateClassName': '$(PRODUCT_MODULE_NAME).SceneDelegate',
                    'UISceneStoryboardFile': 'Main'
                }
            ],
            'CPTemplateApplicationSceneSessionRoleApplication': [
                {
                    'UISceneConfigurationName': 'CarPlayConfiguration',
                    'UISceneDelegateClassName': '$(PRODUCT_MODULE_NAME).CarPlaySceneDelegate'
                }
            ]
        }
    }

    # UIBackgroundModes for CarPlay Audio, Navigation and Background Operations
    plist_data['UIBackgroundModes'] = ['audio', 'location', 'fetch', 'remote-notification']

    # Siri and CarPlay Intents
    plist_data['INIntentsSupported'] = [
        'INSendMessageIntent',
        'INSearchForMessagesIntent',
        'INPlayMediaIntent'
    ]

    # Permissions
    plist_data['NSCameraUsageDescription'] = "التطبيق يحتاج الوصول للكاميرا لالتقاط وتوثيق المشاكل الميدانية"
    plist_data['NSLocationWhenInUseUsageDescription'] = "التطبيق يحتاج تحديد الموقع الجغرافي لتوثيق مكان البلاغ بدقة"
    plist_data['NSLocationAlwaysAndWhenInUseUsageDescription'] = "التطبيق يحتاج تحديد الموقع الجغرافي لتوثيق مكان البلاغ بدقة"

    with open(plist_path, 'wb') as f:
        plistlib.dump(plist_data, f)
    print("iOS Info.plist successfully updated with Phone Window Scene & CarPlay!")

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
        content = content.replace('</activity>', f"{intent_filter}\n        </activity>")
        with open(manifest_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Android Manifest updated with systemapp:// scheme.")

if __name__ == '__main__':
    configure_ios()
    configure_android()
