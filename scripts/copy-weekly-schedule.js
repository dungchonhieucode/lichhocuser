// Import các hàm cần thiết từ Firebase SDK
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, writeBatch, doc } from "firebase/firestore";

// 1. Lấy thông tin cấu hình Firebase từ GitHub Secrets (được truyền vào qua biến môi trường)
const firebaseConfig = {
  apiKey: "AIzaSyAlnG4jxdnaPc0nOSLBKJbwop72bExrbzs",
  authDomain: "lichhoc-13811.firebaseapp.com",
  projectId: "lichhoc-13811",
  storageBucket: "lichhoc-13811.firebasestorage.app",
  messagingSenderId: "495829238108",
  appId: "1:495829238108:web:970c3799dd94d662edc199"
};

// Kiểm tra xem các biến môi trường đã được cung cấp chưa
if (!firebaseConfig.projectId || !firebaseConfig.apiKey) {
    console.error("Firebase configuration environment variables are not set.");
    process.exit(1); // Thoát với mã lỗi
}

// 2. Khởi tạo Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const appId = firebaseConfig.projectId;
const tasksCollectionRef = collection(db, "artifacts", appId, "public", "data", "tasks");

const dayMap = { 'T2': 0, 'T3': 1, 'T4': 2, 'T5': 3, 'T6': 4, 'T7': 5, 'CN': 6 };

// Hàm tiện ích để định dạng ngày YYYY-MM-DD
function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// Hàm tiện ích để lấy khoảng ngày của một tuần
function getWeekDateRange(date) {
    const start = new Date(date);
    const dayOfWeek = start.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // T2 là ngày đầu tuần
    start.setDate(date.getDate() - diff);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
}

// 3. Logic chính để sao chép lịch học
async function copyLastWeekSchedule() {
    console.log("Bắt đầu tiến trình sao chép lịch tuần...");

    const today = new Date(); // Ngày chạy script (Chủ Nhật)
    const nextWeekDate = new Date(today);
    nextWeekDate.setDate(today.getDate() + 1); // Ngày bắt đầu của tuần mới (Thứ Hai)

    const { start: lastStart, end: lastEnd } = getWeekDateRange(today); // Tuần hiện tại (sắp kết thúc)
    const { start: nextWeekStart } = getWeekDateRange(nextWeekDate); // Tuần tới

    console.log(`Đang tìm kiếm lịch trong khoảng: ${formatDate(lastStart)} đến ${formatDate(lastEnd)}`);
    
    const q = query(tasksCollectionRef, where("date", ">=", formatDate(lastStart)), where("date", "<=", formatDate(lastEnd)));

    try {
        const snap = await getDocs(q);
        if (snap.empty) {
            console.log("Không tìm thấy môn học nào ở tuần trước để sao chép. Kết thúc.");
            return;
        }

        console.log(`Tìm thấy ${snap.size} môn học. Chuẩn bị sao chép sang tuần bắt đầu từ ${formatDate(nextWeekStart)}.`);

        const batch = writeBatch(db);
        snap.forEach(docSnap => {
            const t = docSnap.data();
            const offset = dayMap[t.day];
            if (offset !== undefined) {
                const newDate = new Date(nextWeekStart);
                newDate.setDate(nextWeekStart.getDate() + offset);
                const newTask = {
                    ...t,
                    date: formatDate(newDate),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                // Tạo một document mới để không bị trùng ID
                const newRef = doc(collection(db, "artifacts", appId, "public", "data", "tasks"));
                batch.set(newRef, newTask);
            }
        });

        await batch.commit();
        console.log(`ĐÃ SAO CHÉP THÀNH CÔNG ${snap.size} môn học từ tuần trước sang tuần mới!`);
    } catch (err) {
        console.error("LỖI nghiêm trọng khi sao chép lịch:", err);
        process.exit(1); // Thoát với mã lỗi
    }
}

// Chạy hàm chính
copyLastWeekSchedule();
