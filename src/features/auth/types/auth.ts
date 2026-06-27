export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput {
  name: string
  email: string
  password: string
}

export interface GoogleLoginInput {
  idToken: string
}

/** Respuesta de los endpoints de login/registro/google. */
export interface AuthResponse {
  token: string
}
