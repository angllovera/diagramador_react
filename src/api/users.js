// src/api/users.js
import { apiFetch } from "./http";

// 🔹 Listar todos los usuarios
export const listUsers = () =>
  apiFetch("/users", { auth: true });

// 🔹 Obtener un usuario por ID
export const getUser = (id) =>
  apiFetch(`/users/${id}`, { auth: true });

// 🔹 Crear usuario
export const createUser = (payload) =>
  apiFetch("/users", {
    method: "POST",
    body: payload,
    auth: true,
  });

// 🔹 Actualizar usuario
export const updateUser = (id, payload) =>
  apiFetch(`/users/${id}`, {
    method: "PUT",
    body: payload,
    auth: true,
  });

// 🔹 Eliminar usuario
export const deleteUser = (id) =>
  apiFetch(`/users/${id}`, {
    method: "DELETE",
    auth: true,
  });
