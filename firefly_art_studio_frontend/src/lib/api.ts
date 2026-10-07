export const apiFetch = async (
  url: string,
  options: RequestInit = {}
) => {
  return fetch(`http://localhost:8080/api${url}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });
};