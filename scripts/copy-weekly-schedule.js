// Import các hàm cần thiết từ Firebase Client SDK
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, writeBatch, doc } from "firebase/firestore";

// Cấu hình Firebase được nhúng trực tiếp vào script.
// Các thông tin này đã chính xác với dự án của bạn.
const firebaseConfig = {
    apiKey: "AIzaSyDUQpOlvgn1TwT8TkfdHyesl1bc3Qbn0pM",
    authDomain: "dulieulichhoc.firebaseapp.com",
    projectId: "dulieulichhoc",
    storageBucket: "dulieulichhoc.firebasestorage.app",
    messagingSenderId: "46236518897",
    appId: "1:46236518897:web:8a6692006e802902965c50"
};

// Khởi tạo ứng dụng Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const appId = firebaseConfig.projectId;
const tasksCollectionRef = collection(db, "artifacts", appId, "public", "data", "tasks");

// Ánh xạ thứ trong tuần ra số để tính toán
const dayMap = { 'T2': 0, 'T3': 1, 'T4': 2, 'T5': 3, 'T6': 4, 'T7': 5, 'CN': 6 };

// Hàm tiện ích: Định dạng ngày thành chuỗi 'YYYY-MM-DD'
function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// Hàm tiện ích: Lấy ngày bắt đầu (Thứ 2) và kết thúc (Chủ Nhật) của một tuần
function getWeekDateRange(date) {
    const start = new Date(date);
    const dayOfWeek = start.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Tính toán để Thứ 2 luôn là ngày đầu tuần
    start.setDate(date.getDate() - diff);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
}

// Logic chính để sao chép lịch học
async function copyLastWeekSchedule() {
    console.log("Bắt đầu tiến trình sao chép lịch tuần...");

    const today = new Date(); // Ngày chạy script (là Chủ Nhật)
    const nextWeekDate = new Date(today);
    nextWeekDate.setDate(today.getDate() + 1); // Ngày của tuần mới (là Thứ Hai)

    const { start: lastStart, end: lastEnd } = getWeekDateRange(today); // Tuần hiện tại (sắp kết thúc)
    const { start: nextWeekStart } = getWeekDateRange(nextWeekDate); // Tuần tới (sắp bắt đầu)

    console.log(`Đang tìm kiếm lịch trong khoảng: ${formatDate(lastStart)} đến ${formatDate(lastEnd)}`);

    // Tạo câu truy vấn để lấy tất cả các môn học trong tuần hiện tại
    const q = query(tasksCollectionRef, where("date", ">=", formatDate(lastStart)), where("date", "<=", formatDate(lastEnd)));

    try {
        const snap = await getDocs(q);
        if (snap.empty) {
            console.log("Không tìm thấy môn học nào ở tuần trước để sao chép. Kết thúc.");
            return;
        }

        console.log(`Tìm thấy ${snap.size} môn học. Chuẩn bị sao chép sang tuần bắt đầu từ ${formatDate(nextWeekStart)}.`);

        // Sử dụng batch để thực hiện nhiều thao tác ghi cùng lúc cho hiệu quả
        const batch = writeBatch(db);

        snap.forEach(docSnap => {
            const t = docSnap.data();
            const offset = dayMap[t.day];
            if (offset !== undefined) {
                // Tính toán ngày mới cho môn học trong tuần tới
                const newDate = new Date(nextWeekStart);
                newDate.setDate(nextWeekStart.getDate() + offset);

                // Tạo object dữ liệu cho môn học mới
                const newTask = {
                    ...t, // Giữ lại toàn bộ dữ liệu cũ (tên, màu sắc,...)
                    date: formatDate(newDate), // Cập nhật lại ngày tháng
                    createdAt: new Date().toISOString(), // Đặt thời gian tạo mới
                    updatedAt: new Date().toISOString(), // Đặt thời gian cập nhật mới
                };

                // Tạo một tham chiếu đến một document MỚI (với ID tự động)
                const newRef = doc(collection(db, "artifacts", appId, "public", "data", "tasks"));
                // Thêm thao tác ghi vào batch
                batch.set(newRef, newTask);
            }
        });

        // Gửi toàn bộ batch lên Firestore để thực thi
        await batch.commit();
        console.log(`ĐÃ SAO CHÉP THÀNH CÔNG ${snap.size} môn học từ tuần trước sang tuần mới!`);
    } catch (err) {
        console.error("LỖI khi sao chép lịch:", err);
        process.exit(1); // Báo lỗi để GitHub Action dừng lại với trạng thái thất bại
    }
}

// Chạy hàm chính
copyLastWeekSchedule();
