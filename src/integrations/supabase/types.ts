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
          discovery_id: string | null
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
          discovery_id?: string | null
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
          discovery_id?: string | null
          id?: string
          medico_id?: string | null
          proximo_contato?: string | null
          texto?: string
          unidade_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "anotacoes_autor_profile_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anotacoes_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anotacoes_discovery_id_fkey"
            columns: ["discovery_id"]
            isOneToOne: false
            referencedRelation: "discovery"
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
      chamados: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          data_abertura: string
          data_resolucao: string | null
          descricao_equipamento: string
          descricao_problema: string
          id: string
          observacoes: string | null
          prioridade: Database["public"]["Enums"]["chamado_prioridade"]
          status: Database["public"]["Enums"]["chamado_status"]
          tecnico_id: string | null
          unidade_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          data_abertura?: string
          data_resolucao?: string | null
          descricao_equipamento: string
          descricao_problema: string
          id?: string
          observacoes?: string | null
          prioridade?: Database["public"]["Enums"]["chamado_prioridade"]
          status?: Database["public"]["Enums"]["chamado_status"]
          tecnico_id?: string | null
          unidade_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          data_abertura?: string
          data_resolucao?: string | null
          descricao_equipamento?: string
          descricao_problema?: string
          id?: string
          observacoes?: string | null
          prioridade?: Database["public"]["Enums"]["chamado_prioridade"]
          status?: Database["public"]["Enums"]["chamado_status"]
          tecnico_id?: string | null
          unidade_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chamados_tecnico_profile_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      config_contador: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          limite_amarelo_dias: number
          limite_verde_dias: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          limite_amarelo_dias?: number
          limite_verde_dias?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          limite_amarelo_dias?: number
          limite_verde_dias?: number
          updated_at?: string
        }
        Relationships: []
      }
      contatos: {
        Row: {
          archived_at: string | null
          cargo: string | null
          created_at: string
          discovery_id: string | null
          email: string | null
          id: string
          nome: string
          observacoes: string | null
          papel_id: string | null
          setor: string | null
          telefone: string | null
          unidade_id: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          cargo?: string | null
          created_at?: string
          discovery_id?: string | null
          email?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          papel_id?: string | null
          setor?: string | null
          telefone?: string | null
          unidade_id?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          cargo?: string | null
          created_at?: string
          discovery_id?: string | null
          email?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          papel_id?: string | null
          setor?: string | null
          telefone?: string | null
          unidade_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contatos_discovery_id_fkey"
            columns: ["discovery_id"]
            isOneToOne: false
            referencedRelation: "discovery"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contatos_papel_id_fkey"
            columns: ["papel_id"]
            isOneToOne: false
            referencedRelation: "papeis_contato"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contatos_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades_saude"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos_manutencao: {
        Row: {
          archived_at: string | null
          cobertura: string | null
          created_at: string
          created_by: string | null
          id: string
          linha_id: string | null
          observacoes: string | null
          status: Database["public"]["Enums"]["contrato_status"]
          tipo_contrato: string
          unidade_id: string
          updated_at: string
          valor: number
          vigencia_fim: string
          vigencia_inicio: string
        }
        Insert: {
          archived_at?: string | null
          cobertura?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          linha_id?: string | null
          observacoes?: string | null
          status?: Database["public"]["Enums"]["contrato_status"]
          tipo_contrato: string
          unidade_id: string
          updated_at?: string
          valor?: number
          vigencia_fim: string
          vigencia_inicio: string
        }
        Update: {
          archived_at?: string | null
          cobertura?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          linha_id?: string | null
          observacoes?: string | null
          status?: Database["public"]["Enums"]["contrato_status"]
          tipo_contrato?: string
          unidade_id?: string
          updated_at?: string
          valor?: number
          vigencia_fim?: string
          vigencia_inicio?: string
        }
        Relationships: []
      }
      deal_equipamentos: {
        Row: {
          created_at: string
          deal_id: string
          descricao: string | null
          equipamento_id: string | null
          id: string
          quantidade: number
          valor_unitario: number
        }
        Insert: {
          created_at?: string
          deal_id: string
          descricao?: string | null
          equipamento_id?: string | null
          id?: string
          quantidade?: number
          valor_unitario?: number
        }
        Update: {
          created_at?: string
          deal_id?: string
          descricao?: string | null
          equipamento_id?: string | null
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
            foreignKeyName: "deal_stage_history_changed_by_profile_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
          data_previsao_fechamento: string | null
          estagio: Database["public"]["Enums"]["deal_stage"]
          id: string
          linha_id: string
          medico_id: string | null
          motivo_perda: string | null
          motivo_perda_id: string | null
          observacoes: string | null
          resultado: Database["public"]["Enums"]["deal_resultado"]
          titulo: string
          unidade_id: string | null
          updated_at: string
          valor_total: number
          vendedor_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          data_entrada_estagio?: string
          data_fechamento?: string | null
          data_previsao_fechamento?: string | null
          estagio?: Database["public"]["Enums"]["deal_stage"]
          id?: string
          linha_id: string
          medico_id?: string | null
          motivo_perda?: string | null
          motivo_perda_id?: string | null
          observacoes?: string | null
          resultado?: Database["public"]["Enums"]["deal_resultado"]
          titulo: string
          unidade_id?: string | null
          updated_at?: string
          valor_total?: number
          vendedor_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          data_entrada_estagio?: string
          data_fechamento?: string | null
          data_previsao_fechamento?: string | null
          estagio?: Database["public"]["Enums"]["deal_stage"]
          id?: string
          linha_id?: string
          medico_id?: string | null
          motivo_perda?: string | null
          motivo_perda_id?: string | null
          observacoes?: string | null
          resultado?: Database["public"]["Enums"]["deal_resultado"]
          titulo?: string
          unidade_id?: string | null
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
            foreignKeyName: "deals_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_motivo_perda_id_fkey"
            columns: ["motivo_perda_id"]
            isOneToOne: false
            referencedRelation: "motivos_perda"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades_saude"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_vendedor_profile_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deals_manutencao: {
        Row: {
          archived_at: string | null
          created_at: string
          data_entrada_estagio: string
          data_fechamento: string | null
          data_previsao_fechamento: string | null
          estagio: Database["public"]["Enums"]["deal_stage"]
          garantia_origem_id: string | null
          id: string
          linha_id: string
          motivo_perda: string | null
          motivo_perda_id: string | null
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
          data_previsao_fechamento?: string | null
          estagio?: Database["public"]["Enums"]["deal_stage"]
          garantia_origem_id?: string | null
          id?: string
          linha_id: string
          motivo_perda?: string | null
          motivo_perda_id?: string | null
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
          data_previsao_fechamento?: string | null
          estagio?: Database["public"]["Enums"]["deal_stage"]
          garantia_origem_id?: string | null
          id?: string
          linha_id?: string
          motivo_perda?: string | null
          motivo_perda_id?: string | null
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
            foreignKeyName: "deals_manutencao_vendedor_profile_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      discovery: {
        Row: {
          archived_at: string | null
          cidade: string | null
          cnpj: string | null
          created_at: string
          created_by: string | null
          email: string | null
          endereco: string | null
          estado_id: string | null
          id: string
          informacoes_adicionais: string | null
          nome: string
          pasta_id: string | null
          porte: string | null
          site: string | null
          status: Database["public"]["Enums"]["discovery_status"]
          telefone: string | null
          tipo_id: string | null
          unidade_gerada_id: string | null
          updated_at: string
          vendedor_id: string
        }
        Insert: {
          archived_at?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          endereco?: string | null
          estado_id?: string | null
          id?: string
          informacoes_adicionais?: string | null
          nome: string
          pasta_id?: string | null
          porte?: string | null
          site?: string | null
          status?: Database["public"]["Enums"]["discovery_status"]
          telefone?: string | null
          tipo_id?: string | null
          unidade_gerada_id?: string | null
          updated_at?: string
          vendedor_id: string
        }
        Update: {
          archived_at?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          endereco?: string | null
          estado_id?: string | null
          id?: string
          informacoes_adicionais?: string | null
          nome?: string
          pasta_id?: string | null
          porte?: string | null
          site?: string | null
          status?: Database["public"]["Enums"]["discovery_status"]
          telefone?: string | null
          tipo_id?: string | null
          unidade_gerada_id?: string | null
          updated_at?: string
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discovery_estado_id_fkey"
            columns: ["estado_id"]
            isOneToOne: false
            referencedRelation: "estados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discovery_tipo_id_fkey"
            columns: ["tipo_id"]
            isOneToOne: false
            referencedRelation: "tipos_unidade"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discovery_unidade_gerada_id_fkey"
            columns: ["unidade_gerada_id"]
            isOneToOne: false
            referencedRelation: "unidades_saude"
            referencedColumns: ["id"]
          },
        ]
      }
      discovery_pastas: {
        Row: {
          archived_at: string | null
          cor: string | null
          created_at: string
          created_by: string | null
          id: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          cor?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          cor?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
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
      especialidades_medicas: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      estados: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          nome: string
          sigla: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          nome: string
          sigla: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          nome?: string
          sigla?: string
          updated_at?: string
        }
        Relationships: []
      }
      faturamento: {
        Row: {
          archived_at: string | null
          created_at: string
          data_faturamento: string
          deal_id: string
          id: string
          numero_nf: string
          observacoes: string | null
          registrado_por: string | null
          updated_at: string
          valor_faturado: number
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          data_faturamento: string
          deal_id: string
          id?: string
          numero_nf: string
          observacoes?: string | null
          registrado_por?: string | null
          updated_at?: string
          valor_faturado?: number
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          data_faturamento?: string
          deal_id?: string
          id?: string
          numero_nf?: string
          observacoes?: string | null
          registrado_por?: string | null
          updated_at?: string
          valor_faturado?: number
        }
        Relationships: [
          {
            foreignKeyName: "faturamento_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      garantias: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          data_fim: string
          data_inicio: string
          deal_origem_id: string | null
          descricao_equipamento: string
          id: string
          linha_id: string | null
          observacoes: string | null
          status: Database["public"]["Enums"]["garantia_status"]
          unidade_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          data_fim: string
          data_inicio: string
          deal_origem_id?: string | null
          descricao_equipamento: string
          id?: string
          linha_id?: string | null
          observacoes?: string | null
          status?: Database["public"]["Enums"]["garantia_status"]
          unidade_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          data_fim?: string
          data_inicio?: string
          deal_origem_id?: string | null
          descricao_equipamento?: string
          id?: string
          linha_id?: string | null
          observacoes?: string | null
          status?: Database["public"]["Enums"]["garantia_status"]
          unidade_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      instalacoes: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          data_conclusao: string | null
          data_prevista: string | null
          deal_id: string | null
          id: string
          observacoes: string | null
          pdf_url: string | null
          status: Database["public"]["Enums"]["instalacao_status"]
          tecnico_id: string | null
          tipo: Database["public"]["Enums"]["instalacao_tipo"]
          unidade_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          data_conclusao?: string | null
          data_prevista?: string | null
          deal_id?: string | null
          id?: string
          observacoes?: string | null
          pdf_url?: string | null
          status?: Database["public"]["Enums"]["instalacao_status"]
          tecnico_id?: string | null
          tipo?: Database["public"]["Enums"]["instalacao_tipo"]
          unidade_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          data_conclusao?: string | null
          data_prevista?: string | null
          deal_id?: string | null
          id?: string
          observacoes?: string | null
          pdf_url?: string | null
          status?: Database["public"]["Enums"]["instalacao_status"]
          tecnico_id?: string | null
          tipo?: Database["public"]["Enums"]["instalacao_tipo"]
          unidade_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "instalacoes_tecnico_profile_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_config: {
        Row: {
          chamadas_mes_atual: number
          id: string
          limite_mensal: number
          mes_referencia: string
          updated_at: string
        }
        Insert: {
          chamadas_mes_atual?: number
          id?: string
          limite_mensal?: number
          mes_referencia?: string
          updated_at?: string
        }
        Update: {
          chamadas_mes_atual?: number
          id?: string
          limite_mensal?: number
          mes_referencia?: string
          updated_at?: string
        }
        Relationships: []
      }
      lab_eliminados: {
        Row: {
          cnpj: string
          created_at: string
          eliminado_em: string
          eliminado_por: string | null
          id: string
          motivo: string | null
          razao_social: string | null
        }
        Insert: {
          cnpj: string
          created_at?: string
          eliminado_em?: string
          eliminado_por?: string | null
          id?: string
          motivo?: string | null
          razao_social?: string | null
        }
        Update: {
          cnpj?: string
          created_at?: string
          eliminado_em?: string
          eliminado_por?: string | null
          id?: string
          motivo?: string | null
          razao_social?: string | null
        }
        Relationships: []
      }
      lab_pendentes: {
        Row: {
          atualizado_em: string
          capital_social: number | null
          cidade: string | null
          cnae_codigo: string | null
          cnae_descricao: string | null
          cnpj: string
          data_abertura: string | null
          email: string | null
          endereco: string | null
          id: string
          nome_fantasia: string | null
          pesquisado_em: string
          pesquisado_por: string | null
          porte: string | null
          rating: number | null
          razao_social: string | null
          reviews: number | null
          score: number
          site: string | null
          socios: Json
          telefone: string | null
          uf: string | null
        }
        Insert: {
          atualizado_em?: string
          capital_social?: number | null
          cidade?: string | null
          cnae_codigo?: string | null
          cnae_descricao?: string | null
          cnpj: string
          data_abertura?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome_fantasia?: string | null
          pesquisado_em?: string
          pesquisado_por?: string | null
          porte?: string | null
          rating?: number | null
          razao_social?: string | null
          reviews?: number | null
          score?: number
          site?: string | null
          socios?: Json
          telefone?: string | null
          uf?: string | null
        }
        Update: {
          atualizado_em?: string
          capital_social?: number | null
          cidade?: string | null
          cnae_codigo?: string | null
          cnae_descricao?: string | null
          cnpj?: string
          data_abertura?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome_fantasia?: string | null
          pesquisado_em?: string
          pesquisado_por?: string | null
          porte?: string | null
          rating?: number | null
          razao_social?: string | null
          reviews?: number | null
          score?: number
          site?: string | null
          socios?: Json
          telefone?: string | null
          uf?: string | null
        }
        Relationships: []
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
      marcas_equipamento: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      medico_discovery: {
        Row: {
          created_at: string
          discovery_id: string
          id: string
          medico_id: string
          papel_id: string | null
        }
        Insert: {
          created_at?: string
          discovery_id: string
          id?: string
          medico_id: string
          papel_id?: string | null
        }
        Update: {
          created_at?: string
          discovery_id?: string
          id?: string
          medico_id?: string
          papel_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medico_discovery_discovery_id_fkey"
            columns: ["discovery_id"]
            isOneToOne: false
            referencedRelation: "discovery"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medico_discovery_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medico_discovery_papel_id_fkey"
            columns: ["papel_id"]
            isOneToOne: false
            referencedRelation: "papeis_contato"
            referencedColumns: ["id"]
          },
        ]
      }
      medico_unidades: {
        Row: {
          created_at: string
          id: string
          medico_id: string
          papel: string | null
          papel_id: string | null
          unidade_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          medico_id: string
          papel?: string | null
          papel_id?: string | null
          unidade_id: string
        }
        Update: {
          created_at?: string
          id?: string
          medico_id?: string
          papel?: string | null
          papel_id?: string | null
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
            foreignKeyName: "medico_unidades_papel_id_fkey"
            columns: ["papel_id"]
            isOneToOne: false
            referencedRelation: "papeis_contato"
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
          created_by: string | null
          crm: string | null
          email: string | null
          especialidade: string | null
          especialidade_id: string | null
          id: string
          nome: string
          observacoes: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          crm?: string | null
          email?: string | null
          especialidade?: string | null
          especialidade_id?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          crm?: string | null
          email?: string | null
          especialidade?: string | null
          especialidade_id?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medicos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medicos_especialidade_id_fkey"
            columns: ["especialidade_id"]
            isOneToOne: false
            referencedRelation: "especialidades_medicas"
            referencedColumns: ["id"]
          },
        ]
      }
      motivos_perda: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      nps: {
        Row: {
          archived_at: string | null
          comentarios: string | null
          created_at: string
          created_by: string | null
          data: string
          id: string
          nota: number
          unidade_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          comentarios?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          id?: string
          nota: number
          unidade_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          comentarios?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          id?: string
          nota?: number
          unidade_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      papeis_contato: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      parque_instalado: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          data_instalacao: string | null
          descricao: string | null
          discovery_id: string | null
          equipamento_id: string | null
          garantia_ate: string | null
          id: string
          linha_id: string | null
          numero_serie: string | null
          observacoes: string | null
          quantidade: number
          unidade_id: string | null
          updated_at: string
          valor: number | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          data_instalacao?: string | null
          descricao?: string | null
          discovery_id?: string | null
          equipamento_id?: string | null
          garantia_ate?: string | null
          id?: string
          linha_id?: string | null
          numero_serie?: string | null
          observacoes?: string | null
          quantidade?: number
          unidade_id?: string | null
          updated_at?: string
          valor?: number | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          data_instalacao?: string | null
          descricao?: string | null
          discovery_id?: string | null
          equipamento_id?: string | null
          garantia_ate?: string | null
          id?: string
          linha_id?: string | null
          numero_serie?: string | null
          observacoes?: string | null
          quantidade?: number
          unidade_id?: string | null
          updated_at?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "parque_instalado_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parque_instalado_discovery_id_fkey"
            columns: ["discovery_id"]
            isOneToOne: false
            referencedRelation: "discovery"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parque_instalado_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parque_instalado_linha_id_fkey"
            columns: ["linha_id"]
            isOneToOne: false
            referencedRelation: "linhas_produto"
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
      role_permissions: {
        Row: {
          allowed: boolean
          permission: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          allowed?: boolean
          permission: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          allowed?: boolean
          permission?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      stakeholders: {
        Row: {
          archived_at: string | null
          cargo: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          nome: string
          observacoes: string | null
          organizacao: string | null
          telefone: string | null
          tipo: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          cargo?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          organizacao?: string | null
          telefone?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          cargo?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          organizacao?: string | null
          telefone?: string | null
          tipo?: string | null
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
          discovery_id: string | null
          id: string
          medico_id: string | null
          prioridade: Database["public"]["Enums"]["tarefa_prioridade"]
          responsavel_id: string
          stakeholder_id: string | null
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
          discovery_id?: string | null
          id?: string
          medico_id?: string | null
          prioridade?: Database["public"]["Enums"]["tarefa_prioridade"]
          responsavel_id: string
          stakeholder_id?: string | null
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
          discovery_id?: string | null
          id?: string
          medico_id?: string | null
          prioridade?: Database["public"]["Enums"]["tarefa_prioridade"]
          responsavel_id?: string
          stakeholder_id?: string | null
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
            foreignKeyName: "tarefas_criador_profile_fkey"
            columns: ["criador_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            foreignKeyName: "tarefas_discovery_id_fkey"
            columns: ["discovery_id"]
            isOneToOne: false
            referencedRelation: "discovery"
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
            foreignKeyName: "tarefas_responsavel_profile_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      tipos_equipamento: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      tipos_unidade: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      unidades_saude: {
        Row: {
          archived_at: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          created_at: string
          created_by: string | null
          discovery_origem_id: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          estado_id: string | null
          id: string
          medico_principal_id: string | null
          nome: string
          observacoes: string | null
          porte: string | null
          site: string | null
          status: Database["public"]["Enums"]["unidade_status"]
          telefone: string | null
          tipo: Database["public"]["Enums"]["unidade_tipo"]
          tipo_id: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          discovery_origem_id?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          estado_id?: string | null
          id?: string
          medico_principal_id?: string | null
          nome: string
          observacoes?: string | null
          porte?: string | null
          site?: string | null
          status?: Database["public"]["Enums"]["unidade_status"]
          telefone?: string | null
          tipo?: Database["public"]["Enums"]["unidade_tipo"]
          tipo_id?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          discovery_origem_id?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          estado_id?: string | null
          id?: string
          medico_principal_id?: string | null
          nome?: string
          observacoes?: string | null
          porte?: string | null
          site?: string | null
          status?: Database["public"]["Enums"]["unidade_status"]
          telefone?: string | null
          tipo?: Database["public"]["Enums"]["unidade_tipo"]
          tipo_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unidades_saude_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unidades_saude_discovery_origem_id_fkey"
            columns: ["discovery_origem_id"]
            isOneToOne: false
            referencedRelation: "discovery"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unidades_saude_estado_id_fkey"
            columns: ["estado_id"]
            isOneToOne: false
            referencedRelation: "estados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unidades_saude_medico_principal_id_fkey"
            columns: ["medico_principal_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unidades_saude_tipo_id_fkey"
            columns: ["tipo_id"]
            isOneToOne: false
            referencedRelation: "tipos_unidade"
            referencedColumns: ["id"]
          },
        ]
      }
      user_linhas: {
        Row: {
          created_at: string
          id: string
          linha_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          linha_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          linha_id?: string
          user_id?: string
        }
        Relationships: []
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
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      has_permission: {
        Args: { _permission: string; _user_id: string }
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
      lab_increment_chamadas: {
        Args: { _n: number }
        Returns: {
          chamadas_mes_atual: number
          id: string
          limite_mensal: number
          mes_referencia: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "lab_config"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      marcar_tarefas_atrasadas: { Args: never; Returns: number }
    }
    Enums: {
      app_role:
        | "admin"
        | "gerente"
        | "vendedor"
        | "pos_venda"
        | "assistente_vendas"
      chamado_prioridade: "critica" | "alta" | "media" | "baixa"
      chamado_status: "aberto" | "em_atendimento" | "resolvido" | "fechado"
      contrato_status: "ativo" | "vencido" | "a_vencer"
      deal_resultado: "em_andamento" | "ganho" | "perdido"
      deal_stage:
        | "prospeccao"
        | "qualificacao"
        | "demonstracao"
        | "negociacao"
        | "decisao"
        | "fechamento"
        | "finalizado"
      discovery_status: "em_pesquisa" | "oficializado" | "descartado"
      garantia_status: "ativa" | "vencida" | "a_vencer"
      instalacao_status: "pendente" | "em_andamento" | "concluido"
      instalacao_tipo: "instalacao" | "aplicacao"
      tarefa_prioridade: "baixa" | "media" | "alta"
      tarefa_status:
        | "pendente"
        | "em_andamento"
        | "concluida"
        | "cancelada"
        | "atrasada"
      unidade_status: "lead" | "cliente" | "inativo"
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
      chamado_prioridade: ["critica", "alta", "media", "baixa"],
      chamado_status: ["aberto", "em_atendimento", "resolvido", "fechado"],
      contrato_status: ["ativo", "vencido", "a_vencer"],
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
      discovery_status: ["em_pesquisa", "oficializado", "descartado"],
      garantia_status: ["ativa", "vencida", "a_vencer"],
      instalacao_status: ["pendente", "em_andamento", "concluido"],
      instalacao_tipo: ["instalacao", "aplicacao"],
      tarefa_prioridade: ["baixa", "media", "alta"],
      tarefa_status: [
        "pendente",
        "em_andamento",
        "concluida",
        "cancelada",
        "atrasada",
      ],
      unidade_status: ["lead", "cliente", "inativo"],
      unidade_tipo: ["hospital", "clinica", "ubs", "laboratorio", "outro"],
    },
  },
} as const
