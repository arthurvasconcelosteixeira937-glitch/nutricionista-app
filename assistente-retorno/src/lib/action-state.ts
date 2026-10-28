export interface ActionState {
  ok: boolean;
  message: string | null;
  errors?: string[];
  /** Muda a cada resposta para a interface reagir mesmo com a mesma mensagem. */
  at?: number;
}

export const initialActionState: ActionState = { ok: false, message: null };
