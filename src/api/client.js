const API_BASE = "http://localhost:4000";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = data?.error || data?.detail || "Request failed";
    throw new Error(error);
  }
  return data;
}

export async function login(email, password) {
  return request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
}

export async function register(email, password) {
  return request("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
}

export async function guestLogin() {
  return request("/auth/guest", { method: "POST" });
}

export async function fetchFiles(token) {
  return request("/files", {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function fetchActivity(token) {
  return request("/activity", {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function fetchFileDetail(token, id) {
  return request(`/files/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function fetchAdminUsers(token) {
  return request("/admin-api/users", {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function fetchAdminAudit(token) {
  return request("/admin-api/audit", {
    headers: { Authorization: `Bearer ${token}` }
  });
}
export async function uploadFile(token, file) {
  const form = new FormData();
  form.append("file", {
    uri: file.uri,
    name: file.name || "upload.bin",
    type: file.mimeType || "application/octet-stream"
  });

  return request("/files/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
}

export function uploadFileWithProgress(token, file, onProgress) {
  const form = new FormData();
  form.append("file", {
    uri: file.uri,
    name: file.name || "upload.bin",
    type: file.mimeType || "application/octet-stream"
  });

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
          reject(new Error(data.error || "Upload failed"));
        }
      } catch (err) {
        reject(new Error("Upload failed"));
      }
    };

    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(form);
  });
}

export function getApiBase() {
  return API_BASE;
}
