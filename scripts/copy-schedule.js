import { initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Đọc key từ biến môi trường
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

// Khởi tạo Firebase Admin SDK
initializeApp({
  credential: cert(serviceAccount),
});
const db = getFirestore();

const dayMap = { T2: 0, T3: 1, T4: 2, T5: 3, T6: 4, T7: 5, CN: 6 };

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

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

async function copySchedule() {
  console.log("🔄 Bắt đầu sao chép lịch tuần...");

  const currentDate = new Date();
  const lastWeekDate = new Date(currentDate);
  lastWeekDate.setDate(currentDate.getDate() - 7);

  const { start: lastWeekStart, end: lastWeekEnd } = getWeekDateRange(lastWeekDate);
  const { start: currentWeekStart } = getWeekDateRange(currentDate);

  const tasksRef = db.collection("artifacts/lichhoc-fcf35/public/data/tasks");

  const snapshot = await tasksRef
    .where("date", ">=", formatDate(lastWeekStart))
    .where("date", "<=", formatDate(lastWeekEnd))
    .get();

  if (snapshot.empty) {
    console.log("⚠️ Không có môn học nào để sao chép từ tuần trước.");
    return;
  }

  const batch = db.batch();
  snapshot.forEach((docSnap) => {
    const task = docSnap.data();
    const dayOffset = dayMap[task.day];
    if (dayOffset !== undefined) {
      const newDate = new Date(currentWeekStart);
      newDate.setDate(currentWeekStart.getDate() + dayOffset);

      const newTaskData = {
        ...task,
        date: formatDate(newDate),
        createdAt: new Date().toISOString(),
      };
      const newDoc = tasksRef.doc();
      batch.set(newDoc, newTaskData);
    }
  });

  await batch.commit();
  console.log("✅ Đã sao chép lịch tuần trước sang tuần mới thành công!");
}

copySchedule().catch((err) => {
  console.error("❌ Lỗi khi sao chép:", err);
  process.exit(1);
});
