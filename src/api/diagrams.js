// src/api/diagrams.js
import { apiFetch } from "./http";

export const listProjectDiagrams = (projectId) =>
  apiFetch(`/diagrams/project/${projectId}`);

export const createDiagram = (payload) =>
  apiFetch("/diagrams", { method: "POST", body: payload });

export const getDiagram = (id) => apiFetch(`/diagrams/${id}`);

export const updateDiagram = (id, body) =>
  apiFetch(`/diagrams/${id}`, { method: "PUT", body });

export const deleteDiagram = (id) =>
  apiFetch(`/diagrams/${id}`, { method: "DELETE" });
