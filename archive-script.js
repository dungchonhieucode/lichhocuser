// Kịch bản này sẽ được chạy bởi GitHub Actions để lưu trữ công việc hàng tuần.

// Import thư viện Firebase Admin SDK
const admin = require('firebase-admin');

// Lấy thông tin xác thực từ biến môi trường do GitHub Actions cung cấp
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

// Lấy projectId từ file cấu hình của bạn
const projectId = 'lichhoc-fcf35';

// Khởi tạo ứng dụng Firebase với quyền admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: projectId,
});

const db = admin.firestore();
console.log('Đã khởi tạo Firebase Admin SDK thành công.');

// Hàm chính để thực hiện công việc
async function runArchive() {
  try {
    console.log('Bắt đầu quá trình lưu trữ...');

    const tasksCollectionRef = db.collection(`artifacts/${projectId}/public/data/tasks`);
    const archivesCollectionRef = db.collection(`artifacts/${projectId}/public/data/archives`);

    // 1. Lấy tất cả công việc hiện tại
    const snapshot = await tasksCollectionRef.get();
    if (snapshot.empty) {
      console.log('Không có công việc nào để lưu trữ. Kết thúc.');
      return;
    }

    const tasksToArchive = [];
    snapshot.forEach(doc => tasksToArchive.push({ id: doc.id, ...doc.data() }));
    console.log(`Tìm thấy ${tasksToArchive.length} công việc để lưu trữ.`);

    // 2. Chuẩn bị dữ liệu lưu trữ
    const today = new Date();
    // Điều chỉnh múi giờ cho Việt Nam (UTC+7)
    today.setHours(today.getHours() + 7);
    
    const dayOfWeek = today.getDay(); // Sunday is 0, Monday is 1
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const archiveId = startOfWeek.toISOString().split('T')[0]; // ID là YYYY-MM-DD
    const archiveData = {
      startDate: startOfWeek.toISOString(),
      endDate: endOfWeek.toISOString(),
      archivedAt: new Date().toISOString(),
      tasks: tasksToArchive
    };

    // 3. Lưu dữ liệu vào collection 'archives'
    await archivesCollectionRef.doc(archiveId).set(archiveData);
    console.log(`Đã lưu trữ thành công vào tài liệu: ${archiveId}`);

    // 4. Giữ lại các công việc cho tuần mới (không xóa)
    // Theo yêu cầu, chúng ta sẽ không xóa các công việc sau khi lưu trữ.
    // Các công việc sẽ được giữ lại trên bảng để "sao chép" qua tuần mới.
    console.log('Đã lưu trữ tuần thành công. Các công việc được giữ lại cho tuần tiếp theo.');


    console.log('Hoàn tất quá trình!');

  } catch (error) {
    console.error('Đã xảy ra lỗi trong quá trình lưu trữ:', error);
    // Thoát với mã lỗi để GitHub Actions báo cáo thất bại
    process.exit(1);
  }
}

// Chạy hàm chính
runArchive();


