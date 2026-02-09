export const API_BASE = import.meta.env.VITE_API_BASE || "/api";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.detail || data?.error || "Request failed");
  }
  return data;
}

export function login(email, password) {
  return request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
}

export function register(email, password) {
  return request("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
}

export function guestLogin() {
  return request("/auth/guest", { method: "POST" });
}

export function fetchFiles(token, page = 1, pageSize = 50) {
  return request(`/files?page=${page}&page_size=${pageSize}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function fetchActivity(token, page = 1, pageSize = 50) {
  return request(`/activity?page=${page}&page_size=${pageSize}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function fetchAnalytics(token) {
  return request("/analytics/summary", { headers: { Authorization: `Bearer ${token}` } });
}

export async function exportAuditCsv(token) {
  const res = await fetch(`${API_BASE}/activity/export`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    throw new Error("Export failed");
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "audit.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export function uploadFileWithProgress(token, file, onProgress) {
  const form = new FormData();
  form.append("file", file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/files/upload`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && typeof onProgress === "function") {
        onProgress(event.loaded / event.total);
      }
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText || "{}");
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data);
        } else {
          reject(new Error(data?.detail || data?.error || "Upload failed"));
        }
      } catch {
        reject(new Error("Upload failed"));
      }
    };

    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(form);
  });
}

export async function downloadFile(token, fileId, fileName) {
  const res = await fetch(`${API_BASE}/files/${fileId}/download`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    throw new Error("Download failed");
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName || "download.bin";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export function fetchAdminUsers(token) {
  return request("/admin-api/users", { headers: { Authorization: `Bearer ${token}` } });
}

export function fetchAdminAudit(token) {
  return request("/admin-api/audit?page=1&page_size=50", {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function createShareLink(token, fileId, expiresMinutes = 1440) {
  return request(`/files/${fileId}/share`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ expires_minutes: expiresMinutes })
  });
}

export function fetchShareLinks(token, fileId) {
  return request(`/files/${fileId}/shares`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function revokeShareLink(token, shareToken) {
  return request(`/files/share/${shareToken}/revoke`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function fetchAdminSummary(token) {
  return request("/admin-api/summary", { headers: { Authorization: `Bearer ${token}` } });
}

export function fetchAdminShares(token) {
  return request("/admin-api/shares", { headers: { Authorization: `Bearer ${token}` } });
}
