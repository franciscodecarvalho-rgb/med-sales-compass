// ============================================================
// Perguntas de Prospecção — fonte única de conteúdo.
// Para adicionar / remover / editar perguntas: mexa SÓ neste arquivo.
// As respostas ficam salvas por deal (tabela deal_prospeccao).
// ============================================================

export type PerguntaProspeccao = {
  id: string;       // estável — não mude depois que houver respostas salvas
  pergunta: string;
  ajuda?: string;   // dica curta abaixo do campo
};

export const PERGUNTAS_PROSPECCAO: PerguntaProspeccao[] = [
  {
    id: "perfil_unidade",
    pergunta: "Qual o perfil da unidade?",
    ajuda: "Tipo (hospital, clínica, UBS), especialidades atendidas, porte e região.",
  },
  {
    id: "decisor",
    pergunta: "Quem é o tomador de decisão?",
    ajuda: "Quem realmente aprova a compra — médico, gestor administrativo ou o próprio dono.",
  },
  {
    id: "parque_instalado",
    pergunta: "Qual o parque instalado hoje?",
    ajuda: "Equipamento atual, marca, há quanto tempo e nível de satisfação.",
  },
  {
    id: "primeiro_contato",
    pergunta: "Como foi o primeiro contato?",
    ajuda: "Canal (visita, ligação, indicação), receptividade e abertura do cliente.",
  },
  {
    id: "dor_principal",
    pergunta: "Qual a principal dor ou necessidade?",
    ajuda: "Que problema o cliente quer resolver? Equipamento antigo, imagem ruim, capacidade insuficiente?",
  },
  {
    id: "concorrencia",
    pergunta: "Há concorrentes envolvidos?",
    ajuda: "Outras marcas sendo avaliadas e o que estão oferecendo.",
  },
  {
    id: "proximo_passo",
    pergunta: "Qual o próximo passo combinado?",
    ajuda: "Ação concreta, com data e responsável.",
  },
];
