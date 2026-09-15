import type { AuthResult, LoginRequest } from '../types/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5036';

export async function login(request: LoginRequest): Promise<AuthResult> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error('Рақами телефон ё парол нодуруст аст.');
  }

  return response.json() as Promise<AuthResult>;
}

export async function getSystemInfo(token: string): Promise<{ name: string; version: string }> {
  const response = await fetch(`${API_BASE_URL}/api/system/info`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('API дастрас нест.');
  }

  return response.json() as Promise<{ name: string; version: string }>;
}

