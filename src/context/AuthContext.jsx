const getEmailFromId = (employeeIdRaw) => {
  const employeeId = String(employeeIdRaw ?? "").trim().replace(/\s+/g, "");
  const domain = String(APP_CONFIG?.SYNTHETIC_EMAIL_DOMAIN ?? "")
    .trim()
    .replace(/^@+/, ""); // ตัด @ หน้าโดเมนทิ้ง

  return `${employeeId}@${domain}`;
};
