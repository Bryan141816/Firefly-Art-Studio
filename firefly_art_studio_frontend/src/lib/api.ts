export const apiFetch = async (
  url: string,
  options: RequestInit = {}
) => {
  const headers = new Headers(options.headers);

  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`http://localhost:8080/api${url}`, {
    ...options,
    headers,
  });
};