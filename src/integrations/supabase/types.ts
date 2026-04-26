export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      anotacoes: {
        Row: {
          archived_at: string | null
          autor_id: string
          created_at: string
          deal_id: string | null
          id: string
          medico_id: string | null
          proximo_contato: string | null
          texto: string
          unidade_id: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          autor_id: string
          created_at?: string
          deal_id?: string | null
          id?: string
          medico_id?: string | null
          proximo_contato?: string | null
          texto: string
          unidade_id?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          autor_id?: string
          created_at?: string
          deal_id?: string | null
          id?: string
          medico_id?: string | null
          proximo_contato?: string | null
          texto?: string
          unidade_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "anotacoes_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anotacoes_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anotacoes_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades_saude"
            referencedColumns: ["id"]
          },
        ]
      }
      contatos: {
        Row: {
          archived_at: string | null
          cargo: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          observacoes: string | null
          setor: string | null
          telefone: string | null
          unidade_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          cargo?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          setor?: string | null
          telefone?: string | null
          unidade_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          cargo?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          setor?: string | null
          telefone?: string | null
          unidade_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contatos_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades_saude"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_equipamentos: {
        Row: {
          created_at: string
          deal_id: string
          equipamento_id: string
          id: string
          quantidade: number
          valor_unitario: number
        }
        Insert: {
          created_at?: string
          deal_id: string
          equipamento_id: string
          id?: string
          quantidade?: number
          valor_unitario?: number
        }
        Update: {
          created_at?: string
          deal_id?: string
          equipamento_id?: string
          id?: string
          quantidade?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "deal_equipamentos_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_equipamentos_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_stage_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          deal_id: string
          estagio_anterior: Database["public"]["Enums"]["deal_stage"] | null
          estagio_novo: Database["public"]["Enums"]["deal_stage"]
          id: string
          resultado_anterior:
            | Database["public"]["Enums"]["deal_resultado"]
            | null
          resultado_novo: Database["public"]["Enums"]["deal_resultado"]
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          deal_id: string
          estagio_anterior?: Database["public"]["Enums"]["deal_stage"] | null
          estagio_novo: Database["public"]["Enums"]["deal_stage"]
          id?: string
          resultado_anterior?:
            | Database["public"]["Enums"]["deal_resultado"]
            | null
          resultado_novo: Database["public"]["Enums"]["deal_resultado"]
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          deal_id?: string
          estagio_anterior?: Database["public"]["Enums"]["deal_stage"] | null
          estagio_novo?: Database["public"]["Enums"]["deal_stage"]
          id?: string
          resultado_anterior?:
            | Database["public"]["Enums"]["deal_resultado"]
            | null
          resultado_novo?: Database["public"]["Enums"]["deal_resultado"]
        }
        Relationships: [
          {
            foreignKeyName: "deal_stage_history_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          archived_at: string | null
          created_at: string
          data_entrada_estagio: string
          data_fechamento: string | null
          estagio: Database["public"]["Enums"]["deal_stage"]
          id: string
          linha_id: string
          motivo_perda: string | null
          observacoes: string | null
          resultado: Database["public"]["Enums"]["deal_resultado"]
          titulo: string
          unidade_id: string
          updated_at: string
          valor_total: number
          vendedor_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          data_entrada_estagio?: string
          data_fechamento?: string | null
          estagio?: Database["public"]["Enums"]["deal_stage"]
          id?: string
          linha_id: string
          motivo_perda?: string | null
          observacoes?: string | null
          resultado?: Database["public"]["Enums"]["deal_resultado"]
          titulo: string
          unidade_id: string
          updated_at?: string
          valor_total?: number
          vendedor_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          data_entrada_estagio?: string
          data_fechamento?: string | null
          estagio?: Database["public"]["Enums"]["deal_stage"]
          id?: string
          linha_id?: string
          motivo_perda?: string | null
          observacoes?: string | null
          resultado?: Database["public"]["Enums"]["deal_resultado"]
          titulo?: string
          unidade_id?: string
          updated_at?: string
          valor_total?: number
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_linha_id_fkey"
            columns: ["linha_id"]
            isOneToOne: false
            referencedRelation: "linhas_produto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades_saude"
            referencedColumns: ["id"]
          },
        ]
      }
      equipamentos: {
        Row: {
          archived_at: string | null
          created_at: string
          descricao: string | null
          id: string
          linha_id: string
          modelo: string | null
          nome: string
          updated_at: string
          valor_referencia: number | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          linha_id: string
          modelo?: string | null
          nome: string
          updated_at?: string
          valor_referencia?: number | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          linha_id?: string
          modelo?: string | null
          nome?: string
          updated_at?: string
          valor_referencia?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "equipamentos_linha_id_fkey"
            columns: ["linha_id"]
            isOneToOne: false
            referencedRelation: "linhas_produto"
            referencedColumns: ["id"]
          },
        ]
      }
      linhas_produto: {
        Row: {
          archived_at: string | null
          cor: string | null
          created_at: string
          descricao: string | null
          id: string
          limite_amarelo_dias: number
          limite_verde_dias: number
          nome: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          cor?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          limite_amarelo_dias?: number
          limite_verde_dias?: number
          nome: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          cor?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          limite_amarelo_dias?: number
          limite_verde_dias?: number
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      medico_unidades: {
        Row: {
          created_at: string
          id: string
          medico_id: string
          papel: string | null
          unidade_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          medico_id: string
          papel?: string | null
          unidade_id: string
        }
        Update: {
          created_at?: string
          id?: string
          medico_id?: string
          papel?: string | null
          unidade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medico_unidades_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medico_unidades_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades_saude"
            referencedColumns: ["id"]
          },
        ]
      }
      medicos: {
        Row: {
          archived_at: string | null
          created_at: string
          crm: string | null
          email: string | null
          especialidade: string | null
          id: string
          nome: string
          observacoes: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          crm?: string | null
          email?: string | null
          especialidade?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          crm?: string | null
          email?: string | null
          especialidade?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      parque_instalado: {
        Row: {
          archived_at: string | null
          created_at: string
          data_instalacao: string | null
          equipamento_id: string
          garantia_ate: string | null
          id: string
          numero_serie: string | null
          observacoes: string | null
          unidade_id: string
          updated_at: string
          valor: number | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          data_instalacao?: string | null
          equipamento_id: string
          garantia_ate?: string | null
          id?: string
          numero_serie?: string | null
          observacoes?: string | null
          unidade_id: string
          updated_at?: string
          valor?: number | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          data_instalacao?: string | null
          equipamento_id?: string
          garantia_ate?: string | null
          id?: string
          numero_serie?: string | null
          observacoes?: string | null
          unidade_id?: string
          updated_at?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "parque_instalado_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parque_instalado_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades_saude"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean
          created_at: string
          email: string
          id: string
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          email: string
          id: string
          nome: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          email?: string
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tarefas: {
        Row: {
          anotacao_id: string | null
          archived_at: string | null
          concluida_em: string | null
          created_at: string
          criador_id: string
          data_vencimento: string | null
          deal_id: string | null
          descricao: string | null
          id: string
          medico_id: string | null
          prioridade: Database["public"]["Enums"]["tarefa_prioridade"]
          responsavel_id: string
          status: Database["public"]["Enums"]["tarefa_status"]
          titulo: string
          unidade_id: string | null
          updated_at: string
        }
        Insert: {
          anotacao_id?: string | null
          archived_at?: string | null
          concluida_em?: string | null
          created_at?: string
          criador_id: string
          data_vencimento?: string | null
          deal_id?: string | null
          descricao?: string | null
          id?: string
          medico_id?: string | null
          prioridade?: Database["public"]["Enums"]["tarefa_prioridade"]
          responsavel_id: string
          status?: Database["public"]["Enums"]["tarefa_status"]
          titulo: string
          unidade_id?: string | null
          updated_at?: string
        }
        Update: {
          anotacao_id?: string | null
          archived_at?: string | null
          concluida_em?: string | null
          created_at?: string
          criador_id?: string
          data_vencimento?: string | null
          deal_id?: string | null
          descricao?: string | null
          id?: string
          medico_id?: string | null
          prioridade?: Database["public"]["Enums"]["tarefa_prioridade"]
          responsavel_id?: string
          status?: Database["public"]["Enums"]["tarefa_status"]
          titulo?: string
          unidade_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_anotacao_id_fkey"
            columns: ["anotacao_id"]
            isOneToOne: false
            referencedRelation: "anotacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades_saude"
            referencedColumns: ["id"]
          },
        ]
      }
      unidades_saude: {
        Row: {
          archived_at: string | null
          cep: string | null
          ciclo: Database["public"]["Enums"]["unidade_ciclo"]
          cidade: string | null
          cnpj: string | null
          created_at: string
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          medico_principal_id: string | null
          nome: string
          observacoes: string | null
          telefone: string | null
          tipo: Database["public"]["Enums"]["unidade_tipo"]
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          cep?: string | null
          ciclo?: Database["public"]["Enums"]["unidade_ciclo"]
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          medico_principal_id?: string | null
          nome: string
          observacoes?: string | null
          telefone?: string | null
          tipo?: Database["public"]["Enums"]["unidade_tipo"]
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          cep?: string | null
          ciclo?: Database["public"]["Enums"]["unidade_ciclo"]
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          medico_principal_id?: string | null
          nome?: string
          observacoes?: string | null
          telefone?: string | null
          tipo?: Database["public"]["Enums"]["unidade_tipo"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unidades_saude_medico_principal_id_fkey"
            columns: ["medico_principal_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_view_deal: {
        Args: {
          _estagio: Database["public"]["Enums"]["deal_stage"]
          _user_id: string
          _vendedor_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_gerente: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "gerente"
        | "vendedor"
        | "pos_venda"
        | "assistente_vendas"
      deal_resultado: "em_andamento" | "ganho" | "perdido"
      deal_stage:
        | "prospeccao"
        | "qualificacao"
        | "demonstracao"
        | "negociacao"
        | "decisao"
        | "fechamento"
        | "finalizado"
      tarefa_prioridade: "baixa" | "media" | "alta"
      tarefa_status: "pendente" | "em_andamento" | "concluida" | "cancelada"
      unidade_ciclo: "discovery" | "lead" | "cliente"
      unidade_tipo: "hospital" | "clinica" | "ubs" | "laboratorio" | "outro"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "gerente",
        "vendedor",
        "pos_venda",
        "assistente_vendas",
      ],
      deal_resultado: ["em_andamento", "ganho", "perdido"],
      deal_stage: [
        "prospeccao",
        "qualificacao",
        "demonstracao",
        "negociacao",
        "decisao",
        "fechamento",
        "finalizado",
      ],
      tarefa_prioridade: ["baixa", "media", "alta"],
      tarefa_status: ["pendente", "em_andamento", "concluida", "cancelada"],
      unidade_ciclo: ["discovery", "lead", "cliente"],
      unidade_tipo: ["hospital", "clinica", "ubs", "laboratorio", "outro"],
    },
  },
} as const
