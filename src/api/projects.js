// src/api/projects.js
import { apiFetch } from "./http";

export const listProjects = () => apiFetch("/api/projects");

export const createProject = (body) =>
  apiFetch("/api/projects", { method: "POST", body: JSON.stringify(body) });

export const getProject = (id) => apiFetch(`/api/projects/${id}`);

export const updateProject = (id, body) =>
  apiFetch(`/api/projects/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });

export const deleteProject = (id) =>
  apiFetch(`/api/projects/${id}`, { method: "DELETE" });
