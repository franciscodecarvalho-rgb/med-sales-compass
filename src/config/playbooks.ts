// ============================================================
// PLAYBOOKS DE VENDA — fonte única de conteúdo
// Para editar textos / adicionar / remover itens: mexa SÓ neste arquivo.
// Nenhuma alteração de banco é necessária para mudar conteúdo.
//
// Itens marcados com  // REVISAR  são rascunho gerado automaticamente
// (etapa Demonstração e playbook Microtech) — ajuste os textos com calma.
// ============================================================

export type PlaybookItem = {
  id: string;        // único globalmente (ex: 'ult_pros_01')
  item: string;      // texto curto do checklist
  guidance: string;  // orientação detalhada
};

export type PlaybookEtapa = {
  label: string;
  items: PlaybookItem[];
};

export type EtapaKey = "prospeccao" | "qualificacao" | "demonstracao" | "negociacao" | "decisao";

export type PlaybookLinha = Record<EtapaKey, PlaybookEtapa>;

// Etapas que têm playbook, em ordem. (Fechamento/Finalizado ficam de fora.)
export const ETAPAS_PLAYBOOK: { key: EtapaKey; label: string }[] = [
  { key: "prospeccao",   label: "Prospecção" },
  { key: "qualificacao", label: "Qualificação" },
  { key: "demonstracao", label: "Demonstração" },
  { key: "negociacao",   label: "Negociação" },
  { key: "decisao",      label: "Decisão" },
];

// Metadados dos playbooks disponíveis (alimentam o seletor na aba do deal).
export const PLAYBOOKS_DISPONIVEIS: { key: string; label: string }[] = [
  { key: "ultrassom",  label: "Ultrassom" },
  { key: "endoscopia", label: "Endoscopia" },
  { key: "microtech",  label: "Microtech (acessórios endoscopia)" },
  { key: "generico",   label: "Genérico" },
];

export const playbooks: Record<string, PlaybookLinha> = {

  // ─────────────────────────────────────────────
  // ULTRASSOM
  // ─────────────────────────────────────────────
  ultrassom: {
    prospeccao: {
      label: "Prospecção",
      items: [
        { id: "ult_pros_01", item: "Pesquisei o perfil da unidade antes do contato",
          guidance: "Levante: tipo de unidade (hospital, clínica, UBS), especialidades atendidas, porte e região. Verifique se já existe histórico no CRM." },
        { id: "ult_pros_02", item: "Identifiquei o médico ou gestor tomador de decisão",
          guidance: "Em ultrassom, o decisor geralmente é radiologista, obstetra ou cardiologista. Em clínicas menores, pode ser o próprio dono. Não avance sem saber quem decide." },
        { id: "ult_pros_03", item: "Verifiquei o parque instalado da unidade",
          guidance: "Descubra: qual equipamento usam hoje, qual marca, há quanto tempo, se estão satisfeitos. Essa informação orienta o posicionamento da abordagem." },
        { id: "ult_pros_04", item: "Primeiro contato realizado",
          guidance: "Registre o canal (visita, ligação, indicação). Anote a reação inicial e o nível de abertura. Se houver resistência, registre o motivo." },
        { id: "ult_pros_05", item: "Dor ou necessidade principal identificada",
          guidance: "Qual problema o cliente está tentando resolver? Equipamento antigo, qualidade de imagem ruim, capacidade insuficiente, necessidade de laudo? Isso direciona a proposta de valor." },
      ],
    },
    qualificacao: {
      label: "Qualificação",
      items: [
        { id: "ult_qual_01", item: "Modelos de ultrassom a serem trabalhados definidos",
          guidance: "Quais equipamentos da linha fazem sentido para essa unidade? Registre no deal os modelos e transdutor(es) que serão apresentados." },
        { id: "ult_qual_02", item: "Budget ou verba disponível levantado",
          guidance: "Não precisa de número exato — mas entenda a faixa. É compra direta, financiamento, licitação? Tem previsão orçamentária? Isso define o caminho comercial." },
        { id: "ult_qual_03", item: "Tomador de decisão engajado na conversa",
          guidance: "O médico ou gestor que decide está participando ativamente? Se você está falando só com assistentes ou compradores sem poder de decisão, o deal pode travar. Escale o contato." },
        { id: "ult_qual_04", item: "Prazo estimado para decisão levantado",
          guidance: "Pergunte: quando pretendem tomar a decisão? Há uma data-limite (fim de exercício orçamentário, abertura de nova ala)? Isso determina a urgência do follow-up." },
        { id: "ult_qual_05", item: "Concorrentes mapeados",
          guidance: "Já está em negociação com outra marca? Qual? O que estão oferecendo? Saber os concorrentes permite preparar o contra-argumento certo." },
        { id: "ult_qual_06", item: "Demonstração agendada",
          guidance: "Para ultrassom, a demo é quase sempre decisiva. O médico precisa tocar no equipamento. Agende com o caso de uso real do cliente (obstétrico, vascular, musculoesquelético)." },
      ],
    },
    demonstracao: {
      label: "Demonstração",
      items: [
        // REVISAR — rascunho da etapa Demonstração
        { id: "ult_demo_01", item: "Demo agendada com o decisor presente",
          guidance: "REVISAR. De nada adianta demonstrar para quem não decide. Confirme que o radiologista/obstetra/cardiologista que aprova a compra estará na demonstração." },
        { id: "ult_demo_02", item: "Caso de uso real do cliente preparado",
          guidance: "REVISAR. Leve transdutores e presets para o tipo de exame que a unidade mais faz. O médico precisa ver a imagem no contexto dele, não num fantasma genérico." },
        { id: "ult_demo_03", item: "Diferenciais de imagem demonstrados na prática",
          guidance: "REVISAR. Qualidade de imagem, profundidade, recursos de Doppler — mostre o que separa o equipamento da concorrência, ao vivo, não em folheto." },
        { id: "ult_demo_04", item: "Equipe técnica/enfermagem envolvida na demo",
          guidance: "REVISAR. Quem opera no dia a dia influencia a decisão. Deixe a equipe tocar no aparelho e tirar dúvidas de usabilidade." },
        { id: "ult_demo_05", item: "Reação e objeções da demo registradas",
          guidance: "REVISAR. Anote o que agradou e o que gerou dúvida. Objeções que surgem na demo são as que vão decidir a venda — leve-as para a negociação preparado." },
      ],
    },
    negociacao: {
      label: "Negociação",
      items: [
        { id: "ult_neg_01", item: "Proposta formal enviada",
          guidance: "A proposta deve estar clara: modelos, transdutores inclusos, garantia, prazo de entrega e condições de pagamento. Confirme que o cliente recebeu e leu." },
        { id: "ult_neg_02", item: "Objeções levantadas e respondidas",
          guidance: "Anote cada objeção (preço, marca, comparação com concorrente). Para cada uma, registre sua resposta. Objeção sem resposta registrada é risco." },
        { id: "ult_neg_03", item: "Condições comerciais discutidas",
          guidance: "Entrada, parcelamento, desconto possível, prazo de entrega, treinamento incluso? Alinhe o que pode e o que não pode ser flexibilizado antes de qualquer compromisso verbal." },
        { id: "ult_neg_04", item: "Comparativo com concorrente apresentado se necessário",
          guidance: "Se o cliente trouxe proposta de outro fornecedor, faça um comparativo objetivo: imagem, suporte, garantia, assistência local. Não ataque a concorrência — destaque seus diferenciais." },
        { id: "ult_neg_05", item: "Próximo passo combinado e agendado",
          guidance: "Nunca saia de uma negociação sem um próximo passo concreto. Data, canal e pauta definidos. Cliente evasivo sobre o próximo passo é sinal de alerta." },
      ],
    },
    decisao: {
      label: "Decisão",
      items: [
        { id: "ult_dec_01", item: "Proposta final fechada e confirmada",
          guidance: "Todas as condições estão definidas e não há ajustes pendentes? O cliente tem em mãos a versão final que irá assinar ou aprovar." },
        { id: "ult_dec_02", item: "Todas as objeções foram endereçadas",
          guidance: "Revise seu histórico de objeções. Alguma ficou sem resposta satisfatória? Garanta que não há dúvida técnica, comercial ou de suporte em aberto." },
        { id: "ult_dec_03", item: "Contato direto com o decisor confirmado",
          guidance: "A decisão não pode depender de intermediário. Certifique-se de que tem acesso direto ao médico ou gestor que vai dar o 'sim'." },
        { id: "ult_dec_04", item: "Prazo de resposta combinado",
          guidance: "Pergunte com naturalidade: 'Até quando vocês conseguem dar um retorno?' Isso cria compromisso sem pressão. Passou do prazo, é gatilho legítimo para follow-up." },
        { id: "ult_dec_05", item: "Plano de ação para silêncio definido",
          guidance: "Se o cliente sumir, qual o próximo movimento? Ligue em X dias, mande e-mail, visite. Tenha protocolo para não deixar o deal morrer por inação." },
      ],
    },
  },

  // ─────────────────────────────────────────────
  // ENDOSCOPIA
  // ─────────────────────────────────────────────
  endoscopia: {
    prospeccao: {
      label: "Prospecção",
      items: [
        { id: "end_pros_01", item: "Pesquisei o perfil da unidade antes do contato",
          guidance: "Endoscopia exige estrutura específica: sala de endo, equipe treinada, esterilização. Verifique se a unidade já realiza procedimentos ou está montando o serviço." },
        { id: "end_pros_02", item: "Identifiquei o endoscopista ou diretor clínico responsável",
          guidance: "Em endoscopia, o decisor técnico quase sempre é o médico endoscopista. Gestores administrativos participam, mas a aprovação técnica vem do médico." },
        { id: "end_pros_03", item: "Verifiquei o parque instalado atual",
          guidance: "Qual torre usam hoje? Marca, modelo, idade. A vida útil de uma torre é relevante — equipamento velho é argumento de abertura." },
        { id: "end_pros_04", item: "Primeiro contato realizado",
          guidance: "Registre canal, receptividade e interlocutor. Em endoscopia, a equipe de enfermagem muitas vezes é a porta de entrada — use bem esse canal." },
        { id: "end_pros_05", item: "Dor ou necessidade principal identificada",
          guidance: "Problemas frequentes: equipamento com falha recorrente, imagem insatisfatória, custo alto de manutenção, necessidade de aumentar capacidade." },
      ],
    },
    qualificacao: {
      label: "Qualificação",
      items: [
        { id: "end_qual_01", item: "Configuração da torre a ser trabalhada definida",
          guidance: "Quais componentes fazem sentido? Processador de vídeo, videoendoscópios (gastro, colono, duodeno?), fonte de luz, monitor. Registre no deal." },
        { id: "end_qual_02", item: "Volume de procedimentos da unidade estimado",
          guidance: "Quantos procedimentos por mês/semana? Isso define a robustez do equipamento e impacta o argumento de custo por procedimento." },
        { id: "end_qual_03", item: "Budget ou verba disponível levantado",
          guidance: "Torre é investimento alto. Entenda: compra direta, financiamento, leasing ou licitação? Verba aprovada ou em aprovação?" },
        { id: "end_qual_04", item: "Tomador de decisão técnico e administrativo engajados",
          guidance: "Há dois decisores: o médico (aprova tecnicamente) e o gestor/financeiro (aprova o custo). Ambos engajados. Descubra se há conflito entre eles." },
        { id: "end_qual_05", item: "Concorrentes mapeados",
          guidance: "Quais marcas estão sendo avaliadas? Olympus e Fujifilm são os principais. Conheça os argumentos de cada um para preparar o diferencial." },
        { id: "end_qual_06", item: "Demonstração ou visita técnica agendada",
          guidance: "A demo de endoscopia exige logística maior. Se possível, traga o endoscopista para ver o equipamento funcionando com casos similares ao perfil da unidade." },
      ],
    },
    demonstracao: {
      label: "Demonstração",
      items: [
        // REVISAR — rascunho da etapa Demonstração
        { id: "end_demo_01", item: "Demo/visita técnica com o endoscopista presente",
          guidance: "REVISAR. A aprovação técnica vem do médico. Garanta que o endoscopista que vai operar esteja na demonstração, não só o setor de compras." },
        { id: "end_demo_02", item: "Torre montada com a configuração proposta",
          guidance: "REVISAR. Demonstre a torre completa como ela seria entregue — processador, endoscópios, monitor. Evite mostrar peças soltas sem contexto." },
        { id: "end_demo_03", item: "Qualidade de imagem e manuseio demonstrados",
          guidance: "REVISAR. Mostre nitidez, resposta de cor e ergonomia do endoscópio. São os pontos onde a marca compete diretamente com Olympus/Fujifilm." },
        { id: "end_demo_04", item: "Equipe de enfermagem envolvida (limpeza/manuseio)",
          guidance: "REVISAR. Em endoscopia, a enfermagem cuida da limpeza e reprocessamento. Mostrar facilidade de manuseio para a equipe é diferencial de venda." },
        { id: "end_demo_05", item: "Reação e objeções da demo registradas",
          guidance: "REVISAR. Anote o que convenceu e o que gerou dúvida técnica. Leve as objeções para a negociação já com resposta preparada." },
      ],
    },
    negociacao: {
      label: "Negociação",
      items: [
        { id: "end_neg_01", item: "Proposta formal com configuração completa enviada",
          guidance: "Liste cada componente da torre, quantidade de videoendoscópios, acessórios, treinamento, garantia e condições. Ambiguidade aqui cria problema pós-venda." },
        { id: "end_neg_02", item: "Treinamento da equipe incluído e detalhado",
          guidance: "O treinamento da enfermagem no manuseio e limpeza é diferencial crítico. Garanta que está na proposta e que o cliente entende o valor disso." },
        { id: "end_neg_03", item: "Suporte técnico pós-venda apresentado",
          guidance: "Tempo de resposta em falha, cobertura geográfica, disponibilidade de peças. Equipamento parado = procedimentos cancelados. Suporte é argumento de fechamento." },
        { id: "end_neg_04", item: "Objeções levantadas e respondidas",
          guidance: "Objeções comuns: preço vs. Olympus, reconhecimento da marca, assistência local. Registre cada uma com sua resposta para não repetir o ciclo." },
        { id: "end_neg_05", item: "Próximo passo combinado e agendado",
          guidance: "Defina o próximo contato: reunião, visita técnica, apresentação ao conselho? Tenha data e pauta. Sem próximo passo, o deal paralisa." },
      ],
    },
    decisao: {
      label: "Decisão",
      items: [
        { id: "end_dec_01", item: "Proposta final fechada sem pendências",
          guidance: "Todas as condições comerciais e técnicas definidas e aceitas verbalmente? Não deve haver itens 'a combinar' na proposta final." },
        { id: "end_dec_02", item: "Aprovação técnica do endoscopista confirmada",
          guidance: "O médico deu o aval técnico? Sem isso, mesmo que o gestor queira fechar, a compra pode ser barrada. Confirme explicitamente." },
        { id: "end_dec_03", item: "Aprovação financeira/administrativa confirmada",
          guidance: "O gestor/financeiro aprovou? Se a verba depende de aprovação superior, entenda o processo, o prazo e quem mais precisa ser convencido." },
        { id: "end_dec_04", item: "Prazo de resposta combinado",
          guidance: "Estabeleça uma data de retorno. 'Quando conseguem dar um retorno?' basta. Passou sem resposta, é gatilho para follow-up direto." },
        { id: "end_dec_05", item: "Plano de ação para silêncio definido",
          guidance: "Se sumirem, qual o próximo movimento e em quantos dias? Em endoscopia decisões demoram mais, mas silêncio prolongado precisa de ação ativa." },
      ],
    },
  },

  // ─────────────────────────────────────────────
  // MICROTECH (acessórios de endoscopia) — RASCUNHO INTEIRO, REVISAR
  // ─────────────────────────────────────────────
  microtech: {
    prospeccao: {
      label: "Prospecção",
      items: [
        // REVISAR — playbook Microtech inteiro é rascunho
        { id: "mic_pros_01", item: "Identifiquei se a unidade já faz procedimentos de endoscopia",
          guidance: "REVISAR. Acessório de endoscopia só vende para quem já opera uma torre. Confirme que há serviço ativo antes de prospectar consumível/acessório." },
        { id: "mic_pros_02", item: "Mapeei a torre/marca de endoscopia que a unidade usa",
          guidance: "REVISAR. A compatibilidade do acessório depende da torre instalada. Saber a marca e o modelo evita oferecer algo que não encaixa." },
        { id: "mic_pros_03", item: "Identifiquei quem decide a compra de acessórios/consumíveis",
          guidance: "REVISAR. Costuma ser o endoscopista ou a enfermagem-chefe da endoscopia — diferente do decisor da torre. Confirme quem aprova recompra." },
        { id: "mic_pros_04", item: "Levantei o consumo/frequência de uso atual",
          guidance: "REVISAR. Acessório tem dinâmica de recompra. Entenda volume de procedimentos e o ritmo de reposição para dimensionar a oferta." },
        { id: "mic_pros_05", item: "Primeiro contato realizado e dor identificada",
          guidance: "REVISAR. Dores comuns: ruptura/custo do acessório atual, prazo de entrega do fornecedor, compatibilidade. Registre a abertura do cliente." },
      ],
    },
    qualificacao: {
      label: "Qualificação",
      items: [
        { id: "mic_qual_01", item: "Acessórios/linha Microtech a trabalhar definidos",
          guidance: "REVISAR. Registre no deal quais itens da linha fazem sentido para a torre e o perfil de procedimentos da unidade." },
        { id: "mic_qual_02", item: "Compatibilidade com a torre instalada confirmada",
          guidance: "REVISAR. Verifique tecnicamente que o acessório encaixa na marca/modelo da torre do cliente. Incompatibilidade descoberta tarde queima a venda." },
        { id: "mic_qual_03", item: "Volume e frequência de recompra estimados",
          guidance: "REVISAR. Acessório é venda recorrente. Estime o consumo mensal para propor reposição programada e prever o ciclo no módulo de Recorrência." },
        { id: "mic_qual_04", item: "Decisor de recompra engajado",
          guidance: "REVISAR. Quem aprova a reposição está na conversa? Em consumível, o gargalo costuma ser o setor de compras — mapeie o fluxo." },
        { id: "mic_qual_05", item: "Concorrentes/fornecedor atual mapeados",
          guidance: "REVISAR. De quem compram hoje? Preço, prazo, qualidade. Saber o fornecedor atual permite posicionar o diferencial Microtech." },
      ],
    },
    demonstracao: {
      label: "Demonstração",
      items: [
        { id: "mic_demo_01", item: "Amostra do acessório apresentada/testada",
          guidance: "REVISAR. Sempre que possível, deixe o endoscopista testar o acessório num procedimento ou simulação. Tato e encaixe vendem consumível." },
        { id: "mic_demo_02", item: "Compatibilidade demonstrada na torre do cliente",
          guidance: "REVISAR. Mostre o acessório encaixando na torre real da unidade — prova concreta de compatibilidade vale mais que ficha técnica." },
        { id: "mic_demo_03", item: "Diferenciais de qualidade/durabilidade evidenciados",
          guidance: "REVISAR. Destaque o que reduz custo por procedimento: durabilidade, desempenho, menos falha. É o argumento central em acessório." },
        { id: "mic_demo_04", item: "Equipe de enfermagem envolvida no teste",
          guidance: "REVISAR. Quem manuseia no dia a dia valida o acessório. O aval da enfermagem acelera a aprovação de recompra." },
        { id: "mic_demo_05", item: "Reação e objeções registradas",
          guidance: "REVISAR. Anote o que agradou e a principal objeção (preço, troca de fornecedor, hábito). Leve preparado para a negociação." },
      ],
    },
    negociacao: {
      label: "Negociação",
      items: [
        { id: "mic_neg_01", item: "Proposta com itens, quantidades e recorrência enviada",
          guidance: "REVISAR. Deixe claro o pacote: itens, quantidade por ciclo, preço unitário e condição de reposição programada, se houver." },
        { id: "mic_neg_02", item: "Condição de reposição programada discutida",
          guidance: "REVISAR. Acessório vive de recompra. Proponha um ciclo de reposição — facilita a vida do cliente e fideliza o consumo." },
        { id: "mic_neg_03", item: "Objeções levantadas e respondidas",
          guidance: "REVISAR. Objeções comuns: trocar de fornecedor dá trabalho, preço vs. atual, prazo de entrega. Registre cada resposta." },
        { id: "mic_neg_04", item: "Prazo de entrega e logística alinhados",
          guidance: "REVISAR. Em consumível, prazo de entrega confiável é decisivo — falta de acessório para procedimento. Confirme o que você consegue cumprir." },
        { id: "mic_neg_05", item: "Próximo passo combinado e agendado",
          guidance: "REVISAR. Defina data e pauta do próximo contato. Sem próximo passo, a primeira compra não acontece." },
      ],
    },
    decisao: {
      label: "Decisão",
      items: [
        { id: "mic_dec_01", item: "Primeira compra/pedido fechado",
          guidance: "REVISAR. Confirme o primeiro pedido com itens e quantidades. É a porta de entrada para a recorrência." },
        { id: "mic_dec_02", item: "Aval técnico do endoscopista/enfermagem confirmado",
          guidance: "REVISAR. Quem usa aprovou o acessório? Sem o aval de quem manuseia, a recompra não se sustenta." },
        { id: "mic_dec_03", item: "Ciclo de recompra acordado",
          guidance: "REVISAR. Combine a frequência de reposição e registre no módulo de Recorrência para o radar monitorar o cliente." },
        { id: "mic_dec_04", item: "Prazo de resposta combinado",
          guidance: "REVISAR. Estabeleça quando o cliente dá o retorno do primeiro pedido. Cria compromisso e gatilho de follow-up." },
        { id: "mic_dec_05", item: "Plano de ação para silêncio definido",
          guidance: "REVISAR. Se o cliente não fechar a primeira compra, qual o próximo movimento e em quantos dias? Tenha protocolo." },
      ],
    },
  },

  // ─────────────────────────────────────────────
  // GENÉRICO (fallback)
  // ─────────────────────────────────────────────
  generico: {
    prospeccao: {
      label: "Prospecção",
      items: [
        { id: "gen_pros_01", item: "Pesquisei o perfil da unidade antes do contato",
          guidance: "Levante informações básicas: tipo, especialidades, porte, região e histórico no CRM." },
        { id: "gen_pros_02", item: "Identifiquei o tomador de decisão",
          guidance: "Descubra quem decide a compra — médico, gestor administrativo ou diretor clínico. Abordar a pessoa errada desperdiça tempo." },
        { id: "gen_pros_03", item: "Primeiro contato realizado e reação registrada",
          guidance: "Anote o canal usado, a receptividade e qualquer informação relevante sobre o momento da unidade." },
        { id: "gen_pros_04", item: "Dor ou necessidade principal identificada",
          guidance: "Qual problema o cliente quer resolver? Isso guia o posicionamento da solução." },
      ],
    },
    qualificacao: {
      label: "Qualificação",
      items: [
        { id: "gen_qual_01", item: "Produtos a serem trabalhados neste deal definidos",
          guidance: "Registre no deal quais equipamentos ou soluções serão apresentados. Deal sem produto definido não está qualificado." },
        { id: "gen_qual_02", item: "Budget ou verba disponível levantado",
          guidance: "Entenda a faixa de investimento e a forma de compra (direta, financiamento, licitação). Isso define o caminho comercial." },
        { id: "gen_qual_03", item: "Tomador de decisão engajado",
          guidance: "O decisor está participando da conversa? Se você fala só com intermediários, o deal pode travar. Escale o contato." },
        { id: "gen_qual_04", item: "Prazo estimado para decisão levantado",
          guidance: "Quando o cliente pretende decidir? Há data-limite (orçamento, abertura de serviço, contrato vencendo)? Define a urgência do follow-up." },
      ],
    },
    demonstracao: {
      label: "Demonstração",
      items: [
        // REVISAR — rascunho da etapa Demonstração
        { id: "gen_demo_01", item: "Demonstração agendada com o decisor presente",
          guidance: "REVISAR. Demonstre para quem decide. Confirme a presença de quem aprova a compra." },
        { id: "gen_demo_02", item: "Equipamento apresentado no caso de uso do cliente",
          guidance: "REVISAR. Mostre o produto no contexto real da unidade, não numa demonstração genérica." },
        { id: "gen_demo_03", item: "Diferenciais demonstrados na prática",
          guidance: "REVISAR. Mostre ao vivo o que separa o produto da concorrência." },
        { id: "gen_demo_04", item: "Reação e objeções da demo registradas",
          guidance: "REVISAR. Anote o que agradou e o que gerou dúvida — são os pontos que vão decidir a venda." },
      ],
    },
    negociacao: {
      label: "Negociação",
      items: [
        { id: "gen_neg_01", item: "Proposta formal enviada",
          guidance: "Proposta clara com equipamentos, condições e prazos. Confirme que o cliente recebeu e leu." },
        { id: "gen_neg_02", item: "Objeções levantadas e respondidas",
          guidance: "Anote cada objeção e sua resposta. Objeção sem resposta registrada é risco para o fechamento." },
        { id: "gen_neg_03", item: "Condições comerciais discutidas",
          guidance: "Preço, prazo de entrega, garantia, treinamento. Alinhe o que pode e o que não pode ser flexibilizado." },
        { id: "gen_neg_04", item: "Próximo passo combinado e agendado",
          guidance: "Nunca saia de uma negociação sem um próximo passo com data e pauta definidos." },
      ],
    },
    decisao: {
      label: "Decisão",
      items: [
        { id: "gen_dec_01", item: "Proposta final fechada sem pendências",
          guidance: "Todas as condições definidas. Não deve haver nada 'a combinar' na versão final." },
        { id: "gen_dec_02", item: "Todas as objeções foram endereçadas",
          guidance: "Revise o histórico. Alguma dúvida técnica, comercial ou de suporte ficou em aberto? Resolva antes de esperar a decisão." },
        { id: "gen_dec_03", item: "Prazo de resposta combinado",
          guidance: "Estabeleça uma data de retorno. Cria compromisso sem pressão e dá gatilho legítimo para o follow-up." },
        { id: "gen_dec_04", item: "Plano de ação para silêncio definido",
          guidance: "Se o cliente sumir, qual o próximo movimento e em quantos dias? Tenha um protocolo definido." },
      ],
    },
  },
};

// Resolve a linha do deal para a chave de playbook padrão (default do seletor).
// O vendedor pode trocar manualmente depois.
export function resolvePlaybookKey(linhaNome?: string | null): string {
  const n = (linhaNome ?? "").toLowerCase().trim();
  if (n.includes("microtech")) return "microtech";
  if (n.includes("endoscopia") || n.includes("wolf")) return "endoscopia";
  if (n.includes("ultrassom")) return "ultrassom";
  return "generico";
}
