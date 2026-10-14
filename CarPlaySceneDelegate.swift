import Foundation
import CarPlay
import UIKit

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
        let itemHeader = CPListItem(text: "SYSTEM - لوحة العمليات", detailText: "متابعة البلاغات الحية على شاشة السيارة")
        if #available(iOS 14.0, *) {
            itemHeader.setImage(UIImage(systemName: "car.fill"))
        }

        let itemNew = CPListItem(text: "التقاط وتوثيق بلاغ جديد (+)", detailText: "افتح التطبيق على الهاتف للالتقاط المباشر")
        if #available(iOS 14.0, *) {
            itemNew.setImage(UIImage(systemName: "camera.fill"))
        }

        let itemStatus = CPListItem(text: "حالة الربط والمزامنة", detailText: "النظام متصل في الوقت الفعلي")
        if #available(iOS 14.0, *) {
            itemStatus.setImage(UIImage(systemName: "antenna.radiowaves.left.and.right"))
        }

        let section = CPListSection(items: [itemHeader, itemNew, itemStatus], header: "عمليات الغرفة الحالية", sectionIndexTitle: nil)
        let listTemplate = CPListTemplate(title: "SYSTEM", sections: [section])

        interfaceController?.setRootTemplate(listTemplate, animated: true, completion: nil)
    }
}

