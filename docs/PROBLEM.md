**Title:** Vehicle Routing Problem (VRP) - bài toán tối ưu hoá vận tải

**Author:** smartlog

**Date:** 10/29/2019

**Source:** [https://gosmartlog.com/vehicle-routing-problem/](https://gosmartlog.com/vehicle-routing-problem/)

---

# Page Structure Map
```text
Vehicle Routing Problem (VRP) - bài toán tối ưu hoá vận tải
├── Ai cần giải quyết vấn đề VRP?
└── Mở rộng nghiên cứu VRP – các vấn đề thực tế trong vận tải
    ├── **1\. Lấy hàng/ gom hàng tại nhiều kho (Multiple Depot VRP – MDVRP)**
    ├── **2\. Nhiều loại hàng hóa (Multi-commodity – VRP)**
    ├── **3\. Vấn đề định tuyến xe với Nhận và giao hàng (Vehicle Routing Problem with Pick-up and Delivering – VRPPD)**
    ├── **4\. Năng lực vận tải hạn chế: (The capacitated vehicle routing problem – CVRP)**
    ├── **5\. Ràng buộc khung giờ (VRP with time windows – VRPTW)**
    ├── **6\. Vấn đề định tuyến hàng tồn kho (Inventory Routing Problem – IRP)**
    ├── **7\. VRP ngẫu nhiên (Stochastic VRP – SVRP) nhu cầu ngẫu nhiên của khách hàng**
    ├── **8\. VRP động (Dynamic VRP) xe tải chuyển hướng trong quá trình thực hiện lộ trình mới (đơn đặt hàng phát sinh)**
    ├── **9\. Vấn đề định tuyến xe với Backhaul (Vehicle Routing Problem with Backhaul – VRPB)**
    └── **10\. Các vấn đề khác trong vận tải**
```

---

Nội dung bài viết

**Vấn đề định tuyến xe** VRP là một trong những tổ hợp tối ưu hóa khó khăn trong vận hành và quản lý vận tải, phân phối và **logistics**. Mục tiêu là tìm ra các tuyến tối ưu cho nhiều phương tiện vận tải cho tập hợp các địa điểm nhận hàng, giao hàng, điểm dừng,… Một kế hoạch để biết ai sẽ người phục vụ, giao hàng gì, số lượng bao nhiêu và các lộ trình được đi như thế nào,.. điều đó giúp giảm tổng chi phí vận chuyển. 

## Ai cần giải quyết vấn đề VRP?

**Lập kế hoạch vận tải bằng excel giấy, bút chì hay quản lý vận tải bằng excel** và kinh nghiệm có ưu điểm tiết kiệm tuy nhiên Không thể tạo nhiều giải pháp và phương án điều phối vận tải tối ưu. Cũng như khó đánh giá kết quả, phân quyền quản lý vận tải.

-   Chủ hàng – nhà bán lẻ, nhà phân phối, nhà sản xuất (retailers, distributors, manufacturers)
-   Chủ xe đội xe vận chuyển **LTL**, **FTL** (**2PL**)
-   Các công ty dịch vụ giao nhận (**3PL**)

## Mở rộng nghiên cứu VRP – các vấn đề thực tế trong vận tải

### **1\. Lấy hàng/ gom hàng tại nhiều kho (Multiple Depot VRP – MDVRP)**

Có các ràng buộc tại kho: tất cả các phương tiện cần phải được tải trước khi rời kho và dỡ hàng khi trở về. Vì chỉ có hai bến tải có sẵn, nhiều nhất hai xe có thể được tải hoặc dỡ cùng một lúc. Do đó, một số phương tiện phải chờ người khác tải, trì hoãn việc rời khỏi kho. Vấn đề là tìm các tuyến xe tối ưu cho VRPTW cũng như đáp ứng các hạn chế tải và dỡ hàng tại kho. 

### **2\. Nhiều loại hàng hóa (Multi-commodity – VRP)**

Đặc tính hàng hoá: Có những nguyên tắc trong vận tải FTL không được trộn lẫn (gỗ và bóng đèn, nước đóng chai & thực phẩm mất nước, v.v.)

**Kích thước hàng hoá:** Ảnh hưởng đến việc xếp dỡ hàng hoá, chất xếp, trọng tải xe,…

### **3\. Vấn đề định tuyến xe với Nhận và giao hàng (Vehicle Routing Problem with Pick-up and Delivering – VRPPD)**

 Mục tiêu sao cho lộ trình càng ngắn thì càng tốt. Bạn có thể tìm lộ trình đơn ngắn nhất một cách dễ dàng, tuy nhiên tìm đường đi ngắn nhất cho 20 địa điểm nhận hàng/giao hàng khó hơn gấp lần địa điểm hàng/giao hàng. Mỗi chiếc xe nhận/giao hàng tại các địa điểm khác nhau và giao chúng ở những nơi khác. Chỉ định các lộ trình cho các phương tiện để nhận và giao tất cả các mặt hàng, trong khi giảm thiểu chiều dài của lộ trình dài nhất.

### **4\. Năng lực vận tải hạn chế: (The capacitated vehicle routing problem – CVRP)**

Xe có khả năng vận chuyển hạn chế cần phải nhận hoặc cung cấp các mặt hàng tại các địa điểm khác nhau. Các mặt hàng có số lượng, chẳng hạn như trọng lượng hoặc khối lượng, và các phương tiện có công suất tối đa mà chúng có thể mang theo.  Phương tiện vận tải phải nhận hoặc giao các mặt hàng với mục tiêu chi phí thấp nhất, với điều kiện không bao giờ vượt quá khả năng của các phương tiện. (Vượt trọng tải)

### **5\. Ràng buộc khung giờ (VRP with time windows – VRPTW)**

Nhiều vấn đề định tuyến xe liên quan đến việc lên lịch cho các khách hàng chỉ có sẵn trong các khung thời gian cụ thể. Mục tiêu là để giảm thiểu tổng thời gian di chuyển của các phương tiện. [](https://gosmartlog.com/wp-content/uploads/2019/10/vrptw.svg)Tại vị trí 9, `**Time(0,3)**`là khung giờ , có nghĩa là phương tiện phải đến đó trong khoảng thời gian từ 2 đến 3 để đúng lịch trình. 

### **6\. Vấn đề định tuyến hàng tồn kho (Inventory Routing Problem – IRP)** 

Quản lý mạng lưới phân phối: mỗi ngày chủ hàng (Nhà phân phối) có mức tồn kho tối đa _bằng với_ nhu cầu hàng ngày, nghĩa là, họ không thể dự trữ nhiều hơn hoặc ít hơn .  _Các quyết định liên quan đến thời gian và số lượng đơn đặt hàng._

**Quyết định theo thời gian:** Các tuyến đường được đưa ra quan tâm đến thời gian và số lượng để cung cấp cho khách hàng.

**Quyết định theo thời gian và không gian:** Thời gian giao hàng cho mỗi khách hàng, số lượng được giao mỗi lần giao hàng diễn ra và các tuyến đường đi bằng phương tiện phải được quyết định cùng một lúc.

### **7\. VRP ngẫu nhiên (Stochastic VRP – SVRP) nhu cầu ngẫu nhiên của khách hàng**

Mục tiêu là để giảm thiểu đội xe và tổng thời gian di chuyển cần thiết để cung cấp cho tất cả khách hàng các giá trị ngẫu nhiên trên mỗi lần thực hiện để khách hàng được phục vụ, nhu cầu của khách hàng hoặc thời gian phục vụ dịch vụ. _Các phương án trong VRP ngẫu nhiên:_

-   Điều phối một xe mới đến kho nhận hàng hoặc trường hợp xe có sẵn tại kho.
-   Xe (đầy hàng) đợi dỡ hàng, sau đó tiếp tục vận chuyển theo kế hoạch.
-   Lập kế hoạch trở lại phòng ngừa cho kho ngay cả khi xe không đầy. Trong trường hợp như vậy, quyết định này có thể phụ thuộc vào số tiền đã được thu thập và vào khoảng cách lộ trình từ xe đến kho.

Một chiếc xe tải chưa đầy có thể quay trở lại kho nếu biết rằng việc đi đến khách hàng tiếp theo sẽ khiến công suất của nó bị vượt quá.

### **8\. VRP động (Dynamic VRP) xe tải chuyển hướng trong quá trình thực hiện lộ trình mới (đơn đặt hàng phát sinh)**

_Case study: VRP động trong phân phối dược phẩm_   Khi các nhà thuốc yêu cầu thời gian giao hàng ngắn hơn, các vấn đề định tuyến và lập lịch trình xe trở nên khó khăn hơn cho các nhà phân phối. Người ta nhận thấy rằng  kế hoạch vận tải truyền thống dựa trên các tuyến cố định không đáp ứng được kỳ vọng của các nhà thuốc. Và trong một số trường hợp khá kém hiệu quả đối với các nhà phân phối.

Hơn nữa, thường thì những tuyến đường tiên nghiệm không được hoàn thành đầy đủ, và đôi khi các phương tiện rời khỏi công ty chỉ để giao một hoặc hai đơn đặt hàng. Nói một cách thực tế hơn, nhà phân phối muốn biết, bất cứ lúc nào:

1) Đơn đặt hàng nào để giao hàng?

2) khi nào chúng nên được giao?

3) Phương tiện nào sẽ cung cấp các đơn đặt hàng?

Trên thực tế, các hiệu thuốc liên tục đặt hàng trong ngày, trong đó có nghĩa là tại mỗi thời điểm có các nhóm đơn đặt hàng khác nhau đã giao hàng. Điều đó cũng có nghĩa là trong một ngày, một số hiệu thuốc phục vụ nhiều lần trở lên.

### **9\. Vấn đề định tuyến xe với Backhaul (Vehicle Routing Problem with Backhaul – VRPB)**

_Case study khách hàng A và B_  Một đội xe đặt tại một kho trung tâm (DC) được sử dụng tối ưu để phục vụ một nhóm khách hàng được phân chia thành hai tập hợp con của khách hàng A và B. Mỗi tuyến đường bắt đầu và kết thúc tại kho. Và khách hàng B phải được phục vụ sau khi hoàn thành giao hàng cho khách hàng A.  Vì vậy, hàng hóa vận chuyển ngược từ điểm B đến điểm xuất phát A, xe phải chạy rỗng trong quá trình chạy ngược về điểm B đến xếp dỡ đầy hàng.

Để giải các bài toán định tuyến như VRP một cách hiệu quả, bạn cần Giải pháp hoạch định tuyến vận tải thông minh SARP – công cụ giúp tối ưu chi phí, thời gian và tài nguyên vận hành.

### **10\. Các vấn đề khác trong vận tải**

Hàng hoá vận chuyển có thể không được cung cấp trên một số thiết bị tải / xử lý (xe tăng, giá đỡ), khả năng duy trì nhiệt độ (điện lạnh), kích thước vật lý, vv

-   Dock hours: Giờ cập cửa kho nhận hàng/gom hàng.
-   Truck types: Các loại xe tải – trailer
-   Driver preferences: Thâm niên, hiểu biết lộ trình của tài xế, Kỹ năng lái xe
-   Rush hour traffic (Lưu lượng xe giờ cao điểm)
-   Refueling (Thời gian bơm nhiên liệu)
-   Maintenance (Doanh nghiệp tạm đóng cửa)
-   Waiting time: Thời gian chờ làm thủ tục, xử phạt giao thông,…