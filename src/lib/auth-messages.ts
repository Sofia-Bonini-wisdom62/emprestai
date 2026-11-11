// Textos da spec 001 que o servidor devolve e as telas mostram. Sem
// server-only: as telas das T-09 e T-10 importam daqui.
export const authMessages = {
  // RN-25: também para conta bloqueada e para qualquer falha do servidor ou do gateway.
  invalidCredentials: "E-mail ou senha incorretos.",
  // RN-26 e RN-43.
  tooManyAttempts: "Muitas tentativas. Tente de novo em alguns minutos.",
  // RN-27 e RN-50.
  nameRequired: "Informe seu nome.",
  nameTooLong: "Use até 80 caracteres.",
  // RN-38.
  linkExpired: "Este link venceu ou já foi usado. Fale com Operações.",
  // RN-39.
  weakPassword: "Use pelo menos 6 caracteres.",
  // RN-55.
  samePassword: "Escolha uma senha diferente da atual.",
  // RN-42: a mesma resposta, exista ou não a conta.
  resetRequested:
    "Se houver uma conta com esse e-mail, enviamos um link para redefinir a senha.",
  // RN-50.
  setupFailed: "Não foi possível salvar. Tente de novo.",
} as const;

// O /auth/confirm leva a /login com este parâmetro quando o link não vale (RN-38).
export const LINK_EXPIRED_QUERY = "error=expired-link";
