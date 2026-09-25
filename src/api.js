export let auth = null;
export async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(path, {
      credentials: "same-origin",
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(auth?.csrf ? { "X-CSRF-Token": auth.csrf } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw Object.assign(
      new Error(
        "서버에 연결할 수 없습니다. 입력을 유지했으니 연결 후 다시 저장해 주세요.",
      ),
      { status: 0 },
    );
  }
  let value;
  try {
    value = await response.json();
  } catch {
    throw new Error(
      "서버 응답을 읽지 못했습니다. 서버 실행 상태를 확인해 주세요.",
    );
  }
  if (!response.ok)
    throw Object.assign(new Error(value.error || "처리하지 못했습니다."), {
      status: response.status,
    });
  return value;
}
export async function session() {
  auth = await request("/api/session");
  return auth;
}
export async function login(actorId, password) {
  auth = await request("/api/login", {
    method: "POST",
    body: JSON.stringify({ actorId, password }),
  });
  return auth;
}
export async function logout() {
  await request("/api/logout", { method: "POST", body: "{}" });
  auth = null;
}
export const getState = () => request("/api/state");
export const command = (type, payload, revision, id = crypto.randomUUID()) =>
  request("/api/command", {
    method: "POST",
    body: JSON.stringify({ id, type, payload, revision }),
  });
export const publicCommand = (type, payload, id = crypto.randomUUID()) =>
  request("/api/public/command", {
    method: "POST",
    body: JSON.stringify({ id, type, payload }),
  });
