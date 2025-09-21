// Import các hàm cần thiết từ Firebase Client SDK
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, writeBatch, doc } from "firebase/firestore";

// =================================================================
// == DÁN TRỰC TIẾP firebaseConfig CỦA BẠN VÀO ĐÂY ==
// =================================================================
const firebaseConfig = {
  apiKey: "AIzaSyAlnG4jxdnaPc0nOSLBKJbwop72bExrbzs", // <-- THAY BẰNG API KEY CỦA BẠN
  authDomain: "lichhoc-13811.firebaseapp.com",        // <-- THAY BẰNG AUTH DOMAIN CỦA BẠN
  projectId: "lichhoc-13811",                         // <-- THAY BẰNG PROJECT ID CỦA BẠN
  storageBucket: "lichhoc-13811.firebasestorage.app", // <-- THAY BẰNG STORAGE BUCKET CỦA BẠN
  messagingSenderId: "495829238108",                  // <-- THAY BẰNG SENDER ID CỦA BẠN
  appId: "1:495829238108:web:970c3799dd94d662edc199"   // <-- THAY BẰNG APP ID CỦA BẠN
};
// =================================================================

// Khởi tạo Firebase với config đã cung cấp
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

// Hàm tiện ích để lấy khoảng ngày của một tuần (T2-CN)
function getWeekDateRange(date) {
    const start = new Date(date);
    const dayOfWeek = start.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
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

    const today = new Date(); // Ngày chạy script (Chủ Nhật)
    const nextWeekDate = new Date(today);
    nextWeekDate.setDate(today.getDate() + 1); // Ngày bắt đầu của tuần mới (Thứ Hai)

    const { start: lastStart, end: lastEnd } = getWeekDateRange(today); // Tuần hiện tại
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
                const newRef = doc(collection(db, "artifacts", appId, "public", "data", "tasks"));
                batch.set(newRef, newTask);
            }
        });

        await batch.commit();
        console.log(`ĐÃ SAO CHÉP THÀNH CÔNG ${snap.size} môn học từ tuần trước sang tuần mới!`);
    } catch (err) {
        console.error("LỖI khi sao chép lịch:", err);
        process.exit(1);
    }
}

// Chạy hàm chính
copyLastWeekSchedule();
