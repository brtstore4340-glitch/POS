import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions();
const createEmployee = httpsCallable(functions, "createEmployee");

const handleCreate = async () => {
  const employeeId = "6705067"; // จาก input
  const res = await createEmployee({
    employeeId,
    domain: "boots-pos.local",
    role: "user",
  });

  alert(`สร้างแล้ว\nEmail: ${res.data.email}\nPassword: ${res.data.password}`);
};
